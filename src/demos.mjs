// The demos hosted on Render's free plan. A demo there sleeps after 15 minutes without a request
// and takes one to two minutes to start again, so every page of this site starts them and keeps
// them awake while it is open (demo.js), through /api/wake below.
export const DEMOS = {
  nexusdesk: 'https://nexusdesk-demo-1tl6.onrender.com',
  'coast-requests': 'https://coast-requests-demo.onrender.com',
};

// Both demos serve /login without signing anyone in. NexusDesk already uses it as its health check.
const PING_PATH = '/login';

export const demoFor = (href) => Object.keys(DEMOS).find((key) => href.startsWith(DEMOS[key]));

// Sends one request to a demo. `request` settles when the demo answers, which can take two minutes
// if it was asleep. `answered` settles after at most `wait` ms: true only if the demo had answered by then.
// The request is never cancelled, because a request arriving is what starts a sleeping demo.
export function ping(key, { wait = 3000, fetcher = fetch } = {}) {
  const request = fetcher(DEMOS[key] + PING_PATH, { headers: { 'user-agent': 'jamieparr.dev demo check' } })
    .then((response) => response.ok, () => false);
  const answered = Promise.race([request, new Promise((resolve) => setTimeout(resolve, wait, false))]);
  return { request, answered };
}

// POST /api/wake?demo=<key> starts the demo if it is asleep and reports whether it is awake yet.
export async function handleWake(request, ctx, options) {
  const url = new URL(request.url);
  const reply = (status, body, headers = {}) => Response.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } });
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, { allow: 'POST' });
  // Only pages on this site may start a demo.
  if (request.headers.get('origin') !== url.origin) return reply(403, { error: 'Not allowed from another site.' });
  const key = url.searchParams.get('demo');
  if (!Object.hasOwn(DEMOS, key)) return reply(404, { error: 'Unknown demo.' });
  const { request: pending, answered } = ping(key, options);
  ctx.waitUntil(pending);
  return reply(200, { awake: await answered });
}
