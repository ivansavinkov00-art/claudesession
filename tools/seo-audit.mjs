// SEO-аудит собранного сайта (без браузера и сети).
//   node tools/seo-audit.mjs            ошибки роняют команду, предупреждения только печатаются
//   node tools/seo-audit.mjs --release  метки [уточнить] (.todo) тоже считаются ошибкой: перед выкладкой
//   node tools/seo-audit.mjs --json     машинный вывод
// Что проверяется: title/description (длина, уникальность), один H1, canonical, OG и картинки 1200×630, alt у всех картинок,
// JSON-LD (разбор, типы, совпадение хлебных крошек и FAQ с видимым текстом), структура заголовков, внутренние ссылки (битые, сироты,
// глубина), sitemap и robots, 404, ключи семантики в тексте (основная фраза, покрытие, переспам), дубли текста между страницами.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'htmlparser2';
import { selectAll, selectOne } from 'css-select';
import { textContent, getAttributeValue } from 'domutils';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RELEASE = process.argv.includes('--release');
const AS_JSON = process.argv.includes('--json');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const site = JSON.parse(read('seo/site.json'));
const sem = JSON.parse(read('seo/semantics.json'));
const NB = / /g;

const errors = [];
const warns = [];
const infos = [];
const err = (page, msg) => errors.push({ page, msg });
const warn = (page, msg) => warns.push({ page, msg });

