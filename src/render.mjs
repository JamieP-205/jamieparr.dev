// Build-time renderer: turns the files in /content into the page's HTML.
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

export function loadContent() {
  const site = readJson('content/site.json');
  const cv = readJson('content/cv.json');
  const dir = path.join(root, 'content/projects');
  const projects = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { ...data, body: marked.parse(content.trim()) };
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return { site, cv, projects };
}

const node = (n, label, id) =>
  `<p class="node" aria-hidden="true"><span class="node__dot"></span><span class="node__num">${n}</span><span class="node__label">${label}</span></p><h2 id="${id}-title" class="section-title">`;

function project(p) {
  const slot = p.draft ? ' card--slot' : '';
  const links = [
    p.link && extLink(p.link, 'Visit site ↗'),
    p.repo && extLink(p.repo, 'Source code ↗'),
  ].filter(Boolean).join('');
  const img = p.image
    ? `<img class="card__img" src="${esc(p.image)}" alt="" loading="lazy" decoding="async" width="640" height="360">`
    : '';
  return `<article class="card${slot}">
  ${img}
  <h3 class="card__title">${esc(p.title)}</h3>
  <p class="card__summary">${esc(p.summary)}</p>
  <div class="card__body">${p.body}</div>
  <ul class="chips chips--small">${(p.tech || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
  ${links ? `<p class="card__links">${links}</p>` : ''}
</article>`;
}

const row = (r) => `<li class="row">
  <span class="row__dates">${esc(r.dates)}</span>
  <div><h4 class="row__title">${esc(r.title)}</h4><p class="row__org">${esc(r.org)}</p>${r.detail ? `<p class="row__detail">${esc(r.detail)}</p>` : ''}</div>
</li>`;

export function renderBody({ site, cv, projects }) {
  const year = new Date().getFullYear();
  return `
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <a class="brand" href="#top"><span class="brand__prompt">~/</span>jamie-parr</a>
  <nav aria-label="Sections"><ul>
    <li><a href="#about">about</a></li><li><a href="#work">work</a></li><li><a href="#experience">cv</a></li><li><a href="#contact">contact</a></li>
  </ul></nav>
</header>

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
  <div class="cards">${projects.map(project).join('')}</div>
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

<footer class="footer">
  <p>© ${year} ${esc(site.name)}</p>
  <p class="footer__mono">portfolio · hosted on cloudflare</p>
</footer>`;
}
