const { sendJson, supabase } = require('../lib/request-backend');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  try {
    const input = req.body || {};
    const id = String(input.requestId || '').trim().toUpperCase();
    const email = String(input.email || '').trim().toLowerCase();
    if (!/^ABKAB-\d{4}-[A-F0-9]{6}$/.test(id) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'Enter a valid Request ID and email address.' });
    const rows = await supabase(`requests?request_id=eq.${encodeURIComponent(id)}&email=eq.${encodeURIComponent(email)}&select=request_id,service_type,status,created_at,updated_at`, { method: 'GET' });
    if (!rows.length) return sendJson(res, 404, { error: 'We could not find a request matching those details.' });
    return sendJson(res, 200, { request: rows[0] });
  } catch (error) { console.error(error); return sendJson(res, 500, { error: 'Tracking is temporarily unavailable.' }); }
};