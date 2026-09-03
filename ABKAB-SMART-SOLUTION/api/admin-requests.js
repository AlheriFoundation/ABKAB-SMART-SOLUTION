const { sendJson, supabase, requireAdmin } = require('../lib/request-backend');
const statuses = ['NEW', 'UNDER_REVIEW', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'COMPLETED', 'CANCELLED'];

module.exports = async function handler(req, res) {
  try {
    if (!await requireAdmin(req)) return sendJson(res, 401, { error: 'Authentication required.' });
    if (req.method === 'GET') return sendJson(res, 200, { requests: await supabase('requests?select=*&order=created_at.desc', { method: 'GET', operation: 'list admin requests' }) });
    if (req.method !== 'PATCH') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, PATCH' });
    const input = req.body || {};
    const requestId = String(input.requestId || '').trim().toUpperCase();
    const status = String(input.status || '').trim();
    if (!/^ABKAB-\d{4}-[A-F0-9]{6}$/.test(requestId)) return sendJson(res, 400, { error: 'Invalid Request ID.' });
    if (!statuses.includes(status)) return sendJson(res, 400, { error: 'Invalid status.' });
    if (input.adminNotes !== undefined && typeof input.adminNotes !== 'string') return sendJson(res, 400, { error: 'Admin notes must be text.' });
    const rows = await supabase(`requests?request_id=eq.${encodeURIComponent(requestId)}&select=*`, { method: 'PATCH', operation: 'update admin request', headers: { 'content-type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ status, admin_notes: String(input.adminNotes || '').slice(0, 5000), updated_at: new Date().toISOString() }) });
    return rows.length ? sendJson(res, 200, { request: rows[0] }) : sendJson(res, 404, { error: 'Request not found.' });
  } catch (error) {
    const operation = error.operation || (req.method === 'PATCH' ? 'update admin request' : 'authorize/list admin requests');
    console.error('Admin request API failed', { operation, message: error.message, status: error.status || 500, responseBody: error.responseBody || null, code: error.code || null });
    return sendJson(res, error.code === 'CONFIGURATION_ERROR' ? 500 : (error.status >= 400 && error.status < 600 ? 502 : 500), { error: error.message });
  }
};