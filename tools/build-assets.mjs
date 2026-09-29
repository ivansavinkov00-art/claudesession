// Генерирует assets/price-demo.pdf (из tools/price-demo.html) и assets/og.jpg (первый экран 1200x630).
// node tools/build-assets.mjs [BASE]  — для OG нужен запущенный сервер (по умолчанию http://127.0.0.1:5507/)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const BASE = process.argv[2] || 'http://127.0.0.1:5507/';
const browser = await chromium.launch();

// PDF: подставляем символ логотипа в шаблон и печатаем A4
const symbol = readFileSync('assets/logo/logo-symbol.txt', 'utf8');
const html = readFileSync('tools/price-demo.html', 'utf8').replace('<!--SYMBOL-->', `<svg width="0" height="0" style="position:absolute">${symbol}</svg>`);
writeFileSync('tools/.price-demo.tmp.html', html);
const pdfPage = await browser.newPage();
await pdfPage.goto(pathToFileURL('tools/.price-demo.tmp.html').href, { waitUntil: 'networkidle' });
await pdfPage.evaluate(() => document.fonts.ready);
await pdfPage.pdf({ path: 'assets/price-demo.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
rmSync('tools/.price-demo.tmp.html');
console.log('assets/price-demo.pdf');

// OG: первый экран без ленты
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: '.tape{display:none!important} body{padding-right:0!important} .hero-arch{height:500px!important}' });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile('assets/og.jpg');
console.log('assets/og.jpg');
await browser.close();
