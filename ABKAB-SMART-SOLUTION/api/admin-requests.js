const { sendJson, body, supabase, requireAdmin, normalizeStatus } = require('../lib/request-backend');

const statuses = ['PENDING', 'UNDER_REVIEW', 'PROCESSING', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

function text(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength || 5000);
}

function shapeRequest(row) {
  return {
    ...row,
    status: normalizeStatus(row.status),
    customer_note: row.customer_note || '',
    admin_notes: row.admin_notes || ''
  };
}

module.exports = async function handler(req, res) {
  try {
    if (!await requireAdmin(req)) return sendJson(res, 401, { error: 'Authentication required.' });
    if (req.method === 'GET') {
      const rows = await supabase('requests?select=*&order=created_at.desc', { method: 'GET', operation: 'list admin requests' });
      return sendJson(res, 200, { requests: rows.map(shapeRequest) });
    }
    if (req.method !== 'PATCH') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, PATCH' });

    const input = body(req);
    if (!input) return sendJson(res, 400, { error: 'Request body must be valid JSON.' });
    const requestId = text(input.requestId || input.trackingNumber, 40).toUpperCase();
    const status = normalizeStatus(input.status);
    if (input.adminNotes !== undefined && typeof input.adminNotes !== 'string') return sendJson(res, 400, { error: 'Admin notes must be text.' });
    if (input.customerNote !== undefined && typeof input.customerNote !== 'string') return sendJson(res, 400, { error: 'Customer note must be text.' });
    const adminNotes = input.adminNotes === undefined ? undefined : text(input.adminNotes, 5000);
    const customerNote = input.customerNote === undefined ? undefined : text(input.customerNote, 5000);

    if (!/^ABKAB-\d{4}-\d{6}$/.test(requestId)) return sendJson(res, 400, { error: 'Invalid tracking number.' });
    if (!statuses.includes(status)) return sendJson(res, 400, { error: 'Invalid status.' });
    const update = { status, updated_at: new Date().toISOString() };
    if (adminNotes !== undefined) update.admin_notes = adminNotes;
    if (customerNote !== undefined) update.customer_note = customerNote;

    const rows = await supabase(`requests?request_id=eq.${encodeURIComponent(requestId)}&select=*`, {
      method: 'PATCH',
      operation: 'update admin request',
      headers: { 'content-type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(update)
    });

    return rows.length ? sendJson(res, 200, { request: shapeRequest(rows[0]) }) : sendJson(res, 404, { error: 'Request not found.' });
  } catch (error) {
    const operation = error.operation || (req.method === 'PATCH' ? 'update admin request' : 'authorize/list admin requests');
    console.error('Admin request API failed', { operation, message: error.message, status: error.status || 500, responseBody: error.responseBody || null, code: error.code || null });
    return sendJson(res, error.code === 'CONFIGURATION_ERROR' ? 500 : (error.status >= 400 && error.status < 600 ? 502 : 500), { error: 'The admin request service is temporarily unavailable.' });
  }
};
