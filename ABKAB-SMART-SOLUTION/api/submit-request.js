const { sendJson, supabase, requestId } = require('../lib/request-backend');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  try {
    const input = req.body || {};
    const required = ['serviceType', 'customerName', 'phone', 'email', 'preferredContactMethod'];
    if (required.some((key) => typeof input[key] !== 'string' || !input[key].trim()) || !input.requestDetails || typeof input.requestDetails !== 'object') return sendJson(res, 400, { error: 'Please complete all required fields.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return sendJson(res, 400, { error: 'Please enter a valid email address.' });
    if (!/^\+?[0-9\s().-]{7,25}$/.test(input.phone.trim())) return sendJson(res, 400, { error: 'Please enter a valid phone number.' });
    const record = { request_id: requestId(), service_type: input.serviceType.trim().slice(0, 120), customer_name: input.customerName.trim().slice(0, 160), phone: input.phone.trim().slice(0, 40), email: input.email.trim().toLowerCase().slice(0, 254), preferred_contact_method: input.preferredContactMethod.trim().slice(0, 40), location: String(input.location || '').trim().slice(0, 200), request_details: input.requestDetails, status: 'NEW' };
    const saved = await supabase('requests', { method: 'POST', headers: { 'content-type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(record) });
    const row = saved[0];
    if (process.env.FORMSUBMIT_ENDPOINT) fetch(process.env.FORMSUBMIT_ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...record, 'Request ID': row.request_id, _subject: `New request ${row.request_id} - ABKAB Smart Solution`, _template: 'table' }) }).catch(() => {});
    return sendJson(res, 201, { requestId: row.request_id, status: row.status });
  } catch (error) { console.error(error); return sendJson(res, 500, { error: 'We could not save your request. Please try again.' }); }
};