const crypto = require('crypto');

function env(name) {
	if (!process.env[name]) {
		const error = new Error(`Server configuration error: missing ${name}`);
		error.code = 'CONFIGURATION_ERROR';
		throw error;
	}
	return process.env[name];
}
function sendJson(res, status, body, headers) { res.status(status); if (headers) Object.entries(headers).forEach(([name, value]) => res.setHeader(name, value)); return res.json(body); }
function body(req) {
	if (!req.body) return {};
	if (typeof req.body === 'object') return req.body;
	try { return JSON.parse(req.body); } catch (_) { return null; }
}
function supabaseHeaders(extra) { return { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`, ...(extra || {}) }; }
async function supabase(path, options) {
	const operation = options && options.operation || 'Supabase request';
	const response = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, { ...options, headers: supabaseHeaders(options && options.headers) });
	const text = await response.text();
	let data;
	try { data = text ? JSON.parse(text) : null; } catch (_) { data = { error: text }; }
	if (!response.ok) {
		const message = data && (data.message || data.error || data.details || data.hint) || `Supabase returned HTTP ${response.status}`;
		const error = new Error(message);
		error.operation = operation;
		error.status = response.status;
		error.responseBody = text;
		error.code = data && data.code;
		throw error;
	}
	return data;
}
async function requireAdmin(req) { const match = (req.headers.cookie || '').match(/(?:^|;\s*)abkab_admin=([^;]+)/); if (!match) return null; const response = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: `Bearer ${decodeURIComponent(match[1])}` } }); if (!response.ok) return null; const user = await response.json(); return user && user.email && user.email.toLowerCase() === env('ADMIN_EMAIL').toLowerCase() ? user : null; }
function sessionCookie(token, maxAge) { return `abkab_admin=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`; }
function requestId() { return `ABKAB-${new Date().getUTCFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; }
function normalizeStatus(status) {
	const value = String(status || '').trim().toUpperCase();
	if (!value || value === 'NEW') return 'PENDING';
	if (value === 'IN_PROGRESS') return 'PROCESSING';
	if (value === 'WAITING_FOR_CUSTOMER') return 'UNDER_REVIEW';
	return value;
}
function trackingStatusLabel(status) {
	const value = normalizeStatus(status);
	return {
		PENDING: 'Pending',
		UNDER_REVIEW: 'Under Review',
		PROCESSING: 'Processing',
		APPROVED: 'Approved',
		COMPLETED: 'Completed',
		REJECTED: 'Rejected',
		CANCELLED: 'Cancelled'
	}[value] || value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}
module.exports = { env, sendJson, body, supabase, requireAdmin, sessionCookie, requestId, normalizeStatus, trackingStatusLabel };
