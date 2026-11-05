import test from 'node:test';
import assert from 'node:assert/strict';
import { handleContact } from '../src/contact.mjs';
import worker from '../src/worker.js';

const valid = { name: 'Test Visitor', email: 'visitor@example.com', message: 'A test enquiry.', website: '' };
const request = (data = valid, headers = {}) => new Request('https://jamieparr.dev/api/contact', {
  method: 'POST', headers: { origin: 'https://jamieparr.dev', 'content-type': 'application/json', ...headers },
  body: typeof data === 'string' ? data : JSON.stringify(data),
});
function environment() {
  const sent = [];
  return { sent, CONTACT_LIMIT: { limit: async () => ({ success: true }) }, CONTACT_EMAIL: { send: async message => { sent.push(message); } } };
}

test('sends to Jamie only, uses visitor as reply-to and preserves Unicode', async () => {
  const env = environment();
  const response = await handleContact(request({ ...valid, name: 'Zoë', message: 'Hello\nA second line.', to: 'other@example.com' }), env);
  assert.equal(response.status, 200);
  assert.equal(env.sent.length, 1);
  assert.equal(env.sent[0].to, 'jamieparr205@gmail.com');
  assert.equal(env.sent[0].replyTo, valid.email);
  assert.match(env.sent[0].text, /Hello\nA second line/);
  assert.match(env.sent[0].subject, /Zoë/);
});
test('only returns success after delivery binding resolves', async () => {
  const env = environment();
  let finish;
  env.CONTACT_EMAIL.send = () => new Promise(resolve => { finish = resolve; });
  let returned = false;
  const pending = handleContact(request(), env).then(value => { returned = true; return value; });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(returned, false);
  finish();
  assert.equal((await pending).status, 200);
});
test('rejects foreign origins, absent origin, wrong methods and wrong content types', async () => {
  const env = environment();
  assert.equal((await handleContact(request(valid, { origin: 'https://example.com' }), env)).status, 403);
  assert.equal((await handleContact(request(valid, { origin: '' }), env)).status, 403);
  assert.equal((await handleContact(new Request('https://jamieparr.dev/api/contact'), env)).status, 405);
  assert.equal((await handleContact(request(valid, { 'content-type': 'text/plain' }), env)).status, 415);
  assert.equal(env.sent.length, 0);
});
test('rejects malformed JSON, missing fields, header injection and oversized fields', async () => {
  const env = environment();
  for (const data of ['{', null, [], {}, { ...valid, name: 'A\r\nBcc: victim@example.com' }, { ...valid, email: 'a@b.com\nBcc:x@y.com' }, { ...valid, email: 'invalid' }, { ...valid, message: ' ' }, { ...valid, message: 'a'.repeat(5001) }]) {
    assert.equal((await handleContact(request(data), env)).status, 400);
  }
  assert.equal(env.sent.length, 0);
});
test('bounds the actual request stream even without a content-length header', async () => {
  const env = environment();
  assert.equal((await handleContact(request({ ...valid, padding: 'x'.repeat(17000) }), env)).status, 413);
  assert.equal(env.sent.length, 0);
});
test('honeypot does not send mail', async () => {
  const env = environment();
  assert.equal((await handleContact(request({ ...valid, website: 'spam.example' }), env)).status, 200);
  assert.equal(env.sent.length, 0);
});
test('rate limit prevents delivery and returns retry information', async () => {
  const env = environment();
  env.CONTACT_LIMIT.limit = async () => ({ success: false });
  const response = await handleContact(request(), env);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.equal(env.sent.length, 0);
});
test('delivery failure returns a safe error, never a success or provider details', async () => {
  const env = environment();
  env.CONTACT_EMAIL.send = async () => { throw new Error('private provider detail'); };
  const response = await handleContact(request(), env);
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private provider detail/);
});
test('missing configuration fails closed', async () => {
  assert.equal((await handleContact(request(), {})).status, 503);
});
test('non-API requests retain static asset handling and unknown API paths return 404', async () => {
  const env = { ASSETS: { fetch: async () => new Response('asset') } };
  assert.equal(await (await worker.fetch(new Request('https://jamieparr.dev/projects/coast-internet-radio/'), env)).text(), 'asset');
  assert.equal((await worker.fetch(new Request('https://jamieparr.dev/api/missing'), env)).status, 404);
});
