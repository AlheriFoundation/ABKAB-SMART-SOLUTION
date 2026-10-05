const { env, sendJson, body, requireAdmin } = require('../lib/request-backend');

module.exports = async function handler(req, res) {
  try {
    if (!await requireAdmin(req)) return sendJson(res, 401, { error: 'Authentication required.' });
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
    const input = body(req) || {};
    const path = String(input.path || '').trim();
    if (!path || path.includes('..') || !/^(pending|requests)\/[a-zA-Z0-9._/-]+$/.test(path)) return sendJson(res, 400, { error: 'Invalid attachment path.' });
    const response = await fetch(`${env('SUPABASE_URL')}/storage/v1/object/sign/abkab-request-attachments`, { method: 'POST', headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`, 'content-type': 'application/json' }, body: JSON.stringify({ paths: [path], expiresIn: 3600 }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return sendJson(res, 404, { error: 'Attachment is no longer available.' });
    const signed = Array.isArray(data) ? data[0] : data;
    const signedPath = signed && (signed.signedURL || signed.signedUrl || signed.url);
    return signedPath ? sendJson(res, 200, { url: signedPath.indexOf('http') === 0 ? signedPath : `${env('SUPABASE_URL')}${signedPath.indexOf('/storage/v1') === 0 ? signedPath : `/storage/v1${signedPath}`}` }) : sendJson(res, 404, { error: 'Attachment is no longer available.' });
  } catch (error) {
    console.error('Admin attachment URL failed', error.message);
    return sendJson(res, 500, { error: 'Attachment could not be opened.' });
  }
};
