import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, renderBody } from './src/render.mjs';

// Pre-renders the page from /content at build time, so visitors get plain HTML.
let live = false;
const content = () => ({
  name: 'content',
  config(_, env) { live = env.mode === 'live' || process.env.SITE_ENV === 'production'; },
  transformIndexHtml(html) {
    const data = loadContent();
    const noindex = live ? '' : '<meta name="robots" content="noindex, nofollow">';
    return html
      .replace('<!--noindex-->', noindex)
      .replaceAll('%HEADLINE%', data.site.headline.replace(/"/g, '&quot;'))
      .replace('<!--app-->', renderBody(data));
  },
  generateBundle() {
    // Staging: block search engines. Live (`npm run deploy:live`): allow them and list the page.
    const url = 'https://jamie-parr.jamieparr05.workers.dev/';
    const robots = live
      ? `User-agent: *\nAllow: /\nSitemap: ${url}sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n';
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
    if (live) {
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}</loc></url></urlset>\n`;
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    }
  },
  configureServer(server) {
    // The editor (/admin) exists only on this machine, in dev. It's never built or deployed.
    server.middlewares.use('/admin', serveCms);
    server.watcher.add(path.resolve('content'));
    server.watcher.on('change', (f) => f.includes(`${path.sep}content${path.sep}`) && server.ws.send({ type: 'full-reload' }));
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
  plugins: [content(), cloudflare()],
  build: { rollupOptions: { input: { main: 'index.html', notFound: '404.html' } } },
});
