// Renders cv/cv.html to public/uploads/Jamie-Parr-CV.pdf. Run: npm run cv
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = 'file:///' + path.join(here, 'cv.html').replace(/\\/g, '/');
const out = path.join(here, '..', 'public', 'uploads', 'Jamie-Parr-CV.pdf');

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(src, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  console.log('Wrote', out);
} finally {
  await browser.close();
}
