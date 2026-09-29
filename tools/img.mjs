// Stock photo -> WebP. Usage: node tools/img.mjs <src> <out.webp> <longSide> [crop:w:h]
import sharp from 'sharp';
const [src, out, long = '1400', crop] = process.argv.slice(2);
let img = sharp(src).rotate();
const meta = await img.metadata();
if (crop) {
  // center-crop to aspect w:h before resizing
  const [, cw, ch] = crop.split(':').map(Number);
  const target = cw / ch, cur = meta.width / meta.height;
  const w = cur > target ? Math.round(meta.height * target) : meta.width;
  const h = cur > target ? meta.height : Math.round(meta.width / target);
  img = img.extract({ left: Math.round((meta.width - w) / 2), top: Math.round((meta.height - h) / 2), width: w, height: h });
}
const info = await img.resize({ width: +long, height: +long, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 78, effort: 6 }).toFile(out);
console.log(out, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)}KB`, `(src ${meta.width}x${meta.height})`);
