// Собирает один самодостаточный HTML из index.html для отправки на просмотр: CSS, JS, шрифты, картинки и PDF внутри.
// node tools/preview.mjs <out.html>   (запускать из корня проекта)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', woff2: 'font/woff2', pdf: 'application/pdf' };
const dataUri = (rel) => {
  const path = root + rel;
  if (!existsSync(path)) return rel;
  const ext = rel.split('.').pop();
  return `data:${mime[ext]};base64,${readFileSync(path).toString('base64')}`;
};
let html = readFileSync(root + 'index.html', 'utf8');

// стили: url(assets/...) внутри CSS → data URI
const css = (file) => readFileSync(root + file, 'utf8').replace(/url\((assets\/[^)]+)\)/g, (_, p) => `url(${dataUri(p)})`);
html = html.replace(/<noscript>[\s\S]*?<\/noscript>\n?/g, ''); // запасные ссылки на CSS модулей не нужны: стили уже внутри
html = html.replace(/<link rel="stylesheet" href="([^"]+)"[^>]*>/g, (_, f) => `<style>\n${css(f)}\n</style>`);

// скрипты уходят в конец body (defer у inline не работает)
const scripts = [];
html = html.replace(/<script src="([^"]+)" defer><\/script>\n?/g, (_, f) => { scripts.push(readFileSync(root + f, 'utf8')); return ''; });

// предзагрузки и иконки не нужны
html = html.replace(/<link rel="(preload|icon|apple-touch-icon)"[^>]*>\n?/g, '');

// картинки, PDF
html = html.replace(/(src|href)="(assets\/(?:img|price-demo)[^"]+)"/g, (_, attr, p) => `${attr}="${dataUri(p)}"`);
const tail = scripts.map((s) => `<script>\n${s}\n</script>`).join('\n') + '\n</body>';
html = html.replace('</body>', () => tail);
html = html.replace(/<meta property="og:image"[^>]*>\n?/g, '');
writeFileSync(process.argv[2], html);
console.log(process.argv[2], Math.round(html.length / 1024) + ' KB');
