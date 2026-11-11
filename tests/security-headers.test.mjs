import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { loadContent, renderBody, renderProjectPage, renderColophon, SPECULATION_RULES } from '../src/render.mjs';

const headers = fs.readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const csp = headers.split('\n').find((line) => line.includes('Content-Security-Policy'));

// The Content-Security-Policy has no 'unsafe-inline', so the HTML must not rely on inline styles or handlers.
test('the CSP allows no inline or eval code', () => {
  assert.ok(csp);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
});
test('rendered pages have no style attributes or inline event handlers', () => {
  const data = loadContent();
  const pages = [renderBody(data), renderColophon(data), ...data.projects.map((p) => renderProjectPage(p, data))];
  for (const html of pages) {
    assert.doesNotMatch(html, /\sstyle\s*=/i);
    assert.doesNotMatch(html, /<[^>]+\son[a-z]+\s*=/i);
  }
});
// The prefetch rules are the one inline block that runs, so the policy names them by hash. Edit the rules and this fails until the hash is updated.
test('the hash in the CSP matches the speculation rules that are sent', () => {
  const hash = crypto.createHash('sha256').update(SPECULATION_RULES).digest('base64');
  assert.ok(csp.includes(`'sha256-${hash}'`), `public/_headers should allow 'sha256-${hash}' in script-src`);
  assert.doesNotThrow(() => JSON.parse(SPECULATION_RULES));
});
test('security.txt has the two fields RFC 9116 requires, and has not expired', () => {
  const txt = fs.readFileSync(new URL('../public/.well-known/security.txt', import.meta.url), 'utf8');
  assert.match(txt, /^Contact: mailto:\S+@\S+$/m);
  const expires = new Date(txt.match(/^Expires: (\S+)$/m)[1]);
  assert.ok(expires > new Date(), 'security.txt has expired: set a new Expires date');
});
