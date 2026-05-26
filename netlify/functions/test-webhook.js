/**
 * test-webhook.js — Unit tests for stripe-webhook.js v2
 *
 * Run: node netlify/functions/test-webhook.js
 *
 * Tests: product matching, bundle detection, key generation,
 * hash consistency, email template rendering, customer ID derivation.
 */

const { _test } = require('./stripe-webhook');
const { computeHash, generateKey, makeCustomerId, matchTool, isBundle, buildEmailHtml, ALL_TOOLS } = _test;

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${label}`);
  }
}

function section(name) {
  console.log(`\n\x1b[1m${name}\x1b[0m`);
}

// ── matchTool() — resilient product name matching ────────────────────────────

section('matchTool() — exact InSite names');
assert(matchTool('ForecastInSite')?.code === 'FCT', 'ForecastInSite → FCT');
assert(matchTool('SprintINSite')?.code === 'SIS', 'SprintINSite → SIS');
assert(matchTool('FlowInSite')?.code === 'FLW', 'FlowInSite → FLW');
assert(matchTool('PlanInSite')?.code === 'PLN', 'PlanInSite → PLN');
assert(matchTool('PortfolioInSite')?.code === 'POI', 'PortfolioInSite → POI');

section('matchTool() — with spaces and tiers');
assert(matchTool('Forecast InSite')?.code === 'FCT', '"Forecast InSite" (space) → FCT');
assert(matchTool('ForecastInSite Starter Monthly')?.code === 'FCT', '"ForecastInSite Starter Monthly" → FCT');
assert(matchTool('Sprint INSite Team Annual')?.code === 'SIS', '"Sprint INSite Team Annual" → SIS');
assert(matchTool('Flow InSite Business')?.code === 'FLW', '"Flow InSite Business" → FLW');
assert(matchTool('Plan InSite Starter')?.code === 'PLN', '"Plan InSite Starter" → PLN');
assert(matchTool('Portfolio InSite Med Business Annual')?.code === 'POI', '"Portfolio InSite Med Business Annual" → POI');

section('matchTool() — case insensitive');
assert(matchTool('FORECASTINSITE')?.code === 'FCT', 'FORECASTINSITE (uppercase) → FCT');
assert(matchTool('forecastinsite')?.code === 'FCT', 'forecastinsite (lowercase) → FCT');
assert(matchTool('FoReCaStInSiTe')?.code === 'FCT', 'FoReCaStInSiTe (mixed) → FCT');

section('matchTool() — with hyphens, underscores, special chars');
assert(matchTool('forecast-insite')?.code === 'FCT', '"forecast-insite" (hyphen) → FCT');
assert(matchTool('forecast_insite')?.code === 'FCT', '"forecast_insite" (underscore) → FCT');
assert(matchTool('Forecast.InSite')?.code === 'FCT', '"Forecast.InSite" (dot) → FCT');

section('matchTool() — partial keyword matches');
assert(matchTool('Some Forecast Tool')?.code === 'FCT', '"Some Forecast Tool" → FCT (keyword: forecast)');
assert(matchTool('Sprint Report Generator')?.code === 'SIS', '"Sprint Report Generator" → SIS (keyword: sprint)');
assert(matchTool('Portfolio Dashboard')?.code === 'POI', '"Portfolio Dashboard" → POI (keyword: portfolio)');

section('matchTool() — no match (fallback)');
assert(matchTool('') === null, 'Empty string → null');
assert(matchTool('Random Product') === null, '"Random Product" → null');
assert(matchTool(null) === null, 'null → null');
assert(matchTool(undefined) === null, 'undefined → null');

// ── isBundle() — bundle detection ────────────────────────────────────────────

section('isBundle() — positive cases');
assert(isBundle('InSite Suite Bundle') === true, '"InSite Suite Bundle" → true');
assert(isBundle('InSite Suite Bundle Starter Monthly') === true, '"InSite Suite Bundle Starter Monthly" → true');
assert(isBundle('Suite Annual') === true, '"Suite Annual" → true');
assert(isBundle('All Tools Bundle') === true, '"All Tools Bundle" → true');
assert(isBundle('insite bundle') === true, '"insite bundle" (lowercase) → true');

section('isBundle() — negative cases');
assert(isBundle('ForecastInSite') === false, '"ForecastInSite" → false');
assert(isBundle('SprintINSite Starter') === false, '"SprintINSite Starter" → false');
assert(isBundle('') === false, 'Empty string → false');
assert(isBundle(null) === false, 'null → false');

// ── generateKey() — key format and hash consistency ──────────────────────────

section('generateKey() — format');
const testKey = generateKey('FCT', 'ANETTEHON', '20260629');
const parts = testKey.split('-');
assert(parts.length === 4, 'Key has 4 parts separated by hyphens');
assert(parts[0] === 'FCT', 'Part 1 is tool code');
assert(parts[1] === 'ANETTEHON', 'Part 2 is customer ID');
assert(parts[2] === '20260629', 'Part 3 is expiry date');
assert(/^[A-F0-9]{4}$/.test(parts[3]), 'Part 4 is 4-char hex hash');

section('generateKey() — hash consistency');
const key1 = generateKey('FCT', 'ANETTEHON', '20260629');
const key2 = generateKey('FCT', 'ANETTEHON', '20260629');
assert(key1 === key2, 'Same inputs produce same key (deterministic)');

const keyINS = generateKey('INS', 'ANETTEHON', '20260629');
assert(keyINS !== key1, 'Different tool code produces different key');
assert(keyINS.startsWith('INS-'), 'INS key starts with INS-');

section('generateKey() — Anette backwards compatibility');
// Verify Anette's existing key still validates with INS code
const anetteKey = generateKey('INS', 'ANETTEHON', '20260629');
assert(anetteKey === 'INS-ANETTEHON-20260629-392B', `Anette's key matches: ${anetteKey}`);

// ── computeHash() — hash function ────────────────────────────────────────────

section('computeHash() — consistency');
assert(computeHash('FCT-TEST-20260101') === computeHash('FCT-TEST-20260101'), 'Same input → same hash');
assert(computeHash('FCT-TEST-20260101') !== computeHash('SIS-TEST-20260101'), 'Different input → different hash');
assert(computeHash('').length === 4, 'Empty input still produces 4-char hash');

// ── makeCustomerId() — customer ID derivation ────────────────────────────────

section('makeCustomerId()');
assert(makeCustomerId('anette@example.com', 'Anette Hon') === 'ANETTEHON', 'Name "Anette Hon" → ANETTEHON (space stripped, max 10 chars)');
assert(makeCustomerId('greg@company.com', null) === 'GREG', 'No name, email "greg@company.com" → GREG');
assert(makeCustomerId('test@example.com', '') === 'TEST', 'Empty name, email fallback → TEST');
assert(makeCustomerId('super.long.name@example.com', 'A Very Long Customer Name Here') === 'AVERYLONGC', 'Long name truncated to 10 chars');

// ── buildEmailHtml() — template rendering ────────────────────────────────────

section('buildEmailHtml() — single tool email');
const singleHtml = buildEmailHtml({
  firstName: 'Greg',
  toolName: 'ForecastInSite',
  key: 'FCT-GREG-20260701-ABCD',
  planLabel: 'Annual',
  expiryFormatted: '01/07/2026',
  toolUrl: 'https://portfolioinsite.com.au/tools/forecastinsite',
  productUrl: 'https://portfolioinsite.com.au/forecastinsite/overview',
  bundleInfo: null,
});
assert(singleHtml.includes('ForecastInSite'), 'Contains tool name');
assert(singleHtml.includes('FCT-GREG-20260701-ABCD'), 'Contains licence key');
assert(singleHtml.includes('portfolioinsite.com.au/tools/forecastinsite'), 'Contains direct tool URL');
assert(singleHtml.includes('portfolioinsite.com.au/forecastinsite/overview'), 'Contains product page URL');
assert(singleHtml.includes('Learn more about ForecastInSite'), 'Contains secondary link text');
assert(singleHtml.includes('Open ForecastInSite'), 'Contains CTA button text');
assert(!singleHtml.includes('email 1 of'), 'No bundle banner in single tool email');
assert(!singleHtml.includes('Your full bundle'), 'No bundle checklist in single tool email');
assert(singleHtml.includes('Hi Greg'), 'Contains personalised greeting');
assert(singleHtml.includes('Annual'), 'Contains plan label');

section('buildEmailHtml() — bundle email');
const bundleHtml = buildEmailHtml({
  firstName: 'Anette',
  toolName: 'ForecastInSite',
  key: 'FCT-ANETTEHON-20260701-B4E1',
  planLabel: 'Monthly',
  expiryFormatted: '01/07/2026',
  toolUrl: 'https://portfolioinsite.com.au/tools/forecastinsite',
  productUrl: 'https://portfolioinsite.com.au/forecastinsite/overview',
  bundleInfo: {
    index: 1,
    total: 5,
    currentCode: 'FCT',
    allTools: ALL_TOOLS,
  },
});
assert(bundleHtml.includes('email 1 of 5'), 'Contains bundle banner "email 1 of 5"');
assert(bundleHtml.includes('Your full bundle'), 'Contains bundle checklist');
assert(bundleHtml.includes('This email'), 'Current tool marked as "This email"');
assert(bundleHtml.includes('Separate email'), 'Other tools marked as "Separate email"');
assert(bundleHtml.includes('SprintINSite'), 'Bundle checklist includes SprintINSite');
assert(bundleHtml.includes('FlowInSite'), 'Bundle checklist includes FlowInSite');
assert(bundleHtml.includes('PlanInSite'), 'Bundle checklist includes PlanInSite');
assert(bundleHtml.includes('PortfolioInSite'), 'Bundle checklist includes PortfolioInSite');

// ── ALL_TOOLS registry ───────────────────────────────────────────────────────

section('ALL_TOOLS registry — completeness');
assert(ALL_TOOLS.length === 5, '5 tools in registry');
const codes = ALL_TOOLS.map(t => t.code).sort();
assert(JSON.stringify(codes) === '["FCT","FLW","PLN","POI","SIS"]', 'All 5 tool codes present');
ALL_TOOLS.forEach(tool => {
  assert(tool.toolUrl.startsWith('https://'), `${tool.code} has HTTPS tool URL`);
  assert(tool.productUrl.startsWith('https://'), `${tool.code} has HTTPS product URL`);
  assert(tool.keywords.length >= 2, `${tool.code} has at least 2 keywords`);
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m`);
if (failed > 0) {
  console.log('\x1b[31mSome tests FAILED — do NOT merge to main\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mAll tests passed ✓\x1b[0m');
}
