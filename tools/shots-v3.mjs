// Скриншоты слоя v3 (PLAN-v3.md). Нужен сервер: python3 -m http.server 5507.
// node tools/shots-v3.mjs [BASE]  ->  screenshots/v3/*.png
//   hero-*        первый экран на типовых окнах (движение включено, WebGL-ткань через swiftshader)
//   sec-*         экраны по якорям на 1440 и 390 (движение включено)
//   full-*        вся страница (reduced motion: scroll-driven части сразу в конечном состоянии)
import { launch } from './browser.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.argv.find((a) => a.startsWith('http')) || 'http://127.0.0.1:5507/';
const dir = 'screenshots/v3';
mkdirSync(dir, { recursive: true });
const browser = await launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function page(w, h, reducedMotion) {
  const mobile = w < 700;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion, isMobile: mobile, hasTouch: mobile, locale: 'ru-RU' });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1600);
  return p;
}

for (const [w, h] of [[1440, 900], [1366, 650], [1024, 768], [768, 1024], [390, 844], [360, 640]]) {
  const p = await page(w, h, 'no-preference');
  await p.screenshot({ path: `${dir}/hero-${w}x${h}.png` });
  await p.context().close();
}

const SECTIONS = [['proizvodstvo', '#proizvodstvo'], ['osnovatel', '#osnovatel'], ['portfolio', '#portfolio'], ['zadachi', '#zadachi'], ['raschet', '#raschet'], ['final', '.final']];
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await page(w, h, 'no-preference');
  for (const [name, sel] of SECTIONS) {
    await p.evaluate((s) => scrollTo({ top: document.querySelector(s).getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }), sel);
    await p.waitForTimeout(1300);
    await p.screenshot({ path: `${dir}/sec-${name}-${w}.png` });
  }
  await p.context().close();
}

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await page(w, h, 'reduce');
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 400) { await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(60); }
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${dir}/full-${w}.png`, fullPage: true });
  await p.context().close();
}
await browser.close();
console.log('готово:', dir);
