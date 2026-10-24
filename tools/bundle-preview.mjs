// Собирает preview.html: одна страница со встроенными CSS, JS, шрифтами, фото и PDF.
// Запуск: node tools/bundle-preview.mjs  →  preview.html в корне
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p));
const mime = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", svg: "image/svg+xml", woff2: "font/woff2", pdf: "application/pdf" };
const dataUri = (p) => `data:${mime[p.split(".").pop()]};base64,${read(p).toString("base64")}`;

let html = read("index.html").toString("utf8");
let css = read("styles.css").toString("utf8");
const js = read("script.js").toString("utf8");

css = css.replace(/url\((assets\/[^)]+)\)/g, (_, p) => `url(${dataUri(p)})`);

// preload-подсказки и внешние файлы не нужны
html = html.replace(/<link rel="preload"[^>]*>\n?/g, "");
html = html.replace(/<link rel="icon" href="(assets\/[^"]+)"/g, (_, p) => `<link rel="icon" href="${dataUri(p)}"`);
html = html.replace(/<link rel="apple-touch-icon" href="(assets\/[^"]+)"/g, (_, p) => `<link rel="apple-touch-icon" href="${dataUri(p)}"`);
html = html.replace(/<link rel="stylesheet" href="styles\.css">/, () => `<style>\n${css}\n</style>`);
html = html.replace(/<script src="script\.js" defer><\/script>\n?/, "");
html = html.replace("</body>", () => `<script>\n${js}\n</script>\n</body>`);
html = html.replace(/(src|href)="(assets\/[^"]+\.(?:webp|png|jpg|svg|pdf))"/g, (_, a, p) => `${a}="${dataUri(p)}"`);

const left = html.match(/(?:src|href)="assets\/[^"]*"|url\(assets\/[^)]*\)/g);
if (left) throw new Error("не встроено: " + left.join(", "));

writeFileSync(join(root, "preview.html"), html);
console.log(`preview.html: ${(html.length / 1024).toFixed(0)} КБ`);
