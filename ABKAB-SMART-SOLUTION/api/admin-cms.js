const { sendJson, body, supabase, requireAdmin } = require('../lib/request-backend');

const resources = {
  homepage: 'homepage_content', media: 'media_library', portfolio: 'portfolio_items', services: 'service_categories', settings: 'site_settings'
};
const limits = { homepage: 3000, media: 500000, portfolio: 20000, services: 5000, settings: 5000 };
const imagePattern = /^data:image\/(jpeg|jpg|png|webp);base64,[a-z0-9+/=]+$/i;

function clean(value, max) { return String(value == null ? '' : value).trim().slice(0, max || 5000); }
function safeUrl(value) { const url = clean(value, limits.media); if (!url || /^https:\/\//i.test(url) || /^http:\/\//i.test(url) || /^\//.test(url) || /^[a-z0-9_./-]+\.(svg|jpe?g|png|webp)$/i.test(url)) return url; throw new Error('Media URLs must use HTTPS, HTTP or a safe local image path.'); }
function resourceName(key) { return resources[key]; }
function allowed(key, input) {
  const data = { ...input };
  delete data.id; delete data.created_at; delete data.updated_at;
  if (key === 'media' && data.src && /^data:/i.test(data.src)) {
    if (!imagePattern.test(data.src) || data.src.length > limits.media) throw new Error('Upload a JPG, PNG or WEBP image smaller than 5 MB.');
  }
  if (data.src !== undefined) data.src = /^data:/i.test(data.src) ? data.src : safeUrl(data.src);
  if (data.cover_image) data.cover_image = safeUrl(data.cover_image);
  if (data.additional_image) data.additional_image = safeUrl(data.additional_image);
  if (data.image) data.image = safeUrl(data.image);
  ['name','title','description','eyebrow','headline','body','primary_cta_text','primary_cta_link','secondary_cta_text','secondary_cta_link','positioning_statement','why_heading','why_description','process_heading','process_description','final_cta_heading','final_cta_description','company_description','alt_text','category','project_url','src','type','section','slug','icon'].forEach((field) => { if (data[field] !== undefined) data[field] = clean(data[field], field === 'src' ? limits.media : 5000); });
  if (data.status !== undefined) data.status = data.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
  if (key === 'media' && data.type !== undefined && !['image','video'].includes(String(data.type).toLowerCase())) throw new Error('Media type must be image or video.');
  if (data.display_order !== undefined) data.display_order = Math.max(0, Math.min(9999, Number(data.display_order) || 0));
  if (data.featured !== undefined) data.featured = Boolean(data.featured);
  if (data.published !== undefined) data.status = data.published ? 'PUBLISHED' : 'DRAFT';
  const output = {};
  Object.keys(data).forEach((keyName) => { if (data[keyName] !== undefined) output[keyName] = data[keyName]; });
  return output;
}

module.exports = async function handler(req, res) {
  try {
    if (!await requireAdmin(req)) return sendJson(res, 401, { error: 'Authentication required.' });
    const input = req.method === 'GET' ? req.query || {} : body(req);
    const key = clean(input && (input.resource || input.type), 30).toLowerCase();
    if (!resourceName(key)) return sendJson(res, 400, { error: 'Unknown CMS resource.' });
    const table = resourceName(key);
    if (req.method === 'GET') {
      const rows = await supabase(`${table}?select=*&order=display_order.asc,created_at.desc`, { method: 'GET', operation: `list ${key}` });
      return sendJson(res, 200, { items: rows });
    }
    if (req.method === 'DELETE') {
      const id = clean(input.id, 80); if (!id) return sendJson(res, 400, { error: 'Missing item id.' });
      await supabase(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', operation: `delete ${key}` });
      return sendJson(res, 200, { ok: true });
    }
    if (!input || typeof input !== 'object') return sendJson(res, 400, { error: 'Request body must be valid JSON.' });
    const data = allowed(key, input);
    delete data.resource; delete data.type;
    if (req.method === 'POST') {
      if (key === 'homepage') data.status = data.status || 'DRAFT';
      const rows = await supabase(`${table}?select=*`, { method: 'POST', headers: { 'content-type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(data), operation: `create ${key}` });
      return sendJson(res, 201, { item: rows[0] });
    }
    if (req.method === 'PATCH') {
      const id = clean(data.id || input.id, 80); delete data.id; if (!id) return sendJson(res, 400, { error: 'Missing item id.' });
      data.updated_at = new Date().toISOString();
      const rows = await supabase(`${table}?id=eq.${encodeURIComponent(id)}&select=*`, { method: 'PATCH', headers: { 'content-type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(data), operation: `update ${key}` });
      return rows.length ? sendJson(res, 200, { item: rows[0] }) : sendJson(res, 404, { error: 'Item not found.' });
    }
    return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, PATCH, DELETE' });
  } catch (error) {
    console.error('Admin CMS API failed', { operation: error.operation || 'cms', message: error.message, code: error.code || null });
    return sendJson(res, error.status >= 400 && error.status < 600 ? error.status : 500, { error: error.message || 'CMS service is temporarily unavailable.' });
  }
};
