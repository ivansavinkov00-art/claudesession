// Снимки для сравнения тем: страница целиком и первый экран при reduced motion (движение и ткань не мешают сравнению).
// node tools/theme-shots.mjs <папка> [light|dark] [BASE]
import { launch } from './browser.mjs';
import { mkdirSync } from 'node:fs';
const [, , dir = 'screenshots/v4/tmp', theme = 'light', base = 'http://127.0.0.1:5507/'] = process.argv;
mkdirSync(dir, { recursive: true });
const b = await launch();
const HIDE = '.theme-toggle,.header-cta{display:none!important}'; // кнопки темы есть только после v4: из сравнения исключаем
for (const [w, h, full] of [[1440, 900, true], [390, 844, true], [1920, 1080, false], [1366, 650, false]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', isMobile: w < 700, hasTouch: w < 700 });
  const p = await ctx.newPage();
  await p.goto(`${base}?theme=${theme}`, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: HIDE });
  await p.evaluate(() => document.fonts.ready);
  if (full) {
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 400) { await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(50); }
    await p.evaluate(() => scrollTo(0, 0));
  }
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${dir}/${full ? 'full' : 'hero'}-${w}.png`, fullPage: full });
  await ctx.close();
}
await b.close();
