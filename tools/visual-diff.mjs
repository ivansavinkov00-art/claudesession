// Попиксельное сравнение двух PNG: доля пикселей, у которых любой канал отличается больше порога.
// node tools/visual-diff.mjs a.png b.png [diff.png] [порог=8]
import sharp from 'sharp';
const [, , a, b, out, thr = '8'] = process.argv;
if (!a || !b) { console.error('usage: visual-diff a.png b.png [diff.png] [threshold]'); process.exit(2); }
const load = (f) => sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const [A, B] = await Promise.all([load(a), load(b)]);
if (A.info.width !== B.info.width || A.info.height !== B.info.height) {
  console.log(`size differs: ${A.info.width}x${A.info.height} vs ${B.info.width}x${B.info.height}`);
  process.exit(1);
}
const n = A.info.width * A.info.height;
const diff = Buffer.alloc(n * 3);
let bad = 0;
for (let i = 0; i < n; i++) {
  let d = 0;
  for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 3 + c] - B.data[i * 3 + c]));
  if (d > +thr) { bad++; diff[i * 3] = 255; } else { const g = A.data[i * 3] >> 2; diff[i * 3] = diff[i * 3 + 1] = diff[i * 3 + 2] = g; }
}
const pct = (bad / n) * 100;
console.log(`${pct.toFixed(4)}% (${bad} из ${n})`);
if (out) await sharp(diff, { raw: { width: A.info.width, height: A.info.height, channels: 3 } }).png().toFile(out);
process.exit(pct <= 0.05 ? 0 : 1);
