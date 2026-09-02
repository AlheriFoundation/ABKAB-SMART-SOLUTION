const { sendJson, sessionCookie } = require('../lib/request-backend');

module.exports = function handler(req, res) {
  res.setHeader('Set-Cookie', sessionCookie('', 0));
  return sendJson(res, 200, { ok: true });
};