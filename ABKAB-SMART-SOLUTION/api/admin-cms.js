const { env, sendJson, body, supabase, requireAdmin } = require('../lib/request-backend');

const tables = { media: 'media_library', portfolio: 'portfolio_projects', services: 'service_categories', settings: 'site_settings' };
const sections = ['hero', 'positioning', 'why_abkab', 'process', 'final_cta'];
const maxDataUrlLength = 5 * 1024 * 1024 * 1.38;
const imageDataPattern = /^data:image\/(jpeg|jpg|png|webp);base64,[a-z0-9+/=]+$/i;

function text(value, max) { return String(value == null ? '' : value).trim().slice(0, max || 5000); }
function isUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '')); }
function nullableUuid(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (!isUuid(value)) throw new Error(`${field} must be a valid media ID.`);
  return value;
}
function safeUrl(value) {
  const url = text(value, 500000);
  if (!url || /^(https?:\/\/|\/|[a-z0-9_./-]+\.(svg|jpe?g|png|webp))$/i.test(url)) return url;
  throw new Error('Media URLs must use HTTP(S) or a safe local image path.');
}
function status(value) { return String(value).toUpperCase() === 'PUBLISHED' || value === true; }
function publicHomepage(rows) {
  const result = { id: 'homepage', status: 'DRAFT' };
  rows.forEach((row) => {
    if (row.is_published) result.status = 'PUBLISHED';
    if (row.section_key === 'hero') Object.assign(result, { eyebrow: row.eyebrow, headline: row.headline, body: row.description, primary_cta_text: row.primary_cta_text, primary_cta_link: row.primary_cta_url, secondary_cta_text: row.secondary_cta_text, secondary_cta_link: row.secondary_cta_url, image_id: row.image_id });
    if (row.section_key === 'positioning') result.positioning_statement = row.content;
    if (row.section_key === 'why_abkab') { result.why_heading = (row.content || '').split('\n')[0]; result.why_description = (row.content || '').split('\n').slice(1).join('\n'); }
    if (row.section_key === 'process') { result.process_heading = (row.content || '').split('\n')[0]; result.process_description = (row.content || '').split('\n').slice(1).join('\n'); }
    if (row.section_key === 'final_cta') { result.final_cta_heading = (row.content || '').split('\n')[0]; result.final_cta_description = (row.content || '').split('\n').slice(1).join('\n'); }
  });
  return result;
}
function homepageRows(input) {
  const published = status(input.status);
  return sections.map((section_key) => {
    const row = { section_key, is_published: published };
    if (section_key === 'hero') Object.assign(row, { eyebrow: text(input.eyebrow), headline: text(input.headline), description: text(input.body || input.description), primary_cta_text: text(input.primary_cta_text), primary_cta_url: text(input.primary_cta_link || input.primary_cta_url), secondary_cta_text: text(input.secondary_cta_text), secondary_cta_url: text(input.secondary_cta_link || input.secondary_cta_url), image_id: nullableUuid(input.image_id, 'Hero media ID') });
    if (section_key === 'positioning') row.content = text(input.positioning_statement);
    if (section_key === 'why_abkab') row.content = [text(input.why_heading), text(input.why_description)].filter(Boolean).join('\n');
    if (section_key === 'process') row.content = [text(input.process_heading), text(input.process_description)].filter(Boolean).join('\n');
    if (section_key === 'final_cta') row.content = [text(input.final_cta_heading), text(input.final_cta_description)].filter(Boolean).join('\n');
    return row;
  });
}
function mediaView(row) { return { ...row, src: row.public_url || '', type: row.media_type, section: (row.section_key || row.category || 'general').toUpperCase(), status: row.is_active ? 'PUBLISHED' : 'DRAFT' }; }
function cmsView(resource, row) {
  if (resource === 'media') return mediaView(row);
  if (resource === 'portfolio') return { ...row, featured: row.is_featured, status: row.is_published ? 'PUBLISHED' : 'DRAFT' };
  if (resource === 'services' || resource === 'settings') return { ...row, status: row.is_published ? 'PUBLISHED' : 'DRAFT' };
  return row;
}
function cleanData(key, input) {
  const data = { ...input }; delete data.resource; delete data.type; delete data.created_at; delete data.updated_at;
  if (key === 'media') {
    if (data.src && /^data:/i.test(data.src)) { if (!imageDataPattern.test(data.src) || data.src.length > maxDataUrlLength) throw new Error('Upload a JPG, PNG or WEBP image smaller than 5 MB.'); }
    else if (data.src !== undefined) safeUrl(data.src);
  }
  ['name','category','description','title','alt_text','project_url','section','slug','image'].forEach((field) => { if (data[field] !== undefined) data[field] = text(data[field], 5000); });
  if (data.project_url) data.project_url = safeUrl(data.project_url);
  if (data.cover_image) data.cover_image = safeUrl(data.cover_image);
  ['image_id', 'media_id', 'cover_media_id', 'additional_media_id'].forEach((field) => {
    if (data[field] !== undefined) data[field] = nullableUuid(data[field], field);
  });
  if (data.status !== undefined) data.status = status(data.status);
  if (data.display_order !== undefined) data.display_order = Math.max(0, Math.min(9999, Number(data.display_order) || 0));
  return data;
}
async function uploadDataUrl(dataUrl, category, title) {
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (!match) throw new Error('Only JPG, PNG and WEBP image uploads are supported.');
  const extension = match[1].toLowerCase().replace('jpeg', 'jpg');
  const safeName = text(title || 'image', 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'image';
  const path = `${text(category || 'general', 20).toLowerCase()}/${Date.now()}-${safeName}.${extension}`;
  const binary = Buffer.from(match[2], 'base64');
  const response = await fetch(`${env('SUPABASE_URL')}/storage/v1/object/abkab-media/${path}`, { method: 'POST', headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`, 'content-type': `image/${match[1].toLowerCase()}`, 'x-upsert': 'false' }, body: binary });
  if (!response.ok) throw new Error('Media storage upload failed.');
  return { path, url: `${env('SUPABASE_URL')}/storage/v1/object/public/abkab-media/${path}`, fileName: `${safeName}.${extension}`, mediaType: 'image' };
}
async function deleteStoredObject(path) {
  if (!path || /^https?:\/\//i.test(path) === false && path.indexOf('/') === -1) return;
  const response = await fetch(`${env('SUPABASE_URL')}/storage/v1/object/abkab-media/${path.replace(/^.*abkab-media\//, '')}`, { method: 'DELETE', headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}` } });
  if (!response.ok && response.status !== 404) throw new Error('Media storage delete failed.');
}

module.exports = async function handler(req, res) {
  try {
    if (!await requireAdmin(req)) return sendJson(res, 401, { error: 'Authentication required.' });
    const input = req.method === 'GET' ? (req.query || {}) : (body(req) || {});
    const resource = text(input.resource || input.type, 30).toLowerCase();
    if (resource === 'homepage') {
      const rows = await supabase('homepage_content?select=*&order=section_key.asc', { method: 'GET', operation: 'list homepage sections' });
      if (req.method === 'GET') return sendJson(res, 200, { items: rows.length ? [publicHomepage(rows)] : [] });
      if (!['POST', 'PATCH'].includes(req.method)) return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, PATCH' });
      const rowsToSave = homepageRows(input);
      const saved = await supabase('homepage_content?on_conflict=section_key&select=*', { method: 'POST', headers: { 'content-type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(rowsToSave), operation: 'save homepage sections' });
      return sendJson(res, 200, { item: publicHomepage(saved) });
    }
    if (!tables[resource]) return sendJson(res, 400, { error: 'Unknown CMS resource.' });
    const table = tables[resource];
    if (req.method === 'GET') {
      const ordering = ['media', 'portfolio', 'services'].includes(resource) ? 'display_order.asc,created_at.desc' : 'created_at.desc';
      const rows = await supabase(`${table}?select=*&order=${ordering}`, { method: 'GET', operation: `list ${resource}` });
      return sendJson(res, 200, { items: rows.map(function (row) { return cmsView(resource, row); }) });
    }
    if (req.method === 'DELETE') {
      const id = text(input.id, 80); if (!id) return sendJson(res, 400, { error: 'Missing item id.' });
      if (!isUuid(id)) return sendJson(res, 400, { error: 'Invalid item identifier.' });
      if (resource === 'media') { const existing = await supabase(`${table}?id=eq.${encodeURIComponent(id)}&select=storage_path`, { method: 'GET', operation: 'read media before delete' }); if (existing[0]) await deleteStoredObject(existing[0].storage_path); }
      await supabase(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', operation: `delete ${resource}` });
      return sendJson(res, 200, { ok: true });
    }
    if (!['POST', 'PATCH'].includes(req.method)) return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, PATCH, DELETE' });
    const data = cleanData(resource, input);
    if (resource === 'media' && data.src && /^data:/i.test(data.src)) {
      const stored = await uploadDataUrl(data.src, data.section || data.category, data.title);
      data.file_name = stored.fileName; data.storage_path = stored.path; data.public_url = stored.url; data.media_type = stored.mediaType; data.category = text(data.category || 'general', 20).toLowerCase(); data.section_key = text(data.section || '', 80).toLowerCase() || null; data.is_active = status(data.status); delete data.src; delete data.type; delete data.section; delete data.status;
    } else if (resource === 'media') {
      data.file_name = data.file_name || text(data.src.split('/').pop() || 'image', 255); data.storage_path = data.storage_path || data.src; data.public_url = data.public_url || data.src; data.media_type = data.media_type || data.type || 'image'; data.category = text(data.category || 'general', 20).toLowerCase(); data.section_key = text(data.section || '', 80).toLowerCase() || null; data.is_active = status(data.status); delete data.src; delete data.type; delete data.section; delete data.status;
    }
    if (resource === 'portfolio') { data.is_featured = Boolean(data.featured); data.is_published = status(data.status); delete data.featured; delete data.status; }
    if (resource === 'services' || resource === 'settings') { data.is_published = status(data.status); delete data.status; }
    if (req.method === 'PATCH') { const id = text(input.id, 80); if (!id) return sendJson(res, 400, { error: 'Missing item id.' }); if (!isUuid(id)) return sendJson(res, 400, { error: 'Invalid item identifier.' }); data.updated_at = new Date().toISOString(); const rows = await supabase(`${table}?id=eq.${encodeURIComponent(id)}&select=*`, { method: 'PATCH', headers: { 'content-type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(data), operation: `update ${resource}` }); return rows.length ? sendJson(res, 200, { item: cmsView(resource, rows[0]) }) : sendJson(res, 404, { error: 'Item not found.' }); }
    const rows = await supabase(`${table}?select=*`, { method: 'POST', headers: { 'content-type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(data), operation: `create ${resource}` });
    return sendJson(res, 201, { item: cmsView(resource, rows[0]) });
  } catch (error) {
    console.error('Admin CMS API failed', { operation: error.operation || 'cms', message: error.message, code: error.code || null });
    return sendJson(res, error.status >= 400 && error.status < 600 ? error.status : 500, { error: error.message || 'CMS service is temporarily unavailable.' });
  }
};
