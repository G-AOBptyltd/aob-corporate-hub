/**
 * stripe-webhook.js — Netlify Function (v2)
 * Receives Stripe webhook events, generates licence keys,
 * emails them to customers via Resend, and tracks in Notion.
 *
 * v2 changes:
 *   - Resilient product name matching (handles spaces, tiers, partial names)
 *   - Bundle purchases → 5 separate emails, one per tool, 5 Notion records
 *   - Email includes direct tool link (CTA) + secondary product page link
 *   - Cancellation handles bundle (marks all matching records as Cancelled)
 *
 * Required environment variables (set in Netlify dashboard → Site config → Env vars):
 *   STRIPE_SECRET_KEY        — sk_live_...
 *   STRIPE_WEBHOOK_SECRET    — whsec_...  (from Stripe webhook settings)
 *   RESEND_API_KEY           — re_...     (from resend.com dashboard)
 *   NOTION_API_KEY           — secret_... (from notion.com/my-integrations)
 */

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// ── Product registry ─────────────────────────────────────────────────────────

const ALL_TOOLS = [
  {
    code: 'FCT',
    name: 'ForecastInSite',
    keywords: ['forecast', 'forecastinsite'],
    toolUrl: 'https://portfolioinsite.com.au/tools/forecastinsite',
    productUrl: 'https://portfolioinsite.com.au/forecastinsite/overview',
  },
  {
    code: 'SIS',
    name: 'SprintINSite',
    keywords: ['sprint', 'sprintinsite'],
    toolUrl: 'https://sprintinsite.com/tools/sprintinsite',
    productUrl: 'https://sprintinsite.com',
  },
  {
    code: 'FLW',
    name: 'FlowInSite',
    keywords: ['flow', 'flowinsite'],
    toolUrl: 'https://sprintinsite.com/tools/flowinsite',
    productUrl: 'https://sprintinsite.com/product/flowinsite',
  },
  {
    code: 'PLN',
    name: 'PlanInSite',
    keywords: ['plan', 'planinsite'],
    toolUrl: 'https://portfolioinsite.com.au/tools/planinsite',
    productUrl: 'https://portfolioinsite.com.au/planinsite/overview',
  },
  {
    code: 'POI',
    name: 'PortfolioInSite',
    keywords: ['portfolio', 'portfolioinsite'],
    toolUrl: 'https://portfolioinsite.com.au/tools/portfolioinsite',
    productUrl: 'https://portfolioinsite.com.au',
  },
];

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

