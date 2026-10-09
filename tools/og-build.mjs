// Картинки для соцсетей: assets/og/<slug>.jpg (1200×630) по одной на страницу, из заголовка и фото страницы.
// node tools/og-build.mjs [slug …]   Шрифты и палитра — из сайта (шоколад, крем, акцент), текст берётся из seo/*.json.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './browser.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const J = (p) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));
const sem = J('seo/semantics.json');
const semBySlug = Object.fromEntries(sem.pages.map((p) => [p.url.replace(/^\/|\/$/g, ''), p]));
const pages = readdirSync(resolve(ROOT, 'seo/pages')).filter((f) => f.endsWith('.json')).map((f) => J(`seo/pages/${f}`));
const only = process.argv.slice(2);
const items = pages.map((p) => ({ slug: p.slug, h1: p.h1 || semBySlug[p.slug]?.h1, image: p.image.src, kicker: p.eyebrow || 'Каталог' }));

const font = (f) => pathToFileURL(resolve(ROOT, 'assets/fonts', f)).href;
const html = ({ h1, image, kicker }) => `<!doctype html><html lang="ru"><meta charset="utf-8"><style>
@font-face{font-family:"Playfair Display";font-weight:400 900;src:url(${font('playfair-display-cyrillic-wght-normal.woff2')}) format("woff2");unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"Playfair Display";font-weight:400 900;src:url(${font('playfair-display-latin-wght-normal.woff2')}) format("woff2");unicode-range:U+0020-007E,U+00A0,U+00AB,U+00BB,U+2010-2015,U+2018-201D,U+2022,U+2026}
@font-face{font-family:"Onest";font-weight:100 900;src:url(${font('onest-cyrillic-wght-normal.woff2')}) format("woff2");unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}
@font-face{font-family:"Onest";font-weight:100 900;src:url(${font('onest-latin-wght-normal.woff2')}) format("woff2");unicode-range:U+0020-007E,U+00A0,U+00AB,U+00BB,U+2010-2015,U+2018-201D,U+2022,U+2026}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#1F110B;color:#F6ECDA;font-family:"Onest",sans-serif;display:grid;grid-template-columns:1fr 430px;overflow:hidden}
.t{padding:64px 24px 56px 72px;display:flex;flex-direction:column}
.k{font:500 22px/1.2 "Onest";letter-spacing:.14em;text-transform:uppercase;color:#D9A184}
h1{margin-top:28px;font:600 62px/1.06 "Playfair Display",serif;letter-spacing:-.01em;text-wrap:balance}
.b{margin-top:auto;display:flex;align-items:center;gap:20px}
.plate{border:2px solid #F6ECDA;padding:10px 18px;font:500 20px/1 "Onest";letter-spacing:.2em;text-transform:uppercase}
.d{font:400 22px/1 "Onest";color:#CDB8A2}
.m{position:relative;margin:48px 56px 0 0;border-radius:999px 999px 0 0;overflow:hidden;outline:2px dashed #D9A184;outline-offset:12px}
.m img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
</style><body><div class="t"><div class="k">${kicker}</div><h1>${h1}</h1><div class="b"><span class="plate">Культура шитья</span><span class="d">aksenovasew.ru · Челябинск</span></div></div>
<div class="m"><img src="${pathToFileURL(resolve(ROOT, image)).href}" alt=""></div></body></html>`;

mkdirSync(resolve(ROOT, 'assets/og'), { recursive: true });
const tmp = resolve(ROOT, 'assets/og/_card.html');
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
let n = 0;
for (const it of items) {
  if (only.length && !only.includes(it.slug)) continue;
  writeFileSync(tmp, html({ ...it, h1: it.h1.replace(/&/g, '&amp;') }));
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.screenshot({ path: resolve(ROOT, `assets/og/${it.slug}.jpg`), type: 'jpeg', quality: 82 });
  n++;
}
rmSync(tmp, { force: true });
await browser.close();
console.log(`og: ${n} картинок в assets/og/`);
