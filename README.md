# Jamie Parr - portfolio

Source for [jamieparr.dev](https://jamieparr.dev), my portfolio and project case studies.

The site includes project demos, a downloadable CV, a contact form, light and dark themes, and accessibility preferences for text size, contrast and motion.

## Stack

- HTML, CSS and JavaScript, with Vite generating every page at build time. No framework.
- JSON and Markdown content files, with Sveltia CMS available locally.
- Cloudflare Workers and static assets, with Email Routing for the contact form.
- Security headers, including a Content-Security-Policy with no inline scripts or styles, in `public/_headers`.
- Node's test runner for the contact form, display settings, skills list, Armagh chart, security headers and page weight.

## Run locally

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

Open the address printed by the development server. The local content editor is at `/admin/`; it is excluded from the deployed site.

```sh
npx vite build --mode live
npm test
```

## Content

- `content/site.json`: profile, links, skill groups and coursework modules.
- `content/cv.json`: education and work experience.
- `content/projects/`: Markdown case studies. Each one becomes a page at `/projects/<name>/`.
- `content/data/`: the annual Armagh figures behind the chart.
- `public/uploads/`: public CV, images and walkthrough videos.

## Code

- `src/render.mjs`: turns the content files into HTML at build time.
- `src/lib/`: the skills list, the Armagh chart and image sizes, each worked out at build time.
- `src/styles/`: one stylesheet per concern (`base`, `home`, `case`, `chart`, `motion`), ordered by cascade layers in `src/styles.css`.
- `src/main.js` and `src/chart.js`: the contact form and the chart readout. `public/theme.js`: display settings.
- `src/contact.mjs` and `src/worker.js`: validated, rate-limited contact form handling.
- `tests/`: run with `npm test`. `site.test.mjs` checks the built site, so build first.
- `DESIGN.md`: the design direction and the reasons behind it.

## Deployment

`npm run deploy` publishes to the Cloudflare account and domains configured in `cloudflare.config.ts`. To run your own copy, change those settings, the contact recipient and allowed origins, and configure your own Email Routing destination. Contact delivery requires the Cloudflare bindings; local preview alone does not send email.

`npm run deploy:staging` uses the same configured destination with indexing disabled. It is not a separate staging site.

Personal photographs, CV content and project media belong to their respective owners. No reuse licence is granted by making this source public.
