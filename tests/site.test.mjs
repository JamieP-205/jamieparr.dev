// Builds the whole site once, then checks what would actually be sent to a visitor.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import matter from 'gray-matter';
import yaml from 'js-yaml';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, '.cloudflare/output/v0/workers/default/assets');
const gzip = (file) => zlib.gzipSync(fs.readFileSync(file)).length;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

let pages = [];
before(() => {
  const build = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'live'], { cwd: root, encoding: 'utf8', timeout: 120_000 });
  assert.equal(build.status, 0, build.stderr || build.stdout);
  pages = walk(out).filter((f) => f.endsWith('.html')).map((file) => ({ file, url: '/' + path.relative(out, file).replaceAll('\\', '/').replace(/index\.html$/, ''), html: fs.readFileSync(file, 'utf8') }));
});

test('every project has a page, alongside the homepage, the colophon and the 404', () => {
  const urls = pages.map((p) => p.url).sort();
  const projects = fs.readdirSync(path.join(root, 'content/projects')).map((f) => `/projects/${f.replace(/\.md$/, '')}/`);
  assert.deepEqual(urls, ['/', '/404.html', '/colophon/', ...projects].sort());
});

test('each page has one h1, a title, a description and a language', () => {
  for (const { url, html } of pages) {
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, `${url} should have exactly one h1`);
    assert.match(html, /<html lang="en-GB">/, url);
    assert.match(html, /<title>[^<]{10,}<\/title>/, url);
    if (url !== '/404.html') assert.match(html, /<meta name="description" content="[^"]{40,}">/, url);
  }
});

test('every image says what it shows and how big it is', () => {
  for (const { url, html } of pages) for (const [img] of html.matchAll(/<img\b[^>]*>/g)) {
    assert.match(img, /\salt="/, `${url}: ${img}`);
    assert.match(img, /\swidth="\d+"/, `${url}: ${img}`);
    assert.match(img, /\sheight="\d+"/, `${url}: ${img}`);
  }
});

test('no internal link or file reference points at nothing', () => {
  const ids = new Map(pages.map((p) => [p.url, new Set([...p.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
  for (const { url, html } of pages) for (const [, ref] of html.matchAll(/\s(?:href|src)="(\/[^"]*|#[^"]*)"/g)) {
    const [target, hash] = ref.split('#');
    const clean = (target || url).split('?')[0];
    if (clean.startsWith('/api/')) continue;
    const file = path.join(out, clean.endsWith('/') ? `${clean}index.html` : clean);
    assert.ok(fs.existsSync(file), `${url} links to ${ref}, which was not built`);
    if (hash && ids.has(clean)) assert.ok(ids.get(clean).has(hash), `${url} links to ${ref}, but that page has no #${hash}`);
  }
});

test('nothing is loaded from another site except the visitor counter', () => {
  for (const { url, html } of pages) for (const [, host] of html.matchAll(/<(?:script|img|source|video|iframe|link rel="(?:stylesheet|preload|modulepreload|icon)")\b[^>]*\s(?:src|href|srcset)="https?:\/\/([^/"]+)/g)) {
    assert.equal(host, 'static.cloudflareinsights.com', `${url} loads from ${host}`);
  }
});

// Budgets, compressed. Roughly a third above today's sizes: room to grow, not room to stop caring.
test('a first visit stays small', () => {
  const assets = fs.readdirSync(path.join(out, 'assets'));
  const one = (pattern) => path.join(out, 'assets', assets.find((f) => pattern.test(f)));
  const sizes = { html: gzip(path.join(out, 'index.html')), css: gzip(one(/^main-.*\.css$/)), js: gzip(one(/^main-.*\.js$/)) };
  assert.ok(sizes.html < 16_000, `homepage HTML is ${sizes.html} bytes compressed`);
  assert.ok(sizes.css < 14_000, `stylesheet is ${sizes.css} bytes compressed`);
  assert.ok(sizes.js < 4_000, `script is ${sizes.js} bytes compressed`);
  const font = fs.statSync(one(/^bricolage-grotesque-latin-wdth-normal.*\.woff2$/)).size;
  assert.ok(font < 90_000, `main font is ${font} bytes`);
});

test('the main font is preloaded on every page so headings do not change face after first paint', () => {
  for (const { url, html } of pages) assert.match(html, /<link rel="preload" as="font" type="font\/woff2" href="\/assets\/bricolage-grotesque-latin-wdth-normal[^"]+" crossorigin>/, url);
});

test('the editor has a field for every content key', () => {
  const config = yaml.load(fs.readFileSync(path.join(root, 'cms/config.yml'), 'utf8'));
  const names = (fields) => new Set(fields.map((f) => f.name));
  const projectFields = names(config.collections.find((c) => c.name === 'projects').fields);
  const files = config.collections.find((c) => c.name === 'pages').files;
  const missing = [];
  const check = (where, keys, fields) => { for (const k of keys) if (!fields.has(k)) missing.push(`${where}: ${k}`); };

  const dir = path.join(root, 'content/projects');
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    check(`projects/${f}`, Object.keys(matter(fs.readFileSync(path.join(dir, f), 'utf8')).data), projectFields);
  }
  for (const name of ['site', 'cv']) {
    const entry = files.find((e) => e.name === name);
    const data = JSON.parse(fs.readFileSync(path.join(root, entry.file), 'utf8'));
    check(entry.file, Object.keys(data), names(entry.fields));
  }
  assert.deepEqual(missing, [], `content keys with no field in cms/config.yml: ${missing.join(', ')}`);
});
