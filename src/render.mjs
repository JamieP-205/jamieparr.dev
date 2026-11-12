// Build-time renderer: turns the files in /content into HTML.
// The CMS at /admin edits those files; nothing in here needs touching to change words.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { skillMatrix } from './lib/skills.mjs';
import { parseAnnual, annualChart } from './lib/chart.mjs';
import { imageSize } from './lib/image-size.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ext = (href, text, cls = '') =>
  `<a href="${esc(href)}"${cls ? ` class="${cls}"` : ''} target="_blank" rel="noopener">${text}</a>`;

export const projectUrl = (p) => `/projects/${p.slug}/`;
export const absolute = (site, p) => site.url.replace(/\/$/, '') + p;

export function loadContent() {
  const site = readJson('content/site.json');
  const cv = readJson('content/cv.json');
  const dir = path.join(root, 'content/projects');
  const projects = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { slug: f.replace(/\.md$/, ''), ...data, ...outline(sized(marked.parse(content.trim()))) };
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return { site, cv, projects };
}

// The real width and height of a file in /public, so the browser reserves the right space before it loads.
const sizeOf = (src) => {
  const file = path.join(root, 'public', src);
  return fs.existsSync(file) ? imageSize(file) : null;
};

// Pictures written in Markdown get their real width and height, and load only when they come into view.
function sized(html) {
  return html.replace(/<img src="(\/[^"]+)"(?![^>]*\swidth=)/g, (tag, src) => {
    const size = sizeOf(src);
    return size ? `<img src="${src}" width="${size.width}" height="${size.height}" loading="lazy" decoding="async"` : tag;
  });
}

// Gives every h2 and h3 in a write-up an id and lists them for the "On this page" links.
const slug = (text) => text.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function outline(html) {
  const headings = [];
  const body = html.replace(/<h([23])(?: id="([^"]*)")?>([\s\S]*?)<\/h\1>/g, (_, level, id, text) => {
    const anchor = id || slug(text);
    headings.push({ id: anchor, text: text.replace(/<[^>]+>/g, '') });
    return `<h${level} id="${anchor}">${text}</h${level}>`;
  });
  return { body, headings };
}

/* ---------- head ---------- */

export const analyticsTag = (site) =>
  site.analyticsToken
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(site.analyticsToken)}"}'></script>`
    : '';

// Chromium prerenders a project page once the pointer settles on its link. Inline JSON has to be
// allowed by hash in public/_headers; tests/security-headers.test.mjs fails if the two drift apart.
export const SPECULATION_RULES = '{"prerender":[{"where":{"href_matches":"/projects/*"},"eagerness":"moderate"}],"prefetch":[{"where":{"href_matches":"/*"},"eagerness":"moderate"}]}';
export const speculationTag = `<script type="speculationrules">${SPECULATION_RULES}</script>`;

