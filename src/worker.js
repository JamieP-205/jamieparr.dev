import { handleContact } from './contact.mjs';
import { handleWake } from './demos.mjs';

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/contact') return handleContact(request, env);
    if (pathname === '/api/wake') return handleWake(request, ctx);
    if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
