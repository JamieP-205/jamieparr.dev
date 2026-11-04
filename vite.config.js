import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import path from 'node:path';
import { loadContent, renderBody } from './src/render.mjs';

// Pre-renders the page from /content at build time, so visitors get plain HTML.
const content = () => ({
  name: 'content',
  transformIndexHtml(html) {
    const data = loadContent();
    const noindex = process.env.SITE_ENV === 'production' ? '' : '<meta name="robots" content="noindex, nofollow">';
    return html
      .replace('<!--noindex-->', noindex)
      .replaceAll('%HEADLINE%', data.site.headline.replace(/"/g, '&quot;'))
      .replace('<!--app-->', renderBody(data));
  },
  configureServer(server) {
    server.watcher.add(path.resolve('content'));
    server.watcher.on('change', (f) => f.includes(`${path.sep}content${path.sep}`) && server.ws.send({ type: 'full-reload' }));
  },
});

export default defineConfig({ plugins: [content(), cloudflare()] });
