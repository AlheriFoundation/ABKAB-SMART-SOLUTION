const { sendJson, supabase } = require('../lib/request-backend');

function homepageContent(rows) {
  const result = {};
  rows.forEach((row) => {
    if (row.section_key === 'hero') Object.assign(result, { eyebrow: row.eyebrow, headline: row.headline, body: row.description, primary_cta_text: row.primary_cta_text, primary_cta_link: row.primary_cta_url, secondary_cta_text: row.secondary_cta_text, secondary_cta_link: row.secondary_cta_url, image_id: row.image_id });
    if (row.section_key === 'positioning') result.positioning_statement = row.content;
    if (row.section_key === 'why_abkab') { result.why_heading = (row.content || '').split('\n')[0]; result.why_description = (row.content || '').split('\n').slice(1).join('\n'); }
    if (row.section_key === 'process') { result.process_heading = (row.content || '').split('\n')[0]; result.process_description = (row.content || '').split('\n').slice(1).join('\n'); }
    if (row.section_key === 'final_cta') { result.final_cta_heading = (row.content || '').split('\n')[0]; result.final_cta_description = (row.content || '').split('\n').slice(1).join('\n'); }
  });
  return result;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  try {
    const [homepage, media, portfolio, services] = await Promise.all([
      supabase('homepage_content?select=*&is_published=eq.true&order=section_key.asc', { method: 'GET', operation: 'read published homepage' }),
      supabase('media_library?select=*&is_active=eq.true&order=created_at.desc', { method: 'GET', operation: 'read active media' }),
      supabase('portfolio_projects?select=*&is_published=eq.true&order=display_order.asc,created_at.desc', { method: 'GET', operation: 'read published portfolio' }),
      supabase('service_categories?select=*&is_published=eq.true&order=display_order.asc,created_at.asc', { method: 'GET', operation: 'read published services' })
    ]);
    return sendJson(res, 200, { homepage: homepageContent(homepage), media: media.map((item) => ({ ...item, src: item.public_url || '', type: item.media_type, section: (item.section_key || item.category || 'general').toUpperCase() })), portfolio: portfolio.map((item) => ({ ...item, featured: item.is_featured })), services: services.map((item) => ({ ...item, status: item.is_published ? 'PUBLISHED' : 'DRAFT' })) });
  } catch (error) {
    console.error('Public CMS API failed', error.message);
    return sendJson(res, 200, { homepage: null, media: [], portfolio: [], services: [] });
  }
};
