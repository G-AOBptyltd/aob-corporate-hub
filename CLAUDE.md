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
- **Three product brands:** SprintINSite (predictive sprint analytics), PortfolioInSite (AI-native portfolio governance), FACT (Applied AI training)
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

## File Structure

```
aob-corporate-hub/
├── index.html              — Homepage (AI transformation positioning)
├── sitemap.xml             — XML sitemap
├── robots.txt              — Search engine directives
├── css/
│   └── styles.css          — Main stylesheet
├── js/
│   └── main.js             — Interactions, animations
├── img/                    — All images
│   ├── AOBLeaders.jpg
│   ├── AOBEvents.jpg
│   ├── AOBGallupColab.jpg
│   ├── SprintInSite1.png
│   ├── PortfolioInSite1.png
│   └── FACT1_wecometoyou.jpg
└── pages/
    ├── brands.html         — Three brand showcase
    ├── about.html
    ├── contact.html
    └── ...
```

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

## Related Repositories

| Repo | Purpose |
|------|---------|
| `sprintinsite-website` | SprintINSite marketing site |
| `Jira-Capacity-Point_TeamTracker` | SprintINSite Forge app |
| `portfolioinsite-website` | PortfolioInSite marketing site |
| `PortfolioInSite` | PortfolioInSite Forge app |

## Key Learnings

- CSS `object-fit: contain` (not `cover`) for product screenshots — prevents cropping UI content
- Always hard-refresh and test in incognito after Netlify deploys
- Netlify deploy log showing "0 new files" is normal if files already synced from prior deploy
- Site was not indexed as of March 2026 — SEO is fresh, needs time and backlinks
