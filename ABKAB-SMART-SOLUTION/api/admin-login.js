const { env, sendJson, body, sessionCookie } = require('../lib/request-backend');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  try {
    const input = body(req);
    if (!input) return sendJson(res, 400, { error: 'Request body must be valid JSON.' });
    const { email, password } = input;
    if (!email || !password) return sendJson(res, 400, { error: 'Email and password are required.' });
    const response = await fetch(`${env('SUPABASE_URL')}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: env('SUPABASE_ANON_KEY'), 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!response.ok) return sendJson(res, 401, { error: 'Invalid admin credentials.' });
    const auth = await response.json();
    res.setHeader('Set-Cookie', sessionCookie(auth.access_token, auth.expires_in || 3600));
    return sendJson(res, 200, { ok: true });
  } catch (error) { console.error(error); return sendJson(res, 500, { error: 'Login is temporarily unavailable.' }); }
};