// Build-time renderer: turns the files in /content into HTML.
// The CMS at /admin edits those files; nothing in here needs touching to change words.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const extLink = (href, text, cls = '') =>
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
      return { slug: f.replace(/\.md$/, ''), ...data, body: marked.parse(content.trim()) };
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return { site, cv, projects };
}

export const analyticsTag = (site) =>
  site.analyticsToken
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(site.analyticsToken)}"}'></script>`
    : '';

/* ---------- shared pieces ---------- */

const topbar = (home) => {
  const h = (id) => (home ? `#${id}` : `/#${id}`);
  return `<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <a class="brand" href="${home ? '#top' : '/'}"><span class="brand__prompt">~/</span>jamie-parr</a>
  <nav aria-label="Sections"><ul>
    <li><a href="${h('about')}">about</a></li><li><a href="${h('work')}">work</a></li><li><a href="${h('experience')}">cv</a></li><li><a href="${h('contact')}">contact</a></li>
  </ul></nav>
</header>`;
};

const footer = (site) => `<footer class="footer">
  <p>© ${new Date().getFullYear()} ${esc(site.name)}</p>
  <p class="footer__mono">portfolio · hosted on cloudflare</p>
</footer>`;

const node = (n, label, id) =>
  `<p class="node" aria-hidden="true"><span class="node__dot"></span><span class="node__num">${n}</span><span class="node__label">${label}</span></p><h2 id="${id}-title" class="section-title">`;

const projectLinks = (p) =>
  (p.links || [])
    .map((l) => extLink(l.url, `${esc(l.label)} <span aria-hidden="true">↗</span>`, l.primary ? 'btn btn--solid' : 'btn'))
    .join('');

const chips = (p) => `<ul class="chips chips--small">${(p.tech || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;

const shot = (p, cls, { eager = false } = {}) =>
  p.image
    ? `<img class="${cls}" src="${esc(p.image)}" alt="${esc(p.imageAlt || '')}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" width="1280" height="800">`
    : '';

/* ---------- homepage ---------- */

// A main project: screenshot, summary, links, and a link to its own page.
function caseStudy(p, i) {
  const href = projectUrl(p);
  return `<article class="case">
  <a class="case__shot" href="${href}" tabindex="-1" aria-hidden="true">${shot(p, 'case__img')}</a>
  <div class="case__intro">
    <p class="case__num">${String(i + 1).padStart(2, '0')}</p>
    <h3 class="case__title"><a href="${href}">${esc(p.title)}</a></h3>
    <p class="case__summary">${esc(p.summary)}</p>
    ${chips(p)}
    <p class="case__links">${projectLinks(p)}</p>
    <p class="case__read"><a href="${href}">Read the case study <span aria-hidden="true">→</span></a></p>
  </div>
</article>`;
}

// A smaller project: compact card with the write-up shown in full.
function card(p) {
  const href = projectUrl(p);
  return `<article class="card${p.draft ? ' card--slot' : ''}">
  ${p.image ? `<a class="card__shot" href="${href}" tabindex="-1" aria-hidden="true">${shot(p, 'card__img')}</a>` : ''}
  <div class="card__text">
    <h3 class="card__title"><a href="${href}">${esc(p.title)}</a></h3>
    <p class="card__summary">${esc(p.summary)}</p>
    <div class="card__body">${p.body}</div>
    ${chips(p)}
    <p class="card__links">${projectLinks(p)}<a class="card__more" href="${href}">Details <span aria-hidden="true">→</span></a></p>
  </div>
</article>`;
}

const row = (r) => `<li class="row">
  <span class="row__dates">${esc(r.dates)}</span>
  <div><h4 class="row__title">${esc(r.title)}</h4><p class="row__org">${esc(r.org)}</p>${r.detail ? `<p class="row__detail">${esc(r.detail)}</p>` : ''}</div>