// Shared by every page that isn't index.html or 404.html (those are real files Vite reads).
// `assets` is the <link>/<script> tags for the built CSS, JS and font preload.
function page({ site, title, description, url, image, imageAlt, type = 'website', assets = '', noindex = false, body, expect = 'lead' }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="${type}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:alt" content="${esc(imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#2947ec">
  <script src="/theme.js"></script>
  <link rel="expect" href="#${expect}" blocking="render">
  <link rel="icon" href="/favicon.ico?v=4" sizes="16x16 32x32 48x48">
  <link rel="icon" href="/favicon.svg?v=4" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4">
  ${assets}
  ${speculationTag}
  ${analyticsTag(site)}
</head>
<body>
${body}
</body>
</html>`;
}

/* ---------- shared pieces ---------- */

const city = (site) => site.location.split(',')[0];

export const topbar = (home, site = readJson('content/site.json')) => {
  const h = (id) => (home ? `#${id}` : `/#${id}`);
  return `<a class="skip" href="#main">Skip to content</a>
<header class="bar${home ? ' bar--home' : ''}">
  <a class="bar__name" href="${home ? '#top' : '/'}">${esc(site.name)}</a>
  <nav aria-label="Sections"><ul>
    <li><a href="${h('work')}">Work</a></li><li><a href="${h('skills')}">Skills</a></li><li><a href="${h('experience')}">Experience</a></li><li><a href="${h('contact')}">Contact</a></li>
  </ul></nav>
  <a class="bar__cv" href="${esc(site.cv)}" download>CV</a>
  <details class="preferences" id="display-settings" hidden>
    <summary>Settings</summary>
    <div class="preferences__panel">
      <h2>Display and accessibility</h2>
      <fieldset class="theme-options"><legend>Theme</legend>
        <div class="theme-options__choices">
          <label><input type="radio" name="colour-theme" value="system" checked><span>System</span></label>
          <label><input type="radio" name="colour-theme" value="light"><span>Light</span></label>
          <label><input type="radio" name="colour-theme" value="dark"><span>Dark</span></label>
        </div>
      </fieldset>
      <label class="preference-row"><span>Larger text</span><input type="checkbox" id="larger-text" data-preference="largeText"></label>
      <label class="preference-row"><span>Stronger contrast</span><input type="checkbox" id="stronger-contrast" data-preference="contrast"></label>
      <label class="preference-row"><span>Reduce motion</span><input type="checkbox" id="reduce-motion" data-preference="reduceMotion" aria-describedby="motion-note"></label>
      <p class="preferences__note" id="motion-note">Your device's reduced-motion setting is always respected.</p>
      <button class="preferences__reset" type="button" id="reset-preferences">Reset to defaults</button>
    </div>
  </details>
</header>`;
};

const footer = (site) => `<footer class="foot">
  <p>${esc(site.name)}, ${esc(city(site))}</p>
  <a class="link" href="/colophon/">About this site</a>
</footer>`;

const links = (p, { primary = 'btn btn--light', rest = 'btn btn--ghost' } = {}) =>
  (p.links || []).map((l) => ext(l.url, esc(l.label), l.primary ? primary : rest)).join('');

const access = (p) => (p.access ? `<p class="access-note">${esc(p.access)}</p>` : '');

const proof = (p) => (p.proof?.length ? `<ul class="proof">${p.proof.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '');

const shot = (p, cls, { eager = false } = {}) => {
  const size = p.image && sizeOf(p.image);
  return size
    ? `<img class="${cls}" src="${esc(p.image)}" alt="${esc(p.imageAlt || '')}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="${size.width}" height="${size.height}">`
    : '';
};

// A heading that rises from behind its own edge as it scrolls into view (styles/motion.css).
const title = (id, text) => `<h2 class="title display" id="${id}"><span>${esc(text)}</span></h2>`;

/* ---------- exhibits: one custom figure per featured project, shown on its own page ---------- */

