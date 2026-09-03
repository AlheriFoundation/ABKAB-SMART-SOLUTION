const { sendJson, supabase, normalizeStatus } = require('../lib/request-backend');

function text(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength || 5000);
}

function detailsLookup(details, candidates) {
  if (!details || typeof details !== 'object') return '';
  const map = {};
  Object.keys(details).forEach((key) => {
    map[key.toLowerCase().trim()] = details[key];
  });
  for (const candidate of candidates) {
    const exact = details[candidate];
    if (typeof exact === 'string' && exact.trim()) return exact.trim();
    const normalized = map[candidate.toLowerCase().trim()];
    if (typeof normalized === 'string' && normalized.trim()) return normalized.trim();
  }
  return '';
}

function requestPayload(input) {
  const details = input.requestDetails && typeof input.requestDetails === 'object' && !Array.isArray(input.requestDetails) ? input.requestDetails : {};
  const customerName = text(input.customerName || input.fullName || detailsLookup(details, ['Full Name', 'Customer Name', 'Name', 'Request Name']), 160);
  const phone = text(input.phone || input.phoneNumber || detailsLookup(details, ['Phone', 'Phone Number', 'Phone / WhatsApp', 'WhatsApp Number']), 40);
  const email = text(input.email || input.emailAddress || detailsLookup(details, ['Email', 'Email Address']), 254).toLowerCase();
  const preferredContactMethod = text(input.preferredContactMethod || input.contactMethod || detailsLookup(details, ['Preferred Contact Method', 'Contact Method']), 40);
  const serviceRequested = text(input.serviceRequested || input.serviceType || detailsLookup(details, ['Service Requested', 'Service', 'Service Type', 'Requested Service']), 160);
  const serviceCategory = text(input.serviceCategory || detailsLookup(details, ['Service Category', 'Service Key', 'Category']), 120) || serviceRequested;
  const description = text(input.description || detailsLookup(details, ['Description', 'Additional Information', 'Additional Notes', 'Project Description', 'Message', 'Problem Description', 'Current Problem', 'What do you need?']), 5000);
  const location = text(input.location || detailsLookup(details, ['Location']), 200);
  const address = text(input.address || detailsLookup(details, ['Address', 'Residential Address', 'Business Address']), 220);
  const state = text(input.state || detailsLookup(details, ['State', 'Business State']), 120);
  const lga = text(input.lga || detailsLookup(details, ['LGA', 'Local Government Area', 'Business LGA']), 120);
  const requestDetails = { ...details };
  if (!requestDetails['Full Name'] && customerName) requestDetails['Full Name'] = customerName;
  if (!requestDetails['Phone Number'] && phone) requestDetails['Phone Number'] = phone;
  if (!requestDetails['Email Address'] && email) requestDetails['Email Address'] = email;
  if (!requestDetails['Preferred Contact Method'] && preferredContactMethod) requestDetails['Preferred Contact Method'] = preferredContactMethod;
  if (!requestDetails['Service Requested'] && serviceRequested) requestDetails['Service Requested'] = serviceRequested;
  if (!requestDetails['Service Category'] && serviceCategory) requestDetails['Service Category'] = serviceCategory;
  if (!requestDetails['Description'] && description) requestDetails['Description'] = description;
  if (!requestDetails['Address'] && address) requestDetails['Address'] = address;
  if (!requestDetails['State'] && state) requestDetails['State'] = state;
  if (!requestDetails['LGA'] && lga) requestDetails['LGA'] = lga;
  if (!requestDetails['Location'] && location) requestDetails['Location'] = location;

  return {
    requestDetails,
    customerName,
    phone,
    email,
    preferredContactMethod,
    serviceRequested,
    serviceCategory,
    description,
    location,
    address,
    state,
    lga
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  try {
    const input = req.body || {};
    if (!input.requestDetails || typeof input.requestDetails !== 'object' || Array.isArray(input.requestDetails)) return sendJson(res, 400, { error: 'Please complete all required fields.' });
    const payload = requestPayload(input);
    const required = [payload.customerName, payload.phone, payload.email, payload.preferredContactMethod, payload.serviceRequested];
    if (required.some((value) => !value)) return sendJson(res, 400, { error: 'Please complete all required fields.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return sendJson(res, 400, { error: 'Please enter a valid email address.' });
    if (!/^\+?[0-9\s().-]{7,25}$/.test(payload.phone)) return sendJson(res, 400, { error: 'Please enter a valid phone number.' });

    const trackingNumber = await supabase('rpc/generate_tracking_number', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
      operation: 'generate tracking number'
    });
    if (!trackingNumber || typeof trackingNumber !== 'string') return sendJson(res, 500, { error: 'Tracking number generation failed.' });

    const record = {
      request_id: trackingNumber,
      service_type: payload.serviceRequested,
      service_category: payload.serviceCategory || payload.serviceRequested,
      customer_name: payload.customerName,
      phone: payload.phone,
      email: payload.email,
      preferred_contact_method: payload.preferredContactMethod,
      location: payload.location,
      description: payload.description,
      address: payload.address,
      state: payload.state,
      lga: payload.lga,
      request_details: payload.requestDetails,
      status: normalizeStatus('PENDING'),
      admin_notes: '',
      customer_note: ''
    };

    const saved = await supabase('requests?select=*', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(record),
      operation: 'save request'
    });
    const row = Array.isArray(saved) ? saved[0] : null;
    if (!row) return sendJson(res, 500, { error: 'We could not save your request. Please try again.' });

    if (process.env.FORMSUBMIT_ENDPOINT) {
      fetch(process.env.FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...record,
          request_id: row.request_id,
          _subject: `New request ${row.request_id} - ABKAB Smart Solution`,
          _template: 'table'
        })
      }).catch(() => {});
    }

    return sendJson(res, 201, {
      trackingNumber: row.request_id,
      requestId: row.request_id,
      customerName: row.customer_name,
      serviceRequested: row.service_type,
      serviceCategory: row.service_category || row.service_type,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customerNote: row.customer_note || ''
    });
  } catch (error) {
    console.error(error);
    if (error.code === '23514' || /request_id|check constraint/i.test(error.message || '')) return sendJson(res, 503, { error: 'The request system needs its database migration applied before submissions can be saved.' });
    return sendJson(res, 500, { error: 'We could not save your request. Please try again.' });
  }
};
