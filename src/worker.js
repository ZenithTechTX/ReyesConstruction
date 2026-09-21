/**
 * Reyes Construction - contact form backend.
 *
 * The site itself is static assets. Only /api/* runs this Worker (see run_worker_first in
 * wrangler.jsonc). POST /api/contact validates the form and emails it to TO_EMAIL through the
 * Cloudflare Email Service binding (EMAIL). Setup notes are in wrangler.jsonc.
 */

const SERVICES = ['Remodeling', 'Roofing', 'Painting', 'Sheetrock', 'AC', 'Tile', 'Something else'];
const MAX_BODY_BYTES = 16 * 1024;
const LIMITS = { name: 100, phone: 40, email: 254, message: 4000 };

/** @param {unknown} body @param {number} [status] @param {HeadersInit} [headers] */
function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

/** Read and parse a JSON body, refusing anything larger than MAX_BODY_BYTES. Returns null if invalid. */
async function readJson(request) {
  const declared = Number(request.headers.get('Content-Length'));
  if (declared > MAX_BODY_BYTES || !request.body) return null;

  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  try {
    const text = new TextDecoder().decode(await new Blob(chunks).arrayBuffer());
    const data = JSON.parse(text);
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

/** Single-line field: strip control characters (blocks header injection) and trim. */
const oneLine = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
/** Multi-line field: keep newlines and tabs, drop other control characters. */
const multiLine = (v) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** @returns {{ ok: true, value: object } | { ok: false, error: string }} */
function validate(data) {
  const value = {
    name: oneLine(data.name),
    phone: oneLine(data.phone),
    email: oneLine(data.email),
    service: oneLine(data.service),
    message: multiLine(data.message),
  };

  if (!value.name || !value.message) return { ok: false, error: 'Please fill in your name and a short message.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (!SERVICES.includes(value.service)) return { ok: false, error: 'Please choose a service.' };
  for (const [field, max] of Object.entries(LIMITS)) {
    if (value[field].length > max) return { ok: false, error: `Your ${field} is too long.` };
  }
  return { ok: true, value };
}

function buildEmail({ name, phone, email, service, message }) {
  const text = [
    `Name: ${name}`,
    `Phone: ${phone || '-'}`,
    `Email: ${email}`,
    `Service: ${service}`,
    '',
    message,
    '',
    '-- Sent from the Reyes Construction website. Reply to this email to answer the customer.',
  ].join('\n');

  const row = (label, val) =>
    `<tr><td style="padding:4px 16px 4px 0;color:#666">${label}</td><td style="padding:4px 0"><strong>${val}</strong></td></tr>`;
  const html = [
    '<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">',
    '<h2 style="margin:0 0 12px">New free estimate request</h2>',
    '<table style="border-collapse:collapse">',
    row('Name', escapeHtml(name)),
    row('Phone', escapeHtml(phone || '-')),
    row('Email', `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`),
    row('Service', escapeHtml(service)),
    '</table>',
    `<p style="white-space:pre-wrap;margin:16px 0 0">${escapeHtml(message)}</p>`,
    '<p style="color:#888;font-size:12px;margin-top:24px">Sent from the Reyes Construction website. Reply to this email to answer the customer.</p>',
    '</div>',
  ].join('');

  return { subject: `Free estimate request: ${service} - ${name}`, text, html };
}

export default {
  /** @param {Request} request @param {{ EMAIL: SendEmail, TO_EMAIL: string, FROM_EMAIL: string }} env */
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== '/api/contact') return json({ ok: false, error: 'Not found' }, 404);
    if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405, { Allow: 'POST' });

    // Browsers always send Origin on cross-site POSTs; refuse anything not from this site.
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ ok: false, error: 'Forbidden' }, 403);

    const data = await readJson(request);
    if (!data) return json({ ok: false, error: 'Invalid request.' }, 400);

    // Honeypot: real visitors never see or fill this field. Pretend success so bots move on.
    if (oneLine(data.website)) return json({ ok: true });

    const result = validate(data);
    if (!result.ok) return json({ ok: false, error: result.error }, 422);

    const { subject, text, html } = buildEmail(result.value);
    try {
      await env.EMAIL.send({
        to: env.TO_EMAIL,
        from: { email: env.FROM_EMAIL, name: 'Reyes Construction Website' },
        replyTo: result.value.email,
        subject,
        text,
        html,
      });
    } catch (err) {
      console.error(JSON.stringify({ msg: 'contact email failed', code: err?.code, error: err?.message }));
      return json({ ok: false, error: 'Could not send your request right now.' }, 502);
    }

    return json({ ok: true });
  },
};