const exhibits = {
  // An ordered path through a system. The order is real: each step hands over to the next.
  flow: (x) => `<figure class="flow">
  <figcaption><h2 class="title display"><span>${esc(x.caption)}</span></h2></figcaption>
  <ol class="flow__steps">${x.steps.map((s) => `<li class="flow__step"><strong>${esc(s.label)}</strong><span>${esc(s.text)}</span></li>`).join('')}</ol>
</figure>`,
  roles: (x) => `<figure class="roles">
  <figcaption><h2 class="title display"><span>${esc(x.caption)}</span></h2></figcaption>
  <div class="roles__grid">${x.roles.map((r) => `<div class="roles__role"><h3>${esc(r.name)}</h3><ul>${r.can.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>`).join('')}</div>
</figure>`,
  chart: (x) => annualChart(parseAnnual(read(`content/data/${x.data}.csv`)), { caption: esc(x.caption) }),
};
const exhibit = (p) => (p.exhibit && exhibits[p.exhibit.type] ? exhibits[p.exhibit.type](p.exhibit) : '');

/* ---------- homepage ---------- */

function hero(site) {
  // "Computing student at Ulster University" from the headline, then the city.
  const role = `${site.headline.split('. ')[0]}, ${city(site)}.`;
  // Each word sits in its own clipped line so it can rise into view.
  const name = site.name.split(' ').map((w) => `<span class="hero__line"><span>${esc(w)}</span></span>`).join(' ');
  return `<section class="hero" id="top">
  <div class="hero__inner">
    <picture class="hero__photo">
      <source type="image/webp" srcset="${esc(site.portrait)}-720.webp 720w, ${esc(site.portrait)}-1200.webp 1200w" sizes="(orientation: portrait) 100vw, (max-width: 46rem) 100vw, 62vw">
      <img src="${esc(site.photo)}" alt="${esc(site.photoAlt)}" width="1200" height="1200" fetchpriority="high">
    </picture>
    <div class="hero__copy" id="lead">
      <h1 class="hero__name display">${name}</h1>
      <p class="hero__role">${esc(role)}</p>
      <p class="hero__status">${esc(site.availability)}</p>
      <p class="hero__actions">
        <a class="btn btn--light" href="${esc(site.cv)}" download>Download CV</a>
        <a class="link" href="mailto:${esc(site.email)}">${esc(site.email)}</a>
        ${ext(site.github, 'GitHub', 'link link--quiet')}
        ${ext(site.linkedin, 'LinkedIn', 'link link--quiet')}
      </p>
    </div>
  </div>
</section>`;
}

function intro(site) {
  return `<section class="intro grid" aria-labelledby="about-title">
  <h2 class="sr" id="about-title">About</h2>
  <p class="intro__lead">${esc(site.lead)}</p>
  <div class="intro__aside">${(site.lookingFor ?? []).map((f) => `<p><strong>${esc(f.label)}</strong> ${esc(f.value)}</p>`).join('')}</div>
</section>`;
}

// The screenshot on a plain stage. The stage repeats the title link for the pointer; keyboards use the title.
const stage = (p) => `<a class="stage" href="${projectUrl(p)}" tabindex="-1" aria-hidden="true"><span class="stage__frame">${shot(p, 'stage__img')}</span></a>`;

const caseLink = (p) => `<a class="link" href="${projectUrl(p)}">Read the case study<span class="sr">: ${esc(p.title)}</span></a>`;

function leadProject(p) {
  const site = p.links?.find((l) => l.primary);
  return `<article class="feature">
  ${stage(p)}
  <div class="feature__text">
    <h3 class="feature__title display"><a href="${projectUrl(p)}">${esc(p.title)}</a></h3>
    ${p.context ? `<p class="quiet">${esc(p.context)}</p>` : ''}
    <p class="feature__summary">${esc(p.summary)}</p>
    <p class="feature__actions"><a class="btn btn--ink" href="${projectUrl(p)}">Read the case study</a>${site ? ext(site.url, 'Visit the site', 'link') : ''}</p>
  </div>
  ${proof(p)}
</article>`;
}

const pairProject = (p) => `<article class="pair">
  ${stage(p)}
  <h3 class="pair__title display">${esc(p.title)}</h3>
  ${p.context ? `<p class="quiet">${esc(p.context)}</p>` : ''}
  <p>${esc(p.summary)}</p>
  <p>${caseLink(p)}</p>
</article>`;

const rowProject = (p) => `<article class="row">
  <h3 class="row__title display"><a href="${projectUrl(p)}">${esc(p.title)}</a></h3>
  <div class="row__text">
    ${p.context ? `<p class="quiet">${esc(p.context)}</p>` : ''}
    <p>${esc(p.summary)}</p>
    ${p.tech?.length ? `<p class="row__tech">${p.tech.map(esc).join(', ')}</p>` : ''}
  </div>
  <p class="row__link">${caseLink(p)}</p>
</article>`;

function work(projects) {
  const [first, ...featured] = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);
  return `<section class="work grid" id="work" aria-labelledby="work-title">
  ${title('work-title', 'Work')}
  ${first ? leadProject(first) : ''}
  ${featured.length ? `<div class="pairs">${featured.map(pairProject).join('')}</div>` : ''}
  ${others.length ? `<div class="rows">${others.map(rowProject).join('')}</div>` : ''}
</section>`;
}

