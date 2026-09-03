const { sendJson, sessionCookie } = require('../lib/request-backend');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  res.setHeader('Set-Cookie', sessionCookie('', 0));
  return sendJson(res, 200, { ok: true });
};