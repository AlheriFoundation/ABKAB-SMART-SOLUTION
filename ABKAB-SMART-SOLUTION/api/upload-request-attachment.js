const crypto = require('crypto');
const { env, sendJson, body } = require('../lib/request-backend');

const maxBytes = 3.5 * 1024 * 1024;
const allowed = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
function clean(value, max) { return String(value == null ? '' : value).trim().slice(0, max || 500); }
function safeName(value) { return clean(value, 120).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'attachment'; }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  try {
    const input = body(req);
    if (!input || typeof input.dataUrl !== 'string') return sendJson(res, 400, { error: 'Choose a file before uploading.' });
    const match = input.dataUrl.match(/^data:(image\/(?:jpeg|png)|application\/pdf);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) return sendJson(res, 400, { error: 'Only JPG, PNG and PDF files are supported.' });
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > maxBytes) return sendJson(res, 400, { error: 'Attachments must be smaller than 3.5 MB.' });
    const extension = match[1] === 'application/pdf' ? 'pdf' : match[1].split('/')[1].replace('jpeg', 'jpg');
    const fileName = safeName(input.fileName || `attachment.${extension}`);
    const path = `pending/${crypto.randomUUID()}/${fileName}`;
    const response = await fetch(`${env('SUPABASE_URL')}/storage/v1/object/abkab-request-attachments/${path}`, { method: 'POST', headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`, 'content-type': match[1], 'x-upsert': 'false' }, body: bytes });
    if (!response.ok) throw new Error('Attachment storage is temporarily unavailable.');
    return sendJson(res, 201, { attachment: { file_name: fileName, storage_path: path, media_type: match[1], file_size: bytes.length, uploaded_at: new Date().toISOString() } });
  } catch (error) {
    console.error('Request attachment upload failed', error.message);
    return sendJson(res, 500, { error: error.message || 'Attachment upload failed.' });
  }
};