function skills(site, projects) {
  if (!site.skillGroups?.length) return '';
  const m = skillMatrix({ groups: site.skillGroups, projects, coursework: site.coursework });
  const modules = (site.coursework ?? []).map((c) => `${c.code} ${c.title}`).join(', ');
  // Projects become links to their case studies; modules are named by code.
  const where = (row) => row.cells.flatMap((c, i) => {
    const col = m.columns[i];
    if (!c.used) return [];
    return col.key === 'coursework' ? c.where.map(esc) : [`<a class="link" href="/projects/${col.key}/">${esc(col.label)}</a>`];
  }).join(', ');
  return `<section class="skills grid" id="skills" aria-labelledby="skills-title">
  <div class="skills__head">
    ${title('skills-title', "What I've used, and where")}
    ${modules ? `<p class="skills__note">The module codes are coursework: ${esc(modules)}.</p>` : ''}
  </div>
  <div class="skills__groups">${m.groups.map((g) => `<div class="skills__group">
    <h3 class="subhead">${esc(g.name)}</h3>
    <dl>${g.rows.map((r) => `<div><dt>${esc(r.skill)}</dt><dd>${where(r)}</dd></div>`).join('')}</dl>
  </div>`).join('')}</div>
</section>`;
}

const entry = (e) => `<li><span class="dates">${esc(e.dates)}</span><p><strong>${esc(e.title)}</strong> <span>${esc(e.org)}</span></p></li>`;

function experience(site, cv) {
  const year = (iso) => iso.slice(0, 4);
  const p = cv.placement;
  // The open placement year sits straight after the degree it belongs to.
  const placement = p ? `<li class="is-open"><span class="dates">${year(p.start)} – ${year(p.end)}</span><p><strong>${esc(p.label)}</strong> <span>${esc(p.note)}</span></p></li>` : '';
  const [degree, ...study] = cv.education;
  return `<section class="experience grid" id="experience" aria-labelledby="experience-title">
  ${title('experience-title', 'Experience')}
  ${site.workNote ? `<p class="experience__note">${esc(site.workNote)}</p>` : ''}
  <div class="experience__list">
    <h3 class="subhead">Study</h3>
    <ul>${degree ? entry(degree) : ''}${placement}${study.map(entry).join('')}</ul>
  </div>
  <div class="experience__list">
    <h3 class="subhead">Work</h3>
    <ul>${cv.work.map(entry).join('')}</ul>
  </div>
</section>`;
}

function contact(site) {
  return `<section class="contact grid" id="contact" aria-labelledby="contact-title">
  <div class="contact__intro">
    ${title('contact-title', 'Contact')}
    <p>Placement offers, questions about my work, or just hello. I read everything.</p>
    <p class="contact__mail display"><a class="link" href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
    <p class="contact__links"><a class="link" href="${esc(site.cv)}" download>Download CV</a>${ext(site.github, 'GitHub', 'link')}${ext(site.linkedin, 'LinkedIn', 'link')}</p>
  </div>
  <form class="form" id="contact-form" data-email="${esc(site.email)}" aria-describedby="contact-help" novalidate>
    <label>Your name<input name="name" autocomplete="name" maxlength="100" required></label>
    <label>Your email<input name="email" type="email" autocomplete="email" maxlength="254" required></label>
    <label>Message<textarea name="message" rows="4" maxlength="5000" required></textarea></label>
    <label class="form__trap" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>
    <p id="contact-help">Your message goes directly to my inbox. I'll reply by email.</p>
    <button class="btn btn--light" type="submit" disabled>Send message</button>
    <noscript><p>Please email <a href="mailto:${esc(site.email)}">${esc(site.email)}</a> directly; the form requires JavaScript.</p></noscript>
    <p class="form__status" role="status" aria-live="polite"></p>
  </form>
</section>`;
}

