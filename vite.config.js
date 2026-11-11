import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { loadContent, renderBody, renderProjectPage, renderColophon, analyticsTag, speculationTag, projectUrl, absolute, topbar } from './src/render.mjs';

// Pre-renders every page from /content at build time, so visitors get plain HTML.
// `live` is true for `cf deploy --mode live` (public) and false for staging (noindex).
let live = false;

const DEV_ASSETS = '<script type="module" src="/src/main.js"></script>';

const content = () => ({
  name: 'content',
  config(_, env) { live = env.mode === 'live' || process.env.SITE_ENV === 'production'; },

  // index.html and 404.html go through here.
  transformIndexHtml(html) {
    const data = loadContent();
    const { site } = data;
    return html
      .replace('<!--noindex-->', live ? '' : '<meta name="robots" content="noindex, nofollow">')
      .replace('<!--speculation-->', speculationTag)
      .replace('<!--analytics-->', analyticsTag(site))
      .replace('<!--topbar-->', topbar(false, site))
      .replaceAll('%SITE_URL%', site.url.replace(/\/$/, ''))
      .replaceAll('%HEADLINE%', site.headline.replace(/"/g, '&quot;'))
      .replace('<!--app-->', renderBody(data));
  },

  configureServer(server) {
    // The editor (/admin) exists only on this machine, in dev. It's never built or deployed.
    server.middlewares.use('/admin', serveCms);
    // Project pages and the colophon, rendered on request in dev so edits show up immediately.
    server.middlewares.use(async (req, res, next) => {
      const pathname = (req.url || '').split('?')[0];
      const m = pathname.match(/^\/(?:projects\/([a-z0-9-]+)|(colophon))\/?$/);
      if (!m) return next();
      const data = loadContent();
      const p = m[1] && data.projects.find((x) => x.slug === m[1]);
      if (m[1] && !p) return next();
      if (!pathname.endsWith('/')) { res.statusCode = 301; res.setHeader('location', `${pathname}/`); return res.end(); }
      const opts = { assets: DEV_ASSETS, noindex: true };
      const html = await server.transformIndexHtml(req.url, p ? renderProjectPage(p, data, opts) : renderColophon(data, opts));
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(html);
    });
    server.watcher.add(path.resolve('content'));
    server.watcher.on('change', (f) => {
      if (f.includes(`${path.sep}content${path.sep}`)) server.ws.send({ type: 'full-reload' });
    });
  },
});

// The one font file every page needs straight away. Preloading it stops the big headings changing face after first paint.
const fontPreload = (bundle) => {
  const font = Object.keys(bundle).find((f) => /bricolage-grotesque-latin-wdth-normal.*\.woff2$/.test(f));
  return font ? `<link rel="preload" as="font" type="font/woff2" href="/${font}" crossorigin>` : '';
};

const preload = () => ({
  name: 'font-preload',
  transformIndexHtml: { order: 'post', handler: (html, ctx) => (ctx.bundle ? html.replace('<!--preload-->', fontPreload(ctx.bundle)) : html) },
});

// Project pages, the colophon, robots.txt and the sitemap are emitted straight into the build.
// `enforce: 'post'` so this runs after Vite's CSS plugin has produced the stylesheet.
const pages = () => ({
  name: 'content-pages',
  enforce: 'post',
  applyToEnvironment(environment) { return environment.name === 'client'; },
  generateBundle(_, bundle) {
    const data = loadContent();
    const { site, projects } = data;
    // Vite names index.html's chunk after its input key ('main'). By the time post plugins run, Vite's HTML plugin
    // has already cleared `isEntry` on it, so match by name.
    const entry = Object.values(bundle).find((c) => c.type === 'chunk' && c.name === 'main');
    const cssFiles = [...(entry?.viteMetadata?.importedCss || [])];
    if (!cssFiles.length) {
      const css = Object.values(bundle).find((c) => c.type === 'asset' && c.fileName.endsWith('.css'));
      if (css) cssFiles.push(css.fileName);
    }
    if (!entry || !cssFiles.length) throw new Error(`content-pages: could not find the built JS/CSS (entry: ${entry?.fileName}, css: ${cssFiles})`);
    const assets = [
      fontPreload(bundle),
      ...cssFiles.map((f) => `<link rel="stylesheet" crossorigin href="/${f}">`),
      `<script type="module" crossorigin src="/${entry.fileName}"></script>`,
    ].filter(Boolean).join('\n  ');
    const opts = { assets, noindex: !live };
    for (const p of projects) {
      this.emitFile({ type: 'asset', fileName: `projects/${p.slug}/index.html`, source: renderProjectPage(p, data, opts) });
    }

    // What a first visit to the homepage downloads, measured from this build, for the colophon.
    const size = (label, source) => ({ label, raw: Buffer.byteLength(source), gzip: zlib.gzipSync(source).length });
    const fonts = Object.values(bundle).filter((a) => /-latin-(wdth|400)-normal.*\.woff2$/.test(a.fileName));
    const stats = { files: [
      size('Page (HTML)', bundle['index.html']?.source ?? renderBody(data)),
      ...cssFiles.map((f) => size('Stylesheet', bundle[f].source)),
      size('Script', entry.code),
      ...fonts.map((a) => ({ label: `Font: ${a.fileName.replace(/^assets\/|-latin.*$/g, '').replace(/-/g, ' ')}`, raw: a.source.length, gzip: a.source.length })),
    ] };
    this.emitFile({ type: 'asset', fileName: 'colophon/index.html', source: renderColophon(data, { ...opts, stats }) });

    const home = absolute(site, '/');
    const robots = live ? `User-agent: *\nAllow: /\nSitemap: ${home}sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
    if (live) {
      const urls = [home, ...projects.map((p) => absolute(site, projectUrl(p))), absolute(site, '/colophon/')];
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    }
  },
});

const CMS_ROOTS = [path.resolve('cms'), path.resolve('node_modules/@sveltia/cms/dist')];
const CMS_TYPES = { '.html': 'text/html; charset=utf-8', '.yml': 'text/yaml; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.map': 'application/json' };
function serveCms(req, res, next) {
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  for (const root of CMS_ROOTS) {
    const file = path.join(root, rel);
    if (!file.startsWith(root + path.sep)) continue;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.setHeader('content-type', CMS_TYPES[path.extname(file)] || 'application/octet-stream');
      res.setHeader('x-robots-tag', 'noindex');
      fs.createReadStream(file).pipe(res);
      return;
    }
  }
  next();
}

export default defineConfig({
  plugins: [content(), preload(), pages(), cloudflare()],
  environments: {
    client: { build: { rollupOptions: { input: { main: 'index.html', notFound: '404.html' } } } },
  },
});
