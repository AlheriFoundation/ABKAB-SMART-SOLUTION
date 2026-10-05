const { sendJson, supabase } = require('../lib/request-backend');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  try {
    const [homepage, media, portfolio, services, settings] = await Promise.all([
      supabase('homepage_content?select=*&status=eq.PUBLISHED&limit=1', { method: 'GET', operation: 'read homepage content' }),
      supabase('media_library?select=*&status=eq.PUBLISHED&order=created_at.desc', { method: 'GET', operation: 'read public media' }),
      supabase('portfolio_items?select=*&status=eq.PUBLISHED&order=display_order.asc,created_at.desc', { method: 'GET', operation: 'read public portfolio' }),
      supabase('service_categories?select=*&status=eq.PUBLISHED&order=display_order.asc,created_at.asc', { method: 'GET', operation: 'read public services' }),
      supabase('site_settings?select=*&status=eq.PUBLISHED', { method: 'GET', operation: 'read site settings' })
    ]);
    return sendJson(res, 200, { homepage: homepage[0] || null, media, portfolio, services, settings });
  } catch (error) {
    console.error('Public CMS API failed', error.message);
    return sendJson(res, 200, { homepage: null, media: [], portfolio: [], services: [], settings: [] });
  }
};
