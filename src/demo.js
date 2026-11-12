import { DEMOS, demoFor } from './demos.mjs';

// The hosted demos sleep when nobody has used them for 15 minutes and take a minute or two to start.
// So any page of this site starts them, and keeps them awake while the page is open and on screen.
const EVERY = 9 * 60_000; // comfortably inside the 15 minutes
const LONGEST = 60 * 60_000; // a tab left open stops keeping them awake after an hour
const STORE = 'demos-woken';

// Resolves true or false, or undefined if the answer could not be had.
async function wake(key) {
  try {
    const response = await fetch(`/api/wake?demo=${key}`, { method: 'POST' });
    return response.ok ? (await response.json()).awake : undefined;
  } catch { return undefined; }
}

// Shared between pages in this tab, so moving around the site does not ask again each time.
const lastWoken = () => { try { return Number(sessionStorage.getItem(STORE)) || 0; } catch { return 0; } };

function keepAwake() {
  if (document.visibilityState !== 'visible' || performance.now() > LONGEST) return;
  if (Date.now() - lastWoken() < EVERY) return;
  try { sessionStorage.setItem(STORE, Date.now()); } catch { /* storage blocked: ask on each page instead */ }
  for (const key of Object.keys(DEMOS)) wake(key);
}

keepAwake();
setInterval(keepAwake, 60_000);
// Covers coming back to the tab, and a page loaded ahead of time (speculation rules) being shown.
document.addEventListener('visibilitychange', keepAwake);
document.addEventListener('prerenderingchange', keepAwake);

// A project page that links to a demo also says so while the demo is still starting.
const links = document.querySelector('.case__links');
const key = [...(links?.querySelectorAll('a') || [])].map((a) => demoFor(a.href)).find(Boolean);

if (key) {
  const note = document.createElement('p');
  note.className = 'demo-status';
  note.setAttribute('role', 'status');
  links.after(note);

  let checks = 0;
  const check = async () => {
    const awake = await wake(key);
    if (awake === undefined) return;
    if (awake) {
      if (checks) note.textContent = 'The demo is ready.';
      return;
    }
    checks += 1;
    // Give up quietly after about three minutes; the link still works.
    if (checks > 20) { note.textContent = ''; return; }
    note.textContent = 'The demo is starting up after a quiet spell. It should be ready in a minute or two.';
    setTimeout(check, 8000);
  };

  if (document.prerendering) document.addEventListener('prerenderingchange', check, { once: true });
  else check();
}
