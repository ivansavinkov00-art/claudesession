// Скриншоты страницы через Playwright.
// node tools/shots.mjs            -> /screenshots: первый экран 1440x800, 1366x650, 390x664, 360x640 + вся страница на 1440
// node tools/shots.mjs review     -> .impeccable/review: ширины Tilda + 1920, полные страницы
// Нужен запущенный статический сервер: BASE (по умолчанию http://127.0.0.1:5507/)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const mode = process.argv[2] || 'deliver';
const BASE = process.argv[3] || 'http://127.0.0.1:5507/';

const sets = {
  deliver: {
    dir: 'screenshots',
    shots: [
      { name: 'hero-1440x800', w: 1440, h: 800 },
      { name: 'hero-1366x650', w: 1366, h: 650 },
      { name: 'hero-390x664', w: 390, h: 664, mobile: true },
      { name: 'hero-360x640', w: 360, h: 640, mobile: true },
      { name: 'full-1440', w: 1440, h: 900, full: true },
    ],
  },
  review: {
    dir: '.impeccable/review',
    shots: [
      { name: 'desktop', w: 1440, h: 900, full: true },
      { name: 'mobile', w: 390, h: 844, full: true, mobile: true },
      { name: 'w1920', w: 1920, h: 1080 },
      { name: 'w1200', w: 1200, h: 800 },
      { name: 'w960', w: 960, h: 900, full: true },
      { name: 'w640', w: 640, h: 900 },
      { name: 'w480', w: 480, h: 860, mobile: true },
      { name: 'w320', w: 320, h: 640, full: true, mobile: true },
    ],
  },
};

const { dir, shots } = sets[mode];
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
let problems = 0;
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1, reducedMotion: 'reduce',
    isMobile: !!s.mobile, hasTouch: !!s.mobile, locale: 'ru-RU',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (s.full) {
    // прогрузить lazy-картинки
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${dir}/${s.name}.png`, fullPage: !!s.full });
  const flag = overflow > 0 || errors.length;
  if (flag) problems++;
  console.log(`${s.name}.png  ${s.w}x${s.h}${s.full ? ' full' : ''}  overflowX=${overflow}${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
  await ctx.close();
}
await browser.close();
process.exitCode = problems ? 1 : 0;
