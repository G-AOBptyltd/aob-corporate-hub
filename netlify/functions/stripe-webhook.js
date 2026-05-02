/**
 * stripe-webhook.js — Netlify Function
 * Receives Stripe checkout.session.completed events,
 * generates a licence key, emails it to the customer via Resend,
 * and writes a licence record to the Notion Licences database.
 *
 * Required environment variables (set in Netlify dashboard → Site config → Env vars):
 *   STRIPE_SECRET_KEY        — sk_live_...
 *   STRIPE_WEBHOOK_SECRET    — whsec_...  (from Stripe webhook settings)
 *   RESEND_API_KEY           — re_...     (from resend.com dashboard)
 *   NOTION_API_KEY           — secret_... (from notion.com/my-integrations → Notion MCP integration)
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ── Key generation ────────────────────────────────────────────────────────────

/** djb2-style hash — MUST match the gate implementation exactly */
function computeHash(payload) {
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = ((h << 5) - h + payload.charCodeAt(i)) | 0;
  }
  const s = Math.abs(h).toString(16).toUpperCase();
  return s.padStart(4, '0').substring(0, 4);
}

/** Map Stripe product name → tool code */
const PRODUCT_MAP = {
  flowinsite:      'FLW',
  sprintinsite:    'SIS',
  forecastinsite:  'FCT',
  planinsite:      'PLN',
  portfolioinsite: 'POI',
};

function getToolCode(productName) {
  const normalised = (productName || '').toLowerCase().replace(/[^a-z]/g, '');
  for (const [key, code] of Object.entries(PRODUCT_MAP)) {
    if (normalised.includes(key)) return code;
  }
  return 'INS'; // fallback — full suite access
}

/** Derive a clean customer ID from their name or email */
function makeCustomerId(email, name) {
  const raw = name || email.split('@')[0] || 'CUSTOMER';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) || 'CUSTOMER';
}

/** Return expiry date as YYYYMMDD string */
function expiryDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function generateKey(toolCode, customerId, expiryYMD) {
  const hash = computeHash(`${toolCode}-${customerId}-${expiryYMD}`);
  return `${toolCode}-${customerId}-${expiryYMD}-${hash}`;
}

// ── Notion Licences DB ────────────────────────────────────────────────────────

/**
 * The Notion database that stores all issued licences.
 * Lives under AOB Website CMS → Licences
 * https://app.notion.com/p/76a27c5df2e0459c81a0b5910c943731
 */
const LICENCES_DB_ID = '76a27c5d-f2e0-459c-81a0-b5910c943731';

/**
 * Convert a YYYYMMDD string (used by the key generator) to YYYY-MM-DD (ISO, used by Notion).
 */
function ymdToISO(ymd) {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

/**
 * Create a new record in the Notion Licences database.
 *
 * Status is set to "Active" (customer has paid via Stripe checkout).
 * When Phase 2 adds invoice.paid / invoice.payment_failed / subscription.deleted
 * handlers, those events will update the Status field on the existing record.
 *
 * Errors here are non-fatal — the customer email always sends regardless.
 */
async function createLicenceRecord({
  key, email, name, toolName, isAnnual,
  stripeCustomerId, stripeSubscriptionId, expiryYMD,
}) {
  const today     = new Date().toISOString().slice(0, 10);
  const expiryISO = ymdToISO(expiryYMD);
  const title     = `${name || email} — ${toolName}`;

  const body = {
    parent: { database_id: LICENCES_DB_ID },
    properties: {
      // Title (required)
      Name: {
        title: [{ text: { content: title } }],
      },
      // Licence details
      'Licence Key': {
        rich_text: [{ text: { content: key } }],
      },
      'Status': {
        select: { name: 'Active' },
      },
      'Start Date': {
        date: { start: today },
      },
      'Expiry Date': {
        date: { start: expiryISO },
      },
      'Seats': {
        number: 1,
      },
      // Customer info
      'Customer Name': {
        rich_text: [{ text: { content: name || '' } }],
      },
      'Customer Email': {
        email: email,
      },
      // Stripe identifiers — used by Phase 2 subscription event handlers
      'Stripe Customer ID': {
        rich_text: [{ text: { content: stripeCustomerId || '' } }],
      },
      'Stripe Subscription ID': {
        rich_text: [{ text: { content: stripeSubscriptionId || '' } }],
      },
      // Notification tracking — ready for Resend expiry reminder workflows
      'Notification Sent': {
        checkbox: false,
      },
    },
  };

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${process.env.NOTION_API_KEY}`,
      'Content-Type':   'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Notion API error (${response.status}): ${err}`);
  }

  const page = await response.json();
  return page.id;
}

