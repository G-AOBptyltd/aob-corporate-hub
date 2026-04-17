# AOB Corporate Hub — Claude Code Project Intelligence

## Project Identity

This is the main corporate website for Agility Ops Business Pty Ltd (AOB), an AI transformation consultancy based in Sydney, Australia. The site positions AOB as a strategic AI adoption leader — NOT an agile coaching firm (legacy positioning from 2019).

**Owner:** Agility Ops Business Pty Ltd (AOB)
**Domain:** https://agilityops.com.au
**GitHub:** https://github.com/G-AOBptyltd/aob-corporate-hub
**Hosting:** Netlify (auto-deploys from main branch)
**Analytics:** Google Analytics G-LLJ1KPTDMK

## Brand Positioning (CRITICAL)

AOB is pivoting from traditional agile training to AI transformation leadership. All content must reflect:

- **Lead with AI** — not agile, not scrum, not coaching
- **Three product brands:** SprintINSite (predictive sprint analytics), PortfolioInSite (AI-native portfolio governance), FACT (Applied AI training, coaching, advisory & partnerships)
- **FACT website:** https://fastact.com.au (live as of 6 Mar 2026, hosted on Netlify, repo: fastact-website)
- **Target audience:** Enterprise leaders, PMOs, CIOs, steering committees
- **Tone:** Practitioner-led authority, data-driven, no hype
- **Geography:** Australian-made, Sydney-based

## R&D Language Rules (MANDATORY)

AOB has an R&D Tax Incentive application in progress — NOT approved, NOT secured.

**NEVER use:**
- "R&D-backed" (implies funding secured)
- "$847K funding secured" (application in progress)
- "Government-funded methodology" (not yet funded)

**ALWAYS use:**
- "Developed within our R&D program"
- "Methodology under active R&D development"
- "Practitioner-led training"
- "Applied AI training"

## Tech Stack

- **Framework:** Static HTML/CSS/JS (no build tools)
- **Fonts:** Inter + Plus Jakarta Sans (Google Fonts)
- **Styling:** Custom CSS with CSS variables, responsive grid
- **Hosting:** Netlify (auto-deploy from GitHub main branch)
- **SEO:** JSON-LD structured data, OG tags, sitemap.xml, robots.txt

## Deployment (CRITICAL)

- **GitHub connector NOT available** in Claude AI — all deployments via manual paste
- **Always provide .txt files** for HTML content (not .html) to prevent browser auto-rendering during copy/paste
- **Naming convention:** `<page>-PASTE-THIS.txt`
- **Process:** Open raw .txt in text editor → Select all → Paste into GitHub web editor → Commit to main → Netlify auto-deploys

## Central API Integration (Added April 2026)

This site is integrated with the **AOB Central API** (`api.agilityops.com.au`) for dynamic product and content pages powered by Notion CMS.

- **CMS Client:** `js/notion-cms.js` — SITE_SLUG = `agilityops`
- **Product template:** `pages/product.html` — Brand-scoped: `?type=products&brand=agilityops`
- **Content template:** `pages/content.html` — Site-scoped: `?type=content&site=agilityops`
- **API proxy:** `/api/cms` → `https://api.agilityops.com.au/api/cms` (via Netlify rewrite in `netlify.toml`)
- **CRITICAL:** Always use `/api/cms` (local proxy), NEVER the direct API URL — direct calls are blocked by CORS on production
- **Cache TTL:** 5 minutes on central API (in-memory cache)
- **SPA routing:** `/product/*` → `pages/product.html`, `/content/*` → `pages/content.html`

### Test URLs
- Product: `https://agilityops.com.au/product/agilityops`
- Content: `https://agilityops.com.au/content/{slug}`
- 404 test: `https://agilityops.com.au/product/nonexistent` → "Product not found"

## File Structure

```
aob-corporate-hub/
├── index.html              — Homepage (AI transformation positioning)
├── netlify.toml            — API proxy, SPA redirects, security headers
├── sitemap.xml             — XML sitemap
├── robots.txt              — Search engine directives
├── css/
│   └── styles.css          — Main stylesheet
├── js/
│   ├── main.js             — Interactions, animations
│   └── notion-cms.js       — CMS client v2 (central API)
├── img/                    — All images
│   ├── AOBLeaders.jpg
│   ├── AOBEvents.jpg
│   ├── AOBGallupColab.jpg
│   ├── SprintInSite1.png
│   ├── PortfolioInSite1.png
│   └── FACT1_wecometoyou.jpg
└── pages/
    ├── product.html        — Dynamic product detail (central API)
    ├── content.html        — Dynamic content detail (central API)
    ├── brands.html         — Three brand showcase
    ├── about.html
    ├── contact.html        — Contact form (Netlify Forms enabled)
    ├── privacy.html        — Privacy Policy (added 6 Mar 2026)
    ├── terms.html          — Terms of Service (added 6 Mar 2026)
    └── ...
```

