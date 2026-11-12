import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../src/worker.js';
import { DEMOS, demoFor, ping, handleWake } from '../src/demos.mjs';

const wake = (query = '?demo=nexusdesk', init = {}) => new Request(`https://jamieparr.dev/api/wake${query}`, {
  method: 'POST', headers: { origin: 'https://jamieparr.dev' }, ...init,
});
const context = () => { const kept = []; return { kept, waitUntil: (p) => kept.push(p) }; };
const instant = (calls = []) => async (url) => { calls.push(url); return new Response('ok'); };
const never = (calls = []) => (url) => { calls.push(url); return new Promise(() => {}); };

test('every demo linked from a project is one the site keeps awake', () => {
  const linked = fs.readdirSync('content/projects').flatMap((f) => fs.readFileSync(`content/projects/${f}`, 'utf8').match(/https:\/\/[a-z0-9-]+\.onrender\.com/g) || []);
  assert.ok(linked.length >= 2);
  for (const url of linked) assert.ok(demoFor(url), `${url} is not in DEMOS`);
  assert.equal(demoFor('https://example.com/'), undefined);
});

test('an awake demo is reported as awake', async () => {
  const calls = [];
  const ctx = context();
  const response = await handleWake(wake(), ctx, { fetcher: instant(calls) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { awake: true });
  assert.deepEqual(calls, [`${DEMOS.nexusdesk}/login`]);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('a sleeping demo is reported quickly and its request is kept running', async () => {
  const ctx = context();
  const response = await handleWake(wake('?demo=coast-requests'), ctx, { fetcher: never(), wait: 20 });
  assert.deepEqual(await response.json(), { awake: false });
  assert.equal(ctx.kept.length, 1);
});

test('a demo that errors or cannot be reached is not called awake', async () => {
  assert.equal(await ping('nexusdesk', { fetcher: async () => new Response('', { status: 502 }) }).answered, false);
  assert.equal(await ping('nexusdesk', { fetcher: async () => { throw new TypeError('network'); } }).answered, false);
});

test('wake refuses other sites, other methods and unknown demos without contacting anything', async () => {
  const calls = [];
  const options = { fetcher: instant(calls) };
  assert.equal((await handleWake(wake('?demo=nexusdesk', { headers: { origin: 'https://example.com' } }), context(), options)).status, 403);
  assert.equal((await handleWake(wake('?demo=nexusdesk', { headers: {} }), context(), options)).status, 403);
  assert.equal((await handleWake(wake('?demo=nexusdesk', { method: 'GET' }), context(), options)).status, 405);
  assert.equal((await handleWake(wake('?demo=https://example.com'), context(), options)).status, 404);
  assert.equal((await handleWake(wake('?demo=constructor'), context(), options)).status, 404);
  assert.equal((await handleWake(wake(''), context(), options)).status, 404);
  assert.deepEqual(calls, []);
});

test('the worker routes /api/wake', async () => {
  assert.equal((await worker.fetch(wake('?demo=nope'), {}, context())).status, 404);
});

test('the page wakes the demos at most every 9 minutes, only while on screen, and stops after an hour', () => {
  const page = fs.readFileSync('src/demo.js', 'utf8');
  assert.match(page, /EVERY = 9 \* 60_000/);
  assert.match(page, /LONGEST = 60 \* 60_000/);
  assert.match(page, /visibilityState !== 'visible' \|\| performance\.now\(\) > LONGEST/);
});