</li>`;

const facts = (site) =>
  site.lookingFor?.length
    ? `<section class="facts" aria-label="What I'm looking for"><dl>${site.lookingFor
        .map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`)
        .join('')}</dl></section>`
    : '';

export function renderBody({ site, cv, projects }) {
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);
  return `
${topbar(true)}

<main id="main">
<section class="hero" id="top">
  <div class="hero__text">
    <p class="status"><span class="status__led" aria-hidden="true"></span>${esc(site.availability)}</p>
    <h1 class="hero__name">${esc(site.name)}</h1>
    <p class="hero__headline">${esc(site.headline)}</p>
    <p class="hero__actions">
      <a class="btn btn--solid" href="${esc(site.cv)}" download>Download CV <span aria-hidden="true">↓</span></a>
      <a class="btn" href="#contact">Get in touch</a>
    </p>
    <p class="hero__meta"><span>${esc(site.location)}</span>${extLink(site.github, 'GitHub')}${extLink(site.linkedin, 'LinkedIn')}</p>
  </div>
  <figure class="hero__photo">
    <span class="reg reg--tl" aria-hidden="true"></span><span class="reg reg--br" aria-hidden="true"></span>
    <img src="${esc(site.photo)}" alt="${esc(site.photoAlt)}" width="460" height="460" fetchpriority="high">
  </figure>
</section>

${facts(site)}

<section class="section" id="about" aria-labelledby="about-title">
  ${node('01', 'about', 'about')}About</h2>
  <div class="about">
    <div class="prose">${marked.parse(site.about)}</div>
    <div>
      <p class="label">Tools I've used in real projects</p>
      <ul class="chips">${site.skills.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </div>
  </div>
</section>

<section class="section" id="work" aria-labelledby="work-title">
  ${node('02', 'work', 'work')}Projects</h2>
  <div class="cases">${featured.map(caseStudy).join('')}</div>
  ${others.length ? `<h3 class="label more-label">Also</h3>
  <div class="cards">${others.map(card).join('')}</div>` : ''}
</section>

<section class="section" id="experience" aria-labelledby="experience-title">
  ${node('03', 'cv', 'experience')}Education &amp; experience</h2>
  <div class="cv">
    <div><h3 class="label">Education</h3><ol class="rows">${cv.education.map(row).join('')}</ol></div>
    <div><h3 class="label">Work</h3><ol class="rows">${cv.work.map(row).join('')}</ol></div>
  </div>
  <p><a class="btn" href="${esc(site.cv)}" download>Full CV (PDF) <span aria-hidden="true">↓</span></a></p>
</section>

<section class="section" id="contact" aria-labelledby="contact-title">
  ${node('04', 'contact', 'contact')}Contact</h2>
  <div class="contact">
    <div class="prose">
      <p>Placement offers, questions about my work, or just hello. I read everything.</p>
      <p class="direct"><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
    </div>
    <form class="form" id="contact-form" data-email="${esc(site.email)}" novalidate>
      <label>Your name<input name="name" autocomplete="name" required></label>
      <label>Your email<input name="email" type="email" autocomplete="email" required></label>
      <label>Message<textarea name="message" rows="5" required></textarea></label>
      <button class="btn btn--solid" type="submit">Send message</button>
      <p class="form__status" role="status" aria-live="polite"></p>
    </form>
  </div>
</section>
</main>

${footer(site)}`;
}

/* ---------- one page per project ---------- */

// `assets` is the <link>/<script> tags for the built CSS and JS (Vite only knows about index.html).
export function renderProjectPage(p, { site, projects }, { assets = '', noindex = false } = {}) {
  const url = absolute(site, projectUrl(p));
  const image = p.image ? absolute(site, p.image) : absolute(site, '/og.png');
  const others = projects.filter((o) => o.slug !== p.slug);
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(p.title)} · Jamie Parr</title>
  <meta name="description" content="${esc(p.summary)}">
  ${noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Jamie Parr">
  <meta property="og:title" content="${esc(p.title)} · Jamie Parr">
  <meta property="og:description" content="${esc(p.summary)}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:alt" content="${esc(p.imageAlt || p.title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#f6f5f1" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0d1110" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  ${assets}
  ${analyticsTag(site)}
</head>
<body>
${topbar(false)}
<main id="main" class="project">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">~/jamie-parr</a><span>/</span><a href="/#work">work</a><span>/</span><span aria-current="page">${esc(p.slug)}</span></nav>
  <header class="project__head">
    <h1>${esc(p.title)}</h1>
    <p class="project__summary">${esc(p.summary)}</p>
    ${chips(p)}
    <p class="case__links">${projectLinks(p)}</p>
  </header>
  ${shot(p, 'project__shot', { eager: true })}
  <div class="prose case__body project__body">${p.body}</div>
  <nav class="project__next" aria-label="Other projects">
    <p class="label">Other projects</p>
    <ul>${others.map((o) => `<li><a href="${projectUrl(o)}">${esc(o.title)}</a><span>${esc(o.summary)}</span></li>`).join('')}</ul>
    <p class="project__back"><a href="/#work">← All projects</a></p>
  </nav>
</main>
${footer(site)}
</body>
</html>`;
}
