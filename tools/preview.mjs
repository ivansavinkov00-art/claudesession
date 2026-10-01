// Собирает один самодостаточный HTML из index.html для отправки на просмотр: CSS, JS, шрифты, картинки и PDF внутри.
// node tools/preview.mjs <out.html> [--theme=dark]   (запускать из корня проекта; --theme=dark открывает тёмную тему по умолчанию)
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
const theme = (process.argv.find((a) => a.startsWith('--theme=')) || '').slice(8);
if (theme === 'dark') html = html.replace('data-theme-default="light"', 'data-theme-default="dark"');
// CSS тёмной темы в одном файле лежит всегда (скрипт видит [data-theme-css] и ничего не подгружает)
html = html.replace('<link rel="stylesheet" href="theme-base.css">', '<link rel="stylesheet" href="theme-base.css">\n<link rel="stylesheet" href="theme-dark.css" data-theme-css>');
// загрузчик тёмного CSS из скрипта темы заменяем заглушкой: стили уже внутри файла
html = html.replace(/window\.ksLoadDark = function \(cb\) \{[\s\S]*?if \(t === 'dark'\) window\.ksLoadDark\(\);/, "window.ksLoadDark = function (cb) { if (cb) cb(); };");
// предзагрузки из инлайн-скрипта темы в одном файле не нужны (файлов рядом нет)
html = html.replace(/\n  \/\/ предзагрузка[\s\S]*?\n  \}\);\n/, '\n');

// стили: url(assets/...) внутри CSS → data URI
const css = (file) => readFileSync(root + file, 'utf8').replace(/url\((assets\/[^)]+)\)/g, (_, p) => `url(${dataUri(p)})`);
html = html.replace(/<noscript>[\s\S]*?<\/noscript>\n?/g, ''); // запасные ссылки на CSS модулей не нужны: стили уже внутри
html = html.replace(/<link rel="stylesheet" href="([^"]+)"([^>]*)>/g, (_, f, rest) => `<style${rest.includes('data-theme-css') ? ' data-theme-css' : ''}>\n${css(f)}\n</style>`);

// скрипты уходят в конец body (defer у inline не работает)
const scripts = [];
html = html.replace(/<script src="([^"]+)" defer><\/script>\n?/g, (_, f) => { scripts.push(readFileSync(root + f, 'utf8')); return ''; });

// предзагрузки и иконки не нужны
html = html.replace(/<link rel="(preload|icon|apple-touch-icon)"[^>]*>\n?/g, '');

// картинки, PDF
html = html.replace(/(src|href)="(assets\/(?:img|price-demo)[^"]+)"/g, (_, attr, p) => `${attr}="${dataUri(p)}"`);
html = html.replace(/srcset="([^"]+)"/g, (_, v) => `srcset="${v.replace(/assets\/img\/[^\s,]+/g, (p) => dataUri(p))}"`);
const tail = scripts.map((s) => `<script>\n${s}\n</script>`).join('\n') + '\n</body>';
html = html.replace('</body>', () => tail);
html = html.replace(/<meta property="og:image"[^>]*>\n?/g, '');
writeFileSync(process.argv[2], html);
console.log(process.argv[2], Math.round(html.length / 1024) + ' KB');
