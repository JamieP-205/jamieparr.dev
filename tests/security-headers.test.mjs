import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadContent, renderBody, renderProjectPage } from '../src/render.mjs';

// The Content-Security-Policy has no 'unsafe-inline', so the HTML must not rely on inline styles or handlers.
test('the CSP allows no inline or eval code', () => {
  const headers = fs.readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  const csp = headers.split('\n').find((line) => line.includes('Content-Security-Policy'));
  assert.ok(csp);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
});
test('rendered pages have no style attributes or inline event handlers', () => {
  const data = loadContent();
  const pages = [renderBody(data), ...data.projects.map((p) => renderProjectPage(p, data))];
  for (const html of pages) {
    assert.doesNotMatch(html, /\sstyle\s*=/i);
    assert.doesNotMatch(html, /<[^>]+\son[a-z]+\s*=/i);
  }
});
