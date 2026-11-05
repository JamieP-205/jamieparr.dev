const RECIPIENT = 'jamieparr205@gmail.com';
const ORIGINS = new Set(['https://jamieparr.dev', 'https://www.jamieparr.dev']);
const MAX_BYTES = 16_384;

const reply = (status, body, headers = {}) => Response.json(body, {
  status,
  headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers },
});

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_BYTES) throw new RangeError();
  if (!request.body) throw new SyntaxError();
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new RangeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function handleContact(request, env) {
  if (request.method !== 'POST') return reply(405, { error: 'Use the contact form to send a message.' }, { allow: 'POST' });
  if (!ORIGINS.has(request.headers.get('origin'))) return reply(403, { error: 'Please send your message from jamieparr.dev.' });
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return reply(415, { error: 'Please use the contact form.' });
  }

  let data;
  try { data = await readBody(request); }
  catch (error) {
    return reply(error instanceof RangeError ? 413 : 400, { error: 'The message could not be read. Please keep it under 5,000 characters.' });
  }
  if (!data || Array.isArray(data) || typeof data !== 'object') return reply(400, { error: 'Please complete the contact form.' });
  // Hidden field: bots filling every input do not generate an email.
  if (typeof data.website === 'string' && data.website.trim()) return reply(200, { ok: true });
  const { name, email, message } = data;
  const oneLine = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/u.test(value);
  if (!oneLine(name, 100)) return reply(400, { error: 'Enter your name using at most 100 characters.' });
  if (!oneLine(email, 254) || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(email.trim())) {
    return reply(400, { error: 'Enter a valid email address so I can reply.' });
  }
  if (typeof message !== 'string' || !message.trim() || message.length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(message)) {
    return reply(400, { error: 'Enter a message of up to 5,000 characters.' });
  }

  try {
    // Cloudflare supplies this header. It is used for throttling, never included in email or logs.
    const key = request.headers.get('cf-connecting-ip') || 'unknown';
    const { success } = await env.CONTACT_LIMIT.limit({ key });
    if (!success) return reply(429, { error: 'Please wait a minute before sending another message.' }, { 'retry-after': '60' });
    await env.CONTACT_EMAIL.send({
      from: { email: 'contact@jamieparr.dev', name: 'Jamie Parr portfolio' },
      to: RECIPIENT,
      replyTo: email.trim(),
      subject: `Portfolio enquiry from ${name.trim()}`,
      text: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}\n\nSent through the contact form at https://jamieparr.dev.`,
    });
    return reply(200, { ok: true });
  } catch (error) {
    // Record the provider error category, never the submitted message or address.
    console.error('Portfolio contact delivery failed.', {
      type: error?.name,
      code: error?.code,
      message: String(error?.message || 'Unknown delivery error').replace(/[^\s<>]+@[^\s<>]+/g, '[email]').slice(0, 300),
    });
    return reply(503, { error: `Your message could not be sent. Please try later or email ${RECIPIENT} directly.` });
  }
}
