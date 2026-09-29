// Vectorize the sewing-machine silhouette from materials/logo.jpg.
// Outputs: assets/logo/logo-mark.svg (fill: currentColor), favicon.svg, favicon-32.png, apple-touch-icon.png,
// and prints a <symbol id="mark"> to paste inline into pages (external <use> does not work over file://).
import sharp from 'sharp';
import potrace from 'potrace';
import { writeFileSync, mkdirSync } from 'node:fs';

// Machine bounding box in the 640x640 source (text plate and circle excluded)
const box = { left: 180, top: 208, width: 276, height: 212 };
const scale = 4;
const INK = '#2E2520', LINEN = '#E6DECE';

const png = await sharp('materials/logo.jpg')
  .extract(box)
  .resize(box.width * scale, box.height * scale, { kernel: 'lanczos3' })
  .grayscale()
  .blur(1)
  .png()
  .toBuffer();

const traced = await new Promise((res, rej) =>
  potrace.trace(png, { threshold: 120, turdSize: 250, optTolerance: 0.6, alphaMax: 1 },
    (err, out) => (err ? rej(err) : res(out))));

const w = box.width * scale, h = box.height * scale;
const d = [...traced.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]).join(' ')
  .replace(/(\d+\.\d{1})\d+/g, '$1'); // trim coordinate precision
const path = `<path fill-rule="evenodd" d="${d}"/>`;

mkdirSync('assets/logo', { recursive: true });
writeFileSync('assets/logo/logo-mark.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" fill="currentColor">${path}</svg>\n`);
writeFileSync('assets/logo/logo-symbol.txt', `<symbol id="mark" viewBox="0 0 ${w} ${h}">${path}</symbol>\n`);

// Favicon: silhouette centered on a square canvas, ink on transparent
const side = w, pad = Math.round((side - h) / 2);
const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-pad} ${side} ${side}" fill="${INK}">${path}</svg>\n`;
writeFileSync('assets/logo/favicon.svg', fav);
await sharp(Buffer.from(fav)).resize(32, 32).png().toFile('assets/logo/favicon-32.png');
const touch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-side * 0.18} ${-pad - side * 0.18} ${side * 1.36} ${side * 1.36}"><rect x="${-side * 0.18}" y="${-pad - side * 0.18}" width="${side * 1.36}" height="${side * 1.36}" fill="${LINEN}"/><g fill="${INK}">${path}</g></svg>`;
await sharp(Buffer.from(touch)).resize(180, 180).png().toFile('assets/logo/apple-touch-icon.png');

console.log(`viewBox 0 0 ${w} ${h}; path ${d.length} chars`);
