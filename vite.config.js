import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
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
      ? `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${url}sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n';
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
    if (live) {
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}</loc></url></urlset>\n`;
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    }
  },
  configureServer(server) {
    server.watcher.add(path.resolve('content'));
    server.watcher.on('change', (f) => f.includes(`${path.sep}content${path.sep}`) && server.ws.send({ type: 'full-reload' }));
  },
});

export default defineConfig({ plugins: [content(), cloudflare()] });