// ── Email ─────────────────────────────────────────────────────────────────────

async function sendKeyEmail({ to, name, key, toolName, expiryYMD, isAnnual }) {
  const firstName = (name || 'there').split(' ')[0];
  const expiryFormatted = `${expiryYMD.slice(6,8)}/${expiryYMD.slice(4,6)}/${expiryYMD.slice(0,4)}`;
  const planLabel = isAnnual ? 'Annual' : 'Monthly';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Agility Ops</span>
            <span style="color:#6366f1;font-size:22px;font-weight:700;"> InSite Suite</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">Hi ${firstName} 👋</p>
            <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
              Your <strong>${toolName}</strong> access is ready. Here's your licence key —
              copy it and enter it at the gate when you first open the tool.
            </p>

            <!-- Key box -->
            <div style="background:#f0f0ff;border:2px dashed #6366f1;border-radius:8px;padding:20px;text-align:center;margin:0 0 28px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#6366f1;letter-spacing:1px;text-transform:uppercase;">Your Access Code</p>
              <p style="margin:0;font-size:22px;font-weight:700;font-family:monospace;color:#1a1a2e;letter-spacing:2px;">${key}</p>
            </div>

            <!-- Details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;">Tool</td>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#111;text-align:right;">${toolName}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;">Plan</td>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;font-weight:600;color:#111;text-align:right;">${planLabel}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:13px;color:#888;">Key valid until</td>
                <td style="padding:10px 0;font-size:13px;font-weight:600;color:#111;text-align:right;">${expiryFormatted}</td>
              </tr>
            </table>

            <!-- CTA -->
            <p style="margin:0 0 16px;font-size:14px;color:#555;">
              Head to your tool, enter the code at the gate, and you're in. Keys are saved in your browser
              so you won't need to enter it again on the same device.
            </p>
            <p style="margin:0 0 32px;font-size:13px;color:#888;">
              Need help? Reply to this email or contact
              <a href="mailto:support@agilityops.com.au" style="color:#6366f1;">support@agilityops.com.au</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9fb;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;font-size:11px;color:#aaa;">
              Agility Ops Business Pty Ltd ·
              <a href="https://agilityops.com.au" style="color:#aaa;">agilityops.com.au</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Agility Ops InSite <support@agilityops.com.au>',
      to: [to],
      subject: `Your ${toolName} access code is ready`,
      html,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend error: ${err}`);
  }
  return true;
}

// ── Handler ───────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // 1. Verify Stripe signature
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook error: ${err.message}` };
  }

  // 2. Only process completed checkouts
  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: 'Event ignored' };
  }

  const session = stripeEvent.data.object;

  try {
    // 3. Fetch line items with product info expanded
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product'],
      limit: 1,
    });

    const item     = lineItems.data[0];
    const price    = item?.price;
    const product  = price?.product;
    const isAnnual = price?.recurring?.interval === 'year';

    // 4. Derive key components
    const toolCode   = getToolCode(product?.name || '');
    const toolName   = product?.name || 'InSite Tool';
    const email      = session.customer_details?.email;
    const name       = session.customer_details?.name;
    const customerId = makeCustomerId(email, name);

    // Expiry: annual → 370 days, monthly → 35 days (covers billing cycle + buffer)
    const expiryYMD  = expiryDate(isAnnual ? 370 : 35);

    // 5. Generate key
    const key = generateKey(toolCode, customerId, expiryYMD);

    console.log(`Key generated: ${key} for ${email} (${toolName})`);

    // 6. Write licence record to Notion (non-fatal — email always sends regardless)
    try {
      const pageId = await createLicenceRecord({
        key,
        email,
        name,
        toolName,
        isAnnual,
        stripeCustomerId:     session.customer       || '',
        stripeSubscriptionId: session.subscription   || '',
        expiryYMD,
      });
      console.log(`Notion licence record created: ${pageId}`);
    } catch (notionErr) {
      // Log but don't fail — customer must always receive their key
      console.error('Notion write failed (non-fatal):', notionErr.message);
    }

    // 7. Send email
    await sendKeyEmail({ to: email, name, key, toolName, expiryYMD, isAnnual });

    console.log(`Key email sent to ${email}`);
    return { statusCode: 200, body: 'OK' };

  } catch (err) {
    console.error('Error processing webhook:', err);
    return { statusCode: 500, body: `Internal error: ${err.message}` };
  }
};