function generateKey(toolCode, customerId, expiryYMD) {
  const hash = computeHash(`${toolCode}-${customerId}-${expiryYMD}`);
  return `${toolCode}-${customerId}-${expiryYMD}-${hash}`;
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

// ── Product matching ─────────────────────────────────────────────────────────

/**
 * Resilient product name → tool matching.
 * Strips all non-alpha characters, lowercases, then checks keyword matches.
 * Handles: "ForecastInSite", "Forecast InSite", "ForecastInSite Starter Monthly",
 * "forecast-insite", "FORECASTINSITE", etc.
 *
 * Returns the matched tool object, or null if no match.
 */
function matchTool(productName) {
  const normalised = (productName || '').toLowerCase().replace(/[^a-z]/g, '');
  for (const tool of ALL_TOOLS) {
    for (const kw of tool.keywords) {
      if (normalised.includes(kw)) return tool;
    }
  }
  return null;
}

/**
 * Detect whether a Stripe product represents a bundle/suite purchase.
 * Checks for "bundle", "suite", or "all" in the product name.
 */
function isBundle(productName) {
  const normalised = (productName || '').toLowerCase();
  return normalised.includes('bundle') || normalised.includes('suite') || normalised.includes('all tools');
}

// ── Notion Licences DB ────────────────────────────────────────────────────────

const LICENCES_DB_ID = '76a27c5d-f2e0-459c-81a0-b5910c943731';

function ymdToISO(ymd) {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

async function createLicenceRecord({
  key, email, name, toolName, isAnnual,
  stripeCustomerId, stripeSubscriptionId, expiryYMD, seats,
}) {
  const today     = new Date().toISOString().slice(0, 10);
  const expiryISO = ymdToISO(expiryYMD);
  const title     = `${name || email} — ${toolName}`;

  const body = {
    parent: { database_id: LICENCES_DB_ID },
    properties: {
      Name: {
        title: [{ text: { content: title } }],
      },
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
        number: seats || 1,
      },
      'Customer Name': {
        rich_text: [{ text: { content: name || '' } }],
      },
      'Customer Email': {
        email: email,
      },
      'Stripe Customer ID': {
        rich_text: [{ text: { content: stripeCustomerId || '' } }],
      },
      'Stripe Subscription ID': {
        rich_text: [{ text: { content: stripeSubscriptionId || '' } }],
      },
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

// ── Notion — query & update helpers ──────────────────────────────────────────

/**
 * Find ALL Notion licence records matching a Stripe Subscription ID.
 * Returns an array of page IDs (bundle purchases create multiple records).
 */
async function findLicencesBySubscriptionId(subscriptionId) {
  const response = await fetch(`https://api.notion.com/v1/databases/${LICENCES_DB_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${process.env.NOTION_API_KEY}`,
      'Content-Type':   'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      filter: {
        property: 'Stripe Subscription ID',
        rich_text: { equals: subscriptionId },
      },
      page_size: 10,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Notion query error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.results.map(r => r.id);
}

async function updateLicenceStatus(pageId, status) {
  const today = new Date().toISOString().slice(0, 10);

  const properties = {
    Status: { select: { name: status } },
  };

  if (status === 'Cancelled') {
    properties['Cancelled Date'] = { date: { start: today } };
  }

  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization':  `Bearer ${process.env.NOTION_API_KEY}`,
      'Content-Type':   'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({ properties }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Notion update error (${response.status}): ${err}`);
  }

  return true;
}

// ── Email ─────────────────────────────────────────────────────────────────────

const PORTAL_URL = 'https://billing.stripe.com/p/login/fZuaEP10b4aC27rgdR5ZC00';

function buildEmailHtml({ firstName, toolName, key, planLabel, expiryFormatted, toolUrl, productUrl, bundleInfo }) {
  const bundleBanner = bundleInfo ? `
            <div style="background:#f0f0ff;border-radius:8px;padding:12px 16px;margin:0 0 20px;">
              <p style="margin:0;font-size:13px;color:#6366f1;font-weight:600;">&#128230; InSite Suite Bundle — email ${bundleInfo.index} of ${bundleInfo.total}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#888;">You'll receive a separate email for each tool in your bundle.</p>
            </div>` : '';

  const bundleChecklist = bundleInfo ? `
            <div style="background:#f8f9fa;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:0.5px;">Your full bundle</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
${bundleInfo.allTools.map((t, i) => {
  const isCurrent = t.code === bundleInfo.currentCode;
  return `                <tr>
                  <td style="padding:6px 0;color:${isCurrent ? '#111;font-weight:600' : '#888'};">${isCurrent ? '<span style="color:#10b981;">&#10003;</span> ' : ''}${t.name}</td>
                  <td style="padding:6px 0;color:#888;text-align:right;">${isCurrent ? 'This email' : 'Separate email'}</td>
                </tr>`;
}).join('\n')}
              </table>
            </div>` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Agility Ops</span>
            <span style="color:#6366f1;font-size:22px;font-weight:700;"> InSite Suite</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">Hi ${firstName} &#128075;</p>
${bundleBanner}
            <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
              Your <strong>${toolName}</strong> access is ready. Here's your licence key —
              copy it and follow the steps below to activate your tool.
            </p>
            <div style="background:#f0f0ff;border:2px dashed #6366f1;border-radius:8px;padding:20px;text-align:center;margin:0 0 28px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#6366f1;letter-spacing:1px;text-transform:uppercase;">Your ${toolName} Access Code</p>
              <p style="margin:0;font-size:22px;font-weight:700;font-family:monospace;color:#1a1a2e;letter-spacing:2px;">${key}</p>
            </div>
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
            <div style="background:#f8f9fa;border-radius:8px;padding:20px 24px;margin:0 0 24px;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:0.5px;">How to activate</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;vertical-align:top;width:28px;">
                    <span style="display:inline-block;width:20px;height:20px;background:#6366f1;border-radius:50%;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:20px;">1</span>
                  </td>
                  <td style="padding:6px 0;font-size:13px;color:#444;line-height:1.5;">
                    Click the button below to open <strong>${toolName}</strong> directly
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;vertical-align:top;width:28px;">
                    <span style="display:inline-block;width:20px;height:20px;background:#6366f1;border-radius:50%;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:20px;">2</span>
                  </td>
                  <td style="padding:6px 0;font-size:13px;color:#444;line-height:1.5;">
                    You'll see a licence gate — click <strong>Enter Licence Key</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;vertical-align:top;width:28px;">
                    <span style="display:inline-block;width:20px;height:20px;background:#6366f1;border-radius:50%;color:#fff;font-size:11px;font-weight:700;text-align:center;line-height:20px;">3</span>
                  </td>
                  <td style="padding:6px 0;font-size:13px;color:#444;line-height:1.5;">
                    Paste your access code above and click <strong>Activate</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;vertical-align:top;width:28px;">
                    <span style="display:inline-block;width:20px;height:20px;background:#10b981;border-radius:50%;color:#fff;font-size:12px;font-weight:700;text-align:center;line-height:20px;">&#10003;</span>
                  </td>
                  <td style="padding:6px 0;font-size:13px;color:#444;line-height:1.5;">
                    You're in! Your key is saved in your browser — no need to re-enter it on the same device.
                  </td>
                </tr>
              </table>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
              <tr>
                <td align="center">
                  <a href="${toolUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;">Open ${toolName} &rarr;</a>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td align="center">
                  <a href="${productUrl}" style="font-size:13px;color:#6366f1;text-decoration:none;">Learn more about ${toolName} &rarr;</a>
                </td>
              </tr>
            </table>
${bundleChecklist}
            <p style="margin:0 0 24px;font-size:13px;color:#888;">
              Need help? Reply to this email or contact
              <a href="mailto:support@agilityops.com.au" style="color:#6366f1;">support@agilityops.com.au</a>
            </p>
            <div style="border-top:1px solid #f0f0f0;padding-top:20px;">
              <p style="margin:0 0 10px;font-size:13px;color:#888;line-height:1.6;">
                Need to update your payment details, view invoices, or cancel? You can manage everything yourself:
              </p>
              <a href="${PORTAL_URL}" style="display:inline-block;background:#f4f5f7;color:#444;font-size:13px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:6px;border:1px solid #ddd;">Manage my subscription &rarr;</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9fb;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;font-size:11px;color:#aaa;">
              Agility Ops Business Pty Ltd &middot;
              <a href="https://agilityops.com.au" style="color:#aaa;">agilityops.com.au</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendKeyEmail({ to, name, toolName, key, toolUrl, productUrl, expiryYMD, isAnnual, bundleInfo }) {
  const firstName = (name || 'there').split(' ')[0];
  const expiryFormatted = `${expiryYMD.slice(6,8)}/${expiryYMD.slice(4,6)}/${expiryYMD.slice(0,4)}`;
  const planLabel = isAnnual ? 'Annual' : 'Monthly';

  const html = buildEmailHtml({ firstName, toolName, key, planLabel, expiryFormatted, toolUrl, productUrl, bundleInfo });

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

// ── Single tool purchase handler ─────────────────────────────────────────────

async function handleSingleToolPurchase({ tool, email, name, customerId, isAnnual, seats, session }) {
  const expiryYMD = expiryDate(isAnnual ? 370 : 35);
  const key = generateKey(tool.code, customerId, expiryYMD);

  console.log(`Key generated: ${key} for ${email} (${tool.name}, ${seats} seat${seats !== 1 ? 's' : ''})`);

  try {
    const pageId = await createLicenceRecord({
      key, email, name,
      toolName: tool.name,
      isAnnual,
      stripeCustomerId:     session.customer       || '',
      stripeSubscriptionId: session.subscription   || '',
      expiryYMD,
      seats,
    });
    console.log(`Notion licence record created: ${pageId}`);
  } catch (notionErr) {
    console.error('Notion write failed (non-fatal):', notionErr.message);
  }

  await sendKeyEmail({
    to: email, name,
    toolName: tool.name,
    key,
    toolUrl: tool.toolUrl,
    productUrl: tool.productUrl,
    expiryYMD,
    isAnnual,
  });

  console.log(`Key email sent to ${email} for ${tool.name}`);
}

// ── Bundle purchase handler ──────────────────────────────────────────────────

async function handleBundlePurchase({ email, name, customerId, isAnnual, seats, session }) {
  const expiryYMD = expiryDate(isAnnual ? 370 : 35);
  const total = ALL_TOOLS.length;

  console.log(`Bundle purchase for ${email} — generating ${total} keys`);

  for (let i = 0; i < ALL_TOOLS.length; i++) {
    const tool = ALL_TOOLS[i];
    const key = generateKey(tool.code, customerId, expiryYMD);

    console.log(`  [${i + 1}/${total}] ${tool.code}: ${key}`);

    try {
      await createLicenceRecord({
        key, email, name,
        toolName: tool.name,
        isAnnual,
        stripeCustomerId:     session.customer       || '',
        stripeSubscriptionId: session.subscription   || '',
        expiryYMD,
        seats,
      });
    } catch (notionErr) {
      console.error(`Notion write failed for ${tool.name} (non-fatal):`, notionErr.message);
    }

    await sendKeyEmail({
      to: email, name,
      toolName: tool.name,
      key,
      toolUrl: tool.toolUrl,
      productUrl: tool.productUrl,
      expiryYMD,
      isAnnual,
      bundleInfo: {
        index: i + 1,
        total,
        currentCode: tool.code,
        allTools: ALL_TOOLS,
      },
    });

    console.log(`  Email ${i + 1}/${total} sent for ${tool.name}`);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // 1. Verify Stripe signature
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      event.headers['stripe-signature'] || '',
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: 'Signature verification failed' };
  }

  // ── checkout.session.completed — new purchase ─────────────────────────────
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ['data.price.product'],
        limit: 1,
      });

      const item     = lineItems.data[0];
      const price    = item?.price;
      const product  = price?.product;
      const isAnnual = price?.recurring?.interval === 'year';
      const seats    = item?.quantity || 1;

      const email      = session.customer_details?.email;
      const name       = session.customer_details?.name;
      const customerId = makeCustomerId(email, name);
      const productName = product?.name || '';

      if (isBundle(productName)) {
        await handleBundlePurchase({ email, name, customerId, isAnnual, seats, session });
        console.log(`Bundle complete — ${ALL_TOOLS.length} emails sent to ${email}`);
      } else {
        const tool = matchTool(productName);

        if (!tool) {
          console.warn(`WARNING: No tool match for Stripe product "${productName}" — falling back to INS suite key`);
          // Fallback: generate a single INS key (backwards compatible)
          const expiryYMD = expiryDate(isAnnual ? 370 : 35);
          const key = generateKey('INS', customerId, expiryYMD);

          try {
            await createLicenceRecord({
              key, email, name,
              toolName: productName || 'InSite Tool',
              isAnnual,
              stripeCustomerId:     session.customer       || '',
              stripeSubscriptionId: session.subscription   || '',
              expiryYMD,
              seats,
            });
          } catch (notionErr) {
            console.error('Notion write failed (non-fatal):', notionErr.message);
          }

          await sendKeyEmail({
            to: email, name,
            toolName: productName || 'InSite Tool',
            key,
            toolUrl: 'https://agilityops.com.au/pages/brands.html',
            productUrl: 'https://agilityops.com.au',
            expiryYMD,
            isAnnual,
          });

          console.warn(`Fallback INS key sent to ${email} — check Stripe product name "${productName}"`);
        } else {
          await handleSingleToolPurchase({ tool, email, name, customerId, isAnnual, seats, session });
        }
      }

      return { statusCode: 200, body: 'OK' };

    } catch (err) {
      console.error('Error processing checkout.session.completed:', err);
      return { statusCode: 500, body: `Internal error: ${err.message}` };
    }
  }

  // ── customer.subscription.deleted — cancellation ──────────────────────────
  if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object;
    const subscriptionId = subscription.id;

    console.log(`Subscription cancelled: ${subscriptionId}`);

    try {
      const pageIds = await findLicencesBySubscriptionId(subscriptionId);

      if (pageIds.length === 0) {
        console.warn(`No Notion records found for subscription ${subscriptionId} — skipping update`);
        return { statusCode: 200, body: 'No matching Notion records — ignored' };
      }

      for (const pageId of pageIds) {
        await updateLicenceStatus(pageId, 'Cancelled');
        console.log(`Notion licence ${pageId} marked Cancelled`);
      }

      console.log(`${pageIds.length} licence(s) cancelled for subscription ${subscriptionId}`);
      return { statusCode: 200, body: `${pageIds.length} cancelled` };

    } catch (err) {
      console.error('Error processing customer.subscription.deleted:', err);
      return { statusCode: 500, body: `Internal error: ${err.message}` };
    }
  }

  return { statusCode: 200, body: 'Event ignored' };
};

// ── Exports for unit testing ─────────────────────────────────────────────────
if (typeof module !== 'undefined') {
  module.exports._test = {
    computeHash,
    generateKey,
    makeCustomerId,
    expiryDate,
    matchTool,
    isBundle,
    buildEmailHtml,
    ALL_TOOLS,
  };
}
