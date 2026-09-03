const { sendJson, body, supabase, normalizeStatus } = require('../lib/request-backend');

function text(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength || 5000);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  try {
    const input = body(req);
    if (!input) return sendJson(res, 400, { error: 'Request body must be valid JSON.' });
    const trackingNumber = text(input.trackingNumber || input.requestId, 40).toUpperCase();
    const email = text(input.email, 254).toLowerCase();
    if (!email) return sendJson(res, 400, { error: 'Enter the email address used for this request.' });
    if (!/^ABKAB-\d{4}-\d{6}$/.test(trackingNumber)) return sendJson(res, 400, { error: 'Enter a valid tracking number.' });

    let path = `requests?request_id=eq.${encodeURIComponent(trackingNumber)}&select=request_id,customer_name,service_type,service_category,status,created_at,updated_at,customer_note`;
    if (email) path += `&email=eq.${encodeURIComponent(email)}`;

    const rows = await supabase(path, { method: 'GET', operation: 'track request' });
    if (!rows.length) return sendJson(res, 404, { error: 'We could not find a request matching that tracking number and email.' });

    const row = rows[0];
    return sendJson(res, 200, {
      request: {
        request_id: row.request_id,
        customer_name: row.customer_name,
        service_type: row.service_type,
        service_category: row.service_category || row.service_type,
        status: normalizeStatus(row.status),
        created_at: row.created_at,
        updated_at: row.updated_at,
        customer_note: row.customer_note || ''
      }
    });
  } catch (error) {
    console.error('Track request API failed', { operation: error.operation || 'track request', message: error.message, status: error.status || 500, responseBody: error.responseBody || null, code: error.code || null });
    return sendJson(res, 500, { error: 'Tracking is temporarily unavailable.' });
  }
};