## Legal Pages (Added 6 March 2026)

- **Privacy Policy** (`pages/privacy.html`) and **Terms of Service** (`pages/terms.html`) are the canonical legal pages for all AOB properties
- Both product sites (SprintINSite, PortfolioInSite) link to these pages rather than hosting their own copies
- Legal pages use inline `<style>` blocks for text styling — dark text on white background:
  - Headings: `#1e293b`, body text: `#334155`, links: `#2563eb`, meta: `#64748b`
- Content references Australian Privacy Act 1988 (Cth), GDPR, and includes ABN / entity details
- **CRITICAL:** The site body background is WHITE (`var(--white)` / `#ffffff`). Legal page text must be DARK. Do not use light/grey text colours.

## Netlify Forms (Added 6 March 2026)

- Contact page (`pages/contact.html`) uses **Netlify Forms** with `data-netlify="true"` attribute
- Form name: `contact` (appears in Netlify dashboard under Forms)
- **Setup requirement:** Form detection must be enabled in Netlify dashboard (Site → Forms → Enable form detection) and a redeploy triggered after enabling
- Email notifications configured to `greg@agilityops.com.au` with subject "AO Website - Contact Request"
- Form handler in `js/main.js` uses `fetch()` POST to root URL with `x-www-form-urlencoded` encoding

## Image Guidelines

- Product screenshots: PNG format, full browser width, no OS chrome
- Corporate photos: JPG format, compressed
- Naming: descriptive kebab-case (`sprint-velocity-chart.png`)
- All images in `/img/` directory
- From subpages, reference as `../img/filename`

## Content Rules

- No emoji in professional copy
- Australian English spelling (prioritise, organisation, colour)
- Statistics must be verifiable — no inflated claims
- Social links must be real URLs (LinkedIn, GitHub) — never `#` placeholders
- Footer must include ABN and legal entity name

## Related Repositories & CLAUDE.md Files

| Repo / File | Purpose |
|------|---------|
| `sprintinsite-website` | SprintINSite marketing site |
| `Jira-Capacity-Point_TeamTracker` | SprintINSite Forge app |
| `portfolioinsite-website` | PortfolioInSite marketing site |
| `PortfolioInSite` | PortfolioInSite Forge app |
| `fastact-website` | FACT training & advisory site (fastact.com.au) |
| `aob-api` | Central API for CMS + payments (live at api.agilityops.com.au) |
| `../CLAUDE-aob-payment-platform.md` | **Payment platform & CMS architecture** (use for cross-site work) |
| `../CLAUDE-blog-content.md` | Blog content engine |

## Key Learnings

- CSS `object-fit: contain` (not `cover`) for product screenshots — prevents cropping UI content
- Always hard-refresh and test in incognito after Netlify deploys
- Netlify deploy log showing "0 new files" is normal if files already synced from prior deploy
- Site was not indexed as of March 2026 — SEO is fresh, needs time and backlinks
- **Legal page text colour:** Body background is WHITE — legal page text must be dark (#1e293b / #334155), NOT light grey. This was a painful lesson on 6 Mar 2026.
- **Netlify Forms requires explicit enablement:** Adding `data-netlify="true"` to HTML is not enough — form detection must also be enabled in the Netlify dashboard, then a redeploy triggered
- **Netlify branch deploys:** Not enabled by default. Test branches need PR-based deploy previews or branch deploy settings enabled in Netlify
- **Domain architecture doc:** v3 (March 6, 2026) — tracks all AOB domains, hosting, email, and GitHub repos. All four brand sites now live.
- **fastact.com.au DNS:** Was previously forwarding to agilityops.com.au in GoDaddy — forwarding must be removed before DNS A records can be edited (GoDaddy locks A records when forwarding is active)
- **CORS on production:** Direct API calls from browser to api.agilityops.com.au are blocked by CORS. Always use the `/api/cms` Netlify proxy instead. This was a painful lesson across all four sites in April 2026.
- **Central API cache:** 5-minute TTL — Notion changes take up to 5 min to appear on sites

## Workflow Preferences

- **GitHub uploads:** If bulk file uploads or image uploads to GitHub are needed, ask the user to do it directly — provide the file list and instructions rather than attempting complex browser-based uploads
- **Test branches:** ALWAYS create a test branch for every website before making changes to `main`. Never commit directly to `main` — use a branch, verify, then merge. This prevents accidental breakage on live sites
- **Deployment .txt files:** When GitHub connector isn't available, provide `<page>-PASTE-THIS.txt` files for manual paste into GitHub web editor
