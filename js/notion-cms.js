// ============================================
// AOB Corporate Hub — Notion CMS Client (v2)
// Fetches content from AOB Central API
// ============================================

const CMS_API = '/api/cms';
const SITE_SLUG = 'agilityops';

// Cache to avoid repeated fetches during a session
const cmsCache = {};

/**
 * Fetch content from Central CMS API
 * @param {string} type - content | pricing | products | sites
 * @returns {Promise<Array>} Array of items
 */
async function fetchCMS(type) {
  if (cmsCache[type]) return cmsCache[type];

  try {
    const url = `${CMS_API}?type=${type}&site=${SITE_SLUG}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CMS fetch failed: ${response.status}`);
    const json = await response.json();
    cmsCache[type] = json.data || [];
    return cmsCache[type];
  } catch (error) {
    console.warn(`CMS fetch failed for ${type}:`, error);
    return null; // null signals "use static content"
  }
}

/**
 * Filter content items by Type select property
 */
function filterByType(items, typeName) {
  if (!items) return null;
  return items.filter(item => item.type === typeName);
}

// ========== HELPERS ==========

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ========== INITIALIZATION ==========

/**
 * Initialize CMS content loading
 * Falls back gracefully to static HTML if CMS is unavailable
 */
async function initNotionCMS() {
  try {
    console.log('CMS client ready — Agility Ops via central API');
  } catch (error) {
    console.warn('Central CMS unavailable:', error);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotionCMS);
} else {
  initNotionCMS();
}
