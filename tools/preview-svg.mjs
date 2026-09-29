// Render an SVG (currentColor -> ink) on linen to PNG for eyeballing. Usage: node tools/preview-svg.mjs <in.svg> <out.png> [width]
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const [inp, out, w = '900'] = process.argv.slice(2);
const svg = readFileSync(inp, 'utf8').replaceAll('currentColor', '#2E2520');
console.log(await sharp(Buffer.from(svg)).resize(+w).flatten({ background: '#E6DECE' }).png().toFile(out));
