// Картинки из incoming/ → слоты assets/img/img-NN.webp.
// node tools/incoming.mjs            -> обработать все файлы incoming/ (кроме README.md)
// node tools/incoming.mjs --dry      -> только показать, что будет сделано
// node tools/incoming.mjs --keep     -> не удалять оригиналы из incoming/
//
// Номер слота — число в начале имени: 03.png, 07-platye.jpg.
// Кадрирование под пропорции слота с учётом безопасной зоны (tools/slots.mjs → position),
// длинная сторона — минимум слота из materials/images.md, WebP q80.
// Затем снимает data-placeholder с <img> этого слота в index.html (фото получает цветокоррекцию и object-fit: cover)
// и пишет img-NN.webp.json. CREDITS.md и таблицу слотов в README правит человек или Claude — скрипт напомнит.
// Смотреть картинку глазами (руки, игла, текст, серия 04–09) всё равно нужно: скрипт этого не умеет.
import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import sharp from 'sharp';
import { getSlot, slotFile } from './slots.mjs';

const flags = new Set(process.argv.slice(2));
const dry = flags.has('--dry');
const keep = flags.has('--keep');
const today = new Date().toISOString().slice(0, 10);

const files = readdirSync('incoming').filter((f) => f !== 'README.md' && !f.startsWith('.'));
if (!files.length) { console.log('incoming/ пуста'); process.exit(0); }

const done = [];
for (const file of files) {
  const m = file.match(/^(\d{1,2})(?!\d)/);
  const slot = m && getSlot(m[1]);
  if (!slot) { console.log(`пропуск ${file}: нет номера слота 01–13 в начале имени`); continue; }

  const src = `incoming/${file}`;
  const meta = await sharp(src).rotate().metadata();
  const [rw, rh] = slot.ratio;
  const [minW, minH] = slot.size;
  const srcRatio = meta.width / meta.height;
  const cropLoss = 1 - Math.min(srcRatio, rw / rh) / Math.max(srcRatio, rw / rh);
  const notes = [];
  if (meta.width < minW && meta.height < minH) notes.push(`меньше минимума ${minW}×${minH} — нужен апскейл`);
  if (cropLoss > 0.2) notes.push(`пропорции ${meta.width}×${meta.height} далеки от ${rw}:${rh}, срежется ${Math.round(cropLoss * 100)}% кадра`);

  // размер кадра: пропорции слота, не больше исходника (без увеличения) и не больше минимума слота
  const outW = Math.min(minW, Math.floor(Math.min(meta.width, meta.height * rw / rh)));
  const outH = Math.round(outW * rh / rw);

  const out = slotFile(slot.n);
  console.log(`${file} → ${out}  ${outW}×${outH}  (исходник ${meta.width}×${meta.height}, кадр: ${slot.position})${notes.length ? '\n  ⚠ ' + notes.join('\n  ⚠ ') : ''}`);
  if (dry) continue;

  const info = await sharp(src).rotate()
    .resize({ width: outW, height: outH, fit: 'cover', position: slot.position })
    .webp({ quality: 80, effort: 6 }).toFile(out);
  writeFileSync(`${out}.json`, JSON.stringify({ prompt: `Generated in Nano Banana (materials/images.md, slot ${slot.n} «${slot.label}»). Received ${today} as incoming/${file} (${meta.width}x${meta.height}), cropped ${rw}:${rh} (${slot.position}), WebP q80 via tools/incoming.mjs.` }) + '\n');
  console.log(`  записан ${Math.round(info.size / 1024)}KB`);

  // снять пометку заглушки с картинок этого слота
  if (existsSync('index.html')) {
    const html = readFileSync('index.html', 'utf8');
    const name = `img-${slot.n}.webp`;
    const next = html.replace(/<img\b[^>]*>/g, (tag) => (tag.includes(name) ? tag.replace(/\s+data-placeholder(="[^"]*")?/g, '') : tag));
    if (next !== html) { writeFileSync('index.html', next); console.log('  index.html: снят data-placeholder'); }
  }
  if (!keep) unlinkSync(src);
  done.push(slot.n);
}

if (done.length) {
  console.log(`\nГотово: слоты ${done.join(', ')}.`);
  console.log('Дальше: обновить CREDITS.md и таблицу слотов в README, снять скриншоты: node tools/shots.mjs v2 --only=<экран>');
}
