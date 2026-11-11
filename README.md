# Jamie Parr - portfolio

Source for [jamieparr.dev](https://jamieparr.dev), my portfolio and project case studies.

The site includes project demos, a downloadable CV, a contact form, light and dark themes, and accessibility preferences for text size, contrast and motion.

## Stack

- HTML, CSS and JavaScript, with Vite generating the pages at build time.
- JSON and Markdown content files, with Sveltia CMS available locally.
- Cloudflare Workers and static assets, with Email Routing for the contact form.
- Node's test runner for contact handling and browser preferences.

## Run locally

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

Open the address printed by the development server. The local content editor is at `/admin/`; it is excluded from the deployed site.

```sh
npm test
npx vite build --mode live
```

## Content

- `content/site.json`: profile, navigation and links.
- `content/cv.json`: education and work experience.
- `content/projects/`: Markdown case studies.
- `public/uploads/`: public CV, images and walkthrough videos.
- `src/render.mjs`: page generation.
- `src/styles.css` and `public/theme.js`: presentation and preferences.
- `src/contact.mjs`: validated, rate-limited contact form handling.

## Deployment

`npm run deploy` publishes to the Cloudflare account and domains configured in `cloudflare.config.ts`. To run your own copy, change those settings, the contact recipient and allowed origins, and configure your own Email Routing destination. Contact delivery requires the Cloudflare bindings; local preview alone does not send email.

`npm run deploy:staging` uses the same configured destination with indexing disabled. It is not a separate staging site.

Personal photographs, CV content and project media belong to their respective owners. No reuse licence is granted by making this source public.