export function renderBody({ site, cv, projects }) {
  return `
${topbar(true, site)}

<main id="main" tabindex="-1">
${hero(site)}
<div class="sheet">
${intro(site)}
${work(projects)}
${skills(site, projects)}
${experience(site, cv)}
${contact(site)}
</div>
</main>

${footer(site)}`;
}

/* ---------- one page per project ---------- */

export function renderProjectPage(p, { site, projects }, { assets = '', noindex = false } = {}) {
  const url = absolute(site, projectUrl(p));
  const next = projects[(projects.findIndex((o) => o.slug === p.slug) + 1) % projects.length];
  const body = `${topbar(false, site)}
<main id="main" class="case" tabindex="-1">
  <header class="case__head" id="lead">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/#work">Work</a><span aria-hidden="true">/</span><span aria-current="page">${esc(p.title)}</span></nav>
    <h1 class="case__title display"><span class="rise"><span>${esc(p.title)}</span></span></h1>
    <p class="case__summary">${esc(p.summary)}</p>
    ${p.context ? `<p class="case__context">${esc(p.context)}</p>` : ''}
    <p class="case__links">${links(p, { rest: 'link' })}</p>
    ${access(p)}
  </header>
  <div class="sheet">
    <section class="case__open grid" aria-label="Overview">
      ${p.image ? `<div class="stage case__stage"><span class="stage__frame">${shot(p, 'stage__img', { eager: true })}</span></div>` : ''}
      <dl class="case__facts">
        ${p.tech?.length ? `<div><dt>Built with</dt><dd>${p.tech.map(esc).join(', ')}</dd></div>` : ''}
        ${p.proof?.length ? `<div><dt>Evidence</dt><dd>${proof(p)}</dd></div>` : ''}
      </dl>
    </section>
    ${p.exhibit ? `<section class="case__exhibit grid">${exhibit(p)}</section>` : ''}
    <div class="case__layout grid">
      ${p.headings.length > 1 ? `<nav class="case__toc" aria-label="On this page"><p class="subhead">On this page</p><ol>${p.headings.map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`).join('')}</ol></nav>` : ''}
      <div class="prose case__body">${p.body}</div>
    </div>
    <nav class="next" aria-label="Next project">
      <a class="next__link" href="${projectUrl(next)}"><span>Next project</span><strong class="display">${esc(next.title)}</strong></a>
      <a class="link next__all" href="/#work">All projects</a>
    </nav>
  </div>
</main>
${footer(site)}`;
  return page({
    site, body, assets, noindex, url, type: 'article',
    title: `${p.title} · ${site.name}`, description: p.summary,
    image: p.image ? absolute(site, p.image) : absolute(site, '/og.png'), imageAlt: p.imageAlt || p.title,
  });
}

/* ---------- how this site is built ---------- */

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

// `stats` is measured from the finished build (see vite.config.js); in dev there is nothing to measure yet.
export function renderColophon({ site }, { assets = '', noindex = false, stats = null, today = new Date() } = {}) {
  const headers = read('public/_headers').split(/\r?\n/).filter((l) => /^\s+\S+:/.test(l)).map((l) => l.trim());
  const csp = headers.find((l) => l.startsWith('Content-Security-Policy:'))?.replace(/^[^:]+:\s*/, '').split(/;\s*/) ?? [];
  const tests = fs.readdirSync(path.join(root, 'tests')).filter((f) => f.endsWith('.test.mjs'))
    .reduce((n, f) => n + (read(`tests/${f}`).match(/^test\(/gm) ?? []).length, 0);
  const toc = [['pages', 'Pages'], ...(stats ? [['weight', 'What a first visit downloads']] : []), ['motion', 'Movement'], ['access', 'Access'], ['security', 'Security'], ['tests', 'Tests'], ['type', 'Type and pictures'], ['source', 'Source']];
  const body = `${topbar(false, site)}
<main id="main" class="case colophon" tabindex="-1">
  <header class="case__head" id="lead">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">How this site is built</span></nav>
    <h1 class="case__title display"><span class="rise"><span>How this site is built</span></span></h1>
    <p class="case__summary">Plain HTML, CSS and a little JavaScript, generated from text files and served from Cloudflare. No framework, no cookies, nothing loaded from anywhere else except the visitor counter.</p>
  </header>
  <div class="sheet">
  <div class="case__layout grid">
    <nav class="case__toc" aria-label="On this page"><p class="subhead">On this page</p><ol>${toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol></nav>
    <div class="prose case__body">
    <h2 id="pages">Pages</h2>
    <p>Every page is written out as finished HTML when the site is built. A small Node script reads the Markdown and JSON in <code>/content</code>, and Vite bundles one stylesheet and one script. The skills list is worked out from those content files at build time, so adding a project is a matter of adding a file.</p>
    ${stats ? `<h2 id="weight">What a first visit downloads</h2>
    <table><thead><tr><th>File</th><th>Size</th><th>Compressed</th></tr></thead><tbody>
      ${stats.files.map((f) => `<tr><td>${esc(f.label)}</td><td>${kb(f.raw)}</td><td>${kb(f.gzip)}</td></tr>`).join('')}
    </tbody></table>
    <p>Measured from this build, ${today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}. Images load as they come into view and are not counted.</p>` : ''}
    <h2 id="motion">Movement</h2>
    <p>The homepage opens once: the portrait is uncovered from the bottom and the name rises into place. As you scroll, the page slides up over the portrait and each screenshot is uncovered as it arrives. Project pages open the same way, with the title rising and the screenshot uncovered. Moving between pages uses the browser's own page transitions where they exist. All of it is CSS. Chromium browsers start loading a project page while the pointer rests on its link. Browsers without these features get an ordinary, instant page.</p>
    <p>All of it stops if your device asks for reduced motion, or if you switch it off in the display settings at the top of the page.</p>
    <h2 id="access">Access</h2>
    <p>The display settings offer a light or dark theme, larger text, stronger contrast and reduced motion, and remember the choice on your device. Every page works from the keyboard, has a skip link, and keeps its colour contrast in both themes. The Armagh chart can be read with the arrow keys.</p>
    <h2 id="security">Security</h2>
    <p>Each response carries these headers:</p>
    <ul>${headers.filter((l) => !l.startsWith('Content-Security-Policy:')).map((l) => `<li><code>${esc(l)}</code></li>`).join('')}</ul>
    <p>The Content-Security-Policy allows no inline styles and one inline script, pinned by hash:</p>
    <ul>${csp.map((d) => `<li><code>${esc(d)}</code></li>`).join('')}</ul>
    <p>The contact form checks the sender's origin and content type, caps the message size, limits each visitor to three messages a minute and only reports success once the email has been accepted. Security reports have an address in <a href="/.well-known/security.txt">security.txt</a>.</p>
    <h2 id="tests">Tests</h2>
    <p>${tests} automated tests run before a deploy. They cover the contact form, the display settings, the Armagh chart, the skills list (a tool can't be listed without a project or module behind it), the security headers and the size of what is sent.</p>
    <h2 id="type">Type and pictures</h2>
    <p>Headings and text are Bricolage Grotesque by Mathieu Triay. Code is IBM Plex Mono. Both are open-source and served from this site. The portrait is one photograph printed in two inks.</p>
    <h2 id="source">Source</h2>
    <p>${ext(`${site.github}/jamieparr.dev`, 'The code for this site is on GitHub')}.</p>
    </div>
  </div>
  </div>
</main>
${footer(site)}`;
  return page({
    site, body, assets, noindex, url: absolute(site, '/colophon/'),
    title: `How this site is built · ${site.name}`, description: 'How jamieparr.dev is put together: pages, page weight, movement, accessibility, security headers and tests.',
    image: absolute(site, '/og.png'), imageAlt: `${site.name}. Computing student at Ulster University.`,
  });
}