// ---------- загрузка страниц ----------
const pathOf = (loc) => loc.replace(site.domain, '');
const fileOf = (path) => (path.endsWith('/') ? `${path.slice(1)}index.html` : path.slice(1));
const sitemap = read('sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => ({ loc: m[1], lastmod: m[2] }));
const pages = {};
for (const u of urls) {
  const path = pathOf(u.loc);
  const file = fileOf(path);
  if (!existsSync(resolve(ROOT, file))) { err(path, `в sitemap есть, файла нет: ${file}`); continue; }
  pages[path] = { path, file, html: read(file), indexable: true, lastmod: u.lastmod };
}
for (const [extra, path] of [['404.html', '/404.html'], ['consent/index.html', '/consent/']]) {
  if (!existsSync(resolve(ROOT, extra))) { err(extra, 'файл не найден'); continue; }
  pages[path] = { path, file: extra, html: read(extra), indexable: false };
}
for (const p of Object.values(pages)) p.dom = parseDocument(p.html);

const $ = (p, sel) => selectOne(sel, p.dom);
const $$ = (p, sel) => selectAll(sel, p.dom);
const attr = (el, name) => (el ? getAttributeValue(el, name) : undefined);
const text = (el) => textContent(el).replace(NB, ' ').replace(/\s+/g, ' ').trim();
const meta = (p, sel) => attr($(p, sel), 'content');

// ---------- морфология «на коленке»: основа = первые 5 букв ----------
const STOP = new Set(['на', 'в', 'и', 'из', 'для', 'по', 'от', 'до', 'с', 'к', 'у', 'о', 'за', 'под', 'при', 'не', 'как', 'или']);
const words = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
const stem = (w) => (w.length > 5 ? w.slice(0, 5) : w);
const stems = (s) => words(s).filter((w) => !STOP.has(w)).map(stem);

// ---------- проверки страниц ----------
const titles = new Map(); const descs = new Map(); const h1s = new Map(); const faqQ = new Map();
const bodyText = {};
const phrasesBySlug = {};
const pageMetaSem = Object.fromEntries(sem.pages.map((p) => [p.url === '/' ? '/' : `${p.url}/`, p]));

for (const p of Object.values(pages)) {
  const id = p.path;
  const robots = meta(p, 'meta[name="robots"]') || '';
  const indexable = p.indexable;
  if (indexable && /noindex/i.test(robots)) err(id, 'страница в sitemap, но noindex');
  if (!indexable && !/noindex/i.test(robots)) err(id, 'служебная страница без noindex');
  if (attr($(p, 'html'), 'lang') !== 'ru') err(id, 'нет lang="ru"');
  if (!$(p, 'meta[name="viewport"]')) err(id, 'нет viewport');
  if (!$(p, 'meta[charset]')) err(id, 'нет meta charset');

  // title
  const title = text($(p, 'title') || { children: [] });
  if (!title) err(id, 'нет <title>');
  else {
    if (title.length > 70) err(id, `title длиннее 70 знаков (${title.length})`);
    if (title.length < 20) warn(id, `title короче 20 знаков (${title.length})`);
    if (titles.has(title)) err(id, `title повторяется на ${titles.get(title)}`); else titles.set(title, id);
  }
  // description
  const d = meta(p, 'meta[name="description"]');
  if (!d) err(id, 'нет meta description');
  else {
    if (d.length > 160) err(id, `description длиннее 160 знаков (${d.length})`);
    if (d.length < 70) warn(id, `description короче 70 знаков (${d.length})`);
    if (descs.has(d)) err(id, `description повторяется на ${descs.get(d)}`); else descs.set(d, id);
  }
  // h1
  const h1 = $$(p, 'h1');
  if (h1.length !== 1) err(id, `H1 должен быть один, найдено ${h1.length}`);
  else {
    const t = text(h1[0]);
    if (h1s.has(t)) err(id, `H1 повторяется на ${h1s.get(t)}`); else h1s.set(t, id);
  }
  // иерархия заголовков
  let prev = 0;
  for (const h of $$(p, 'h1, h2, h3, h4')) {
    const lvl = Number(h.name[1]);
    if (prev && lvl > prev + 1) { err(id, `пропущен уровень заголовка: h${prev} → h${lvl} («${text(h).slice(0, 40)}»)`); break; }
    prev = lvl;
  }
  // canonical и OG
  const canon = attr($(p, 'link[rel="canonical"]'), 'href');
  const expect = indexable ? `${site.domain}${p.path}` : `${site.domain}${p.path}`;
  if (!canon) err(id, 'нет canonical');
  else if (canon !== expect) err(id, `canonical ${canon} ≠ ${expect}`);
  for (const k of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:locale']) if (!meta(p, `meta[property="${k}"]`)) err(id, `нет ${k}`);
  if (meta(p, 'meta[property="og:url"]') && meta(p, 'meta[property="og:url"]') !== canon) err(id, 'og:url ≠ canonical');
  if (meta(p, 'meta[name="twitter:card"]') !== 'summary_large_image') err(id, 'нет twitter:card');
  const og = meta(p, 'meta[property="og:image"]');
  if (og) {
    if (!og.startsWith('https://')) err(id, 'og:image должен быть абсолютным https');
    const f = og.replace(site.domain, '').slice(1);
    if (!existsSync(resolve(ROOT, f))) err(id, `og:image не найден: ${f}`);
    else {
      const m = await sharp(resolve(ROOT, f)).metadata();
      if (m.width !== 1200 || m.height !== 630) err(id, `og:image ${m.width}×${m.height}, нужно 1200×630`);
      if (statSync(resolve(ROOT, f)).size > 300 * 1024) warn(id, 'og:image тяжелее 300 КБ');
    }
  }
  // картинки
  for (const img of $$(p, 'img')) {
    const a = attr(img, 'alt');
    const src = attr(img, 'src') || '';
    if (a === undefined) err(id, `у картинки нет alt: ${src}`);
    else if (a === '' && !img.parent?.attribs?.['aria-hidden'] && !selectOne('[aria-hidden="true"]', img.parent) && !attr(img.parent?.parent || img.parent, 'aria-hidden')) {
      // пустой alt допустим у декоративных картинок: проверяем, что рядом нет смыслового текста — считаем декоративной, если картинка внутри label/кнопки/aria-hidden
      const deco = img.parent && ['label', 'span', 'picture', 'button', 'a'].includes(img.parent.name);
      if (!deco) warn(id, `пустой alt у картинки вне декоративного контейнера: ${src}`);
    }
    if (a && /\.(jpe?g|png|webp)$/i.test(a)) err(id, `alt похож на имя файла: ${a}`);
    if (a && a.length > 125) warn(id, `alt длиннее 125 знаков: ${src}`);
    if (!attr(img, 'width') || !attr(img, 'height')) warn(id, `у картинки нет width/height (скачок вёрстки): ${src}`);
    if (src && !src.startsWith('http') && !src.startsWith('data:')) {
      const f = (src.startsWith('/') ? src.slice(1) : join(dirname(p.file), src)).split('?')[0];
      if (!existsSync(resolve(ROOT, f))) err(id, `картинка не найдена: ${src}`);
    }
  }
  // JSON-LD
  const lds = $$(p, 'script[type="application/ld+json"]');
  if (indexable && !lds.length) err(id, 'нет JSON-LD');
  const graph = [];
  for (const s of lds) {
    try { const j = JSON.parse(textContent(s)); graph.push(...(j['@graph'] || [j])); } catch (e) { err(id, `JSON-LD не разбирается: ${e.message}`); }
  }
  const types = (n) => [].concat(n['@type'] || []);
  const has = (t) => graph.find((n) => types(n).includes(t));
  p.graph = graph;
  if (indexable) {
    const org = has('LocalBusiness');
    if (!org) err(id, 'нет Organization/LocalBusiness');
    else {
      for (const k of ['name', 'url', 'telephone', 'address', 'logo']) if (!org[k]) err(id, `в LocalBusiness нет ${k}`);
      if (org.address && !org.address.addressLocality) err(id, 'в адресе нет addressLocality');
    }
    if (id !== '/' && !has('BreadcrumbList')) err(id, 'нет BreadcrumbList');
    if (has('BreadcrumbList')) {
      const ld = has('BreadcrumbList').itemListElement.map((i) => i.name.replace(NB, ' '));
      const vis = $$(p, '.crumbs li').map((li) => text(li));
      if (vis.length && JSON.stringify(ld) !== JSON.stringify(vis)) err(id, `хлебные крошки в разметке (${ld.join(' › ')}) ≠ видимым (${vis.join(' › ')})`);
    }
    const faq = has('FAQPage');
    const vis = $$(p, 'details.faq-item > summary').map((s) => text(s));
    if (faq) {
      const q = faq.mainEntity.map((x) => x.name.replace(NB, ' '));
      if (JSON.stringify(q) !== JSON.stringify(vis)) err(id, 'вопросы FAQ в разметке не совпадают с видимыми');
      const answers = $$(p, 'details.faq-item .faq-a').map((a) => text(a));
      faq.mainEntity.forEach((x, i) => { if (answers[i] && x.acceptedAnswer.text.replace(/\s+/g, ' ') !== answers[i]) err(id, `ответ FAQ #${i + 1} в разметке отличается от видимого`); });
      for (const x of q) { if (faqQ.has(x)) err(id, `вопрос FAQ «${x.slice(0, 50)}» повторяется на ${faqQ.get(x)}`); else faqQ.set(x, id); }
    } else if (vis.length) err(id, 'FAQ на странице есть, а FAQPage в разметке нет');
    if (vis.length && vis.length < 5) warn(id, `вопросов FAQ ${vis.length}, ожидалось 5`);
    if (id !== '/' && id !== '/privacy/' && !has('Service') && !has('CollectionPage')) err(id, 'нет Service/CollectionPage');
    if (has('Service') && !has('Service').provider) err(id, 'у Service нет provider');
    if (graph.some((n) => types(n).includes('AggregateRating'))) err(id, 'AggregateRating без данных платформы с отзывами нельзя (риск ручных мер)');
    if (graph.some((n) => types(n).includes('Review')) && !$$(p, '.pg-review').length) err(id, 'Review в разметке без видимых отзывов');
  }
  // ссылки
  const seenAnchors = new Set($$(p, '[id]').map((e) => attr(e, 'id')));
  const out = new Set();
  for (const a of $$(p, 'a[href]')) {
    const href = attr(a, 'href');
    if (!text(a) && !attr(a, 'aria-label') && !$$({ dom: a }, 'img[alt], svg title').length) warn(id, `ссылка без текста: ${href}`);
    if (/^(https?:)?\/\//.test(href)) {
      if (attr(a, 'target') === '_blank' && !/noopener/.test(attr(a, 'rel') || '')) err(id, `внешняя ссылка с target=_blank без rel=noopener: ${href}`);
      continue;
    }
    if (/^(tel:|mailto:|javascript:)/.test(href)) continue;
    if (href === '#') { if (!('data-stub' in a.attribs)) warn(id, 'ссылка href="#" без data-stub'); continue; }
    if (href.startsWith('#')) { if (!seenAnchors.has(href.slice(1))) err(id, `якорь не найден на странице: ${href}`); continue; }
    const [pathPart, hash] = href.split('#');
    const base = p.path.endsWith('/') ? p.path : `${dirname(p.path)}/`;
    const target = pathPart.startsWith('/') ? pathPart : join(base, pathPart);
    const file = fileOf(target);
    if (!existsSync(resolve(ROOT, file)) && !existsSync(resolve(ROOT, target.slice(1)))) { err(id, `битая внутренняя ссылка: ${href}`); continue; }
    if (hash && pages[target]) { const ids = new Set(selectAll('[id]', pages[target].dom).map((e) => attr(e, 'id'))); if (!ids.has(hash)) err(id, `якорь ${href} не найден на целевой странице`); }
    if (pages[target] && target !== p.path) out.add(target);
  }
  p.out = out;
  // служебные требования лендинга
  if (indexable && id !== '/privacy/') {
    if (!$(p, '[data-hero-actions]') && id !== '/') err(id, 'нет блока кнопок первого экрана');
    if (!$(p, '#raschet')) err(id, 'нет калькулятора #raschet');
    if (!$(p, 'a[href^="tel:"]')) err(id, 'нет кликабельного телефона');
    if (!$(p, '[data-sticky-cta]')) err(id, 'нет липкой кнопки для мобильных');
    if (!$(p, 'a.skip')) err(id, 'нет ссылки «перейти к содержимому»');
  }
  if (Buffer.byteLength(p.html) > 200 * 1024) warn(id, `HTML тяжелее 200 КБ (${Math.round(Buffer.byteLength(p.html) / 1024)} КБ)`);
  const todos = $$(p, '.todo').length;
  p.todos = todos;
  if (todos) (RELEASE ? err : warn)(id, `меток [уточнить]: ${todos}`);

  // текст для анализа ключей: без шапки, подвала, квиза, финала
  const clone = parseDocument(p.html);
  for (const sel of ['header', 'footer.site-footer', '.s-calc:not(.s-faq)', '.final', 'dialog', 'script', 'style', 'svg', '.cookie', '.crumbs']) for (const e of selectAll(sel, clone)) e.parent && (e.parent.children = e.parent.children.filter((c) => c !== e));
  p.body = textContent(selectOne('main', clone) || clone).replace(NB, ' ').replace(/\s+/g, ' ').trim();
  p.blocks = selectAll('p, li, summary, h1, h2, h3, dd, dt', selectOne('main', clone) || clone).map((e) => text(e)).filter(Boolean);
}

// ---------- ключи семантики ----------
const slugOf = (path) => (path === '/' ? '/' : path.replace(/^\/|\/$/g, ''));
const pageJson = (slug) => (existsSync(resolve(ROOT, `seo/pages/${slug}.json`)) ? JSON.parse(read(`seo/pages/${slug}.json`)) : null);
for (const p of Object.values(pages)) {
  if (!p.indexable) continue;
  const slug = slugOf(p.path);
  const words_n = words(p.body).length;
  p.words = words_n;
  const cfg = slug === '/' ? { primary: 'швейное производство челябинск', secondary: ['швейная фабрика челябинск', 'производство одежды челябинск', 'контрактный пошив одежды'] } : pageJson(slug);
  if (!cfg || !cfg.primary) continue;
  const minWords = slug === '/' ? 250 : ['privacy', 'uslugi'].includes(slug) ? 200 : 300; // каталог и политика короче лендингов
  if (words_n < minWords) err(p.path, `мало текста: ${words_n} слов, нужно от ${minWords}`);
  const title = text($(p, 'title')); const h1 = text($(p, 'h1'));
  const head = new Set(stems(`${title} ${h1}`));
  const prim = stems(cfg.primary);
  const missingHead = prim.filter((s) => !head.has(s));
  if (missingHead.length) (slug === '/' ? warn : err)(p.path, `основной ключ «${cfg.primary}» не целиком в title+H1 (нет основ: ${missingHead.join(', ')})`);
  const inBlock = p.blocks.some((b) => { const set = new Set(stems(b)); return prim.every((s) => set.has(s)); });
  if (!inBlock) err(p.path, `основной ключ «${cfg.primary}» не встречается в одном абзаце текста`);
  const sec = cfg.secondary || [];
  const covered = sec.filter((ph) => p.blocks.some((b) => { const set = new Set(stems(b)); return stems(ph).every((s) => set.has(s)); }));
  const ratio = sec.length ? covered.length / sec.length : 1;
  phrasesBySlug[slug] = { primary: cfg.primary, covered: covered.length, total: sec.length, missing: sec.filter((x) => !covered.includes(x)) };
  if (ratio < 0.5) warn(p.path, `вторичные ключи в тексте: ${covered.length} из ${sec.length}; нет: ${phrasesBySlug[slug].missing.join('; ')}`);
  // переспам: доля самой частой основы среди значимых слов
  const cnt = new Map();
  for (const w of words(p.body).filter((x) => x.length > 3 && !STOP.has(x))) cnt.set(stem(w), (cnt.get(stem(w)) || 0) + 1);
  const [topStem, topN] = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
  const share = topN / Math.max(1, words_n);
  if (share > 0.07) warn(p.path, `слово «${topStem}…» занимает ${(share * 100).toFixed(1)}% текста: проверьте переспам`);
  // фразы ядра, которых нет в семантике (ключи в json должны быть из ядра)
  for (const ph of [cfg.primary, ...sec]) if (!sem.phrases.some((x) => x.phrase === ph)) warn(p.path, `ключ «${ph}» не найден в ядре (seo/semantics.json)`);
}

// ---------- дубли текста между страницами ----------
const shingles = (s) => { const w = words(s); const set = new Set(); for (let i = 0; i + 4 <= w.length; i++) set.add(w.slice(i, i + 4).join(' ')); return set; };
const sh = {};
for (const p of Object.values(pages)) if (p.indexable && !['/', '/privacy/'].includes(p.path)) sh[p.path] = shingles(p.body);
const keys = Object.keys(sh);
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
  const a = sh[keys[i]]; const b = sh[keys[j]];
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  const jac = inter / (a.size + b.size - inter);
  if (jac > 0.2) (jac > 0.35 ? err : warn)(`${keys[i]} ↔ ${keys[j]}`, `похожий текст: ${(jac * 100).toFixed(0)}% общих четвёрок слов`);
}

// ---------- перелинковка ----------
const inbound = {};
for (const p of Object.values(pages)) for (const t of p.out) (inbound[t] ||= new Set()).add(p.path);
for (const p of Object.values(pages)) {
  if (!p.indexable || p.path === '/') continue;
  const n = inbound[p.path]?.size || 0;
  if (n < 3) err(p.path, `на страницу ведёт мало ссылок: ${n} (нужно ≥ 3)`);
  if (!inbound[p.path]?.has('/')) err(p.path, 'нет ссылки с главной (глубина > 1 клика)');
  const links = [...p.out].filter((t) => pages[t]?.indexable).length;
  if (links < 4) warn(p.path, `исходящих внутренних ссылок на индексируемые страницы: ${links}`);
}

// ---------- sitemap и robots ----------
for (const p of Object.values(pages)) if (p.indexable && !urls.some((u) => pathOf(u.loc) === p.path)) err(p.path, 'нет в sitemap');
const sitemapPaths = new Set(urls.map((u) => pathOf(u.loc)));
for (const [path, p] of Object.entries(pages)) if (!p.indexable && sitemapPaths.has(path)) err(path, 'noindex-страница в sitemap');
for (const u of urls) if (!/^\d{4}-\d\d-\d\d$/.test(u.lastmod)) err(pathOf(u.loc), `lastmod не дата: ${u.lastmod}`);
const robots = read('robots.txt');
if (!robots.includes(`Sitemap: ${site.domain}/sitemap.xml`)) err('robots.txt', 'нет строки Sitemap');
if (/^\s*Disallow:\s*\/\s*$/m.test(robots)) err('robots.txt', 'закрыт весь сайт');
if (/Disallow:.*\.(css|js)/i.test(robots)) err('robots.txt', 'закрыты стили или скрипты');
if (!/Clean-param:/.test(robots)) warn('robots.txt', 'нет Clean-param для меток utm/yclid (Яндекс)');

// ---------- итог ----------
const summary = { pages: Object.keys(pages).length, indexable: urls.length, errors: errors.length, warnings: warns.length, words: Object.fromEntries(Object.values(pages).filter((p) => p.words).map((p) => [p.path, p.words])), keywords: phrasesBySlug, todos: Object.fromEntries(Object.values(pages).filter((p) => p.todos).map((p) => [p.path, p.todos])) };
if (AS_JSON) console.log(JSON.stringify({ summary, errors, warns }, null, 1));
else {
  console.log(`SEO-аудит: страниц ${summary.pages} (в индексе ${summary.indexable}), ошибок ${errors.length}, предупреждений ${warns.length}${RELEASE ? ' [release]' : ''}`);
  for (const e of errors) console.log(`  ✗ ${e.page}: ${e.msg}`);
  for (const w of warns) console.log(`  ! ${w.page}: ${w.msg}`);
  console.log('  слов на странице:', Object.entries(summary.words).map(([k, v]) => `${k} ${v}`).join(', '));
}
process.exit(errors.length ? 1 : 0);
