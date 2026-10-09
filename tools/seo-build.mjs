// SEO-автоматизация: данные (seo/*.json + семантика) → страницы, sitemap.xml, robots.txt, 404, юр. страницы, разметка в index.html.
//   node tools/seo-build.mjs          записать файлы
//   node tools/seo-build.mjs --check  ничего не писать, упасть, если файлы устарели (для проверки перед коммитом)
// Источник правды: seo/site.json (факты), seo/semantics.json (из xlsx), seo/pages/*.json (тексты), seo/home.json (FAQ главной),
// seo/reviews.json и seo/cases.json (только настоящие, пока пусто). index.html — мастер-шаблон: шапка, подвал, квиз и окна берутся из него.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, rmdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const J = (p) => JSON.parse(read(p));
const NB = ' ';

// ---------- данные ----------
const site = J('seo/site.json');
const sem = J('seo/semantics.json');
const homeData = J('seo/home.json');
const reviews = existsSync(resolve(ROOT, 'seo/reviews.json')) ? J('seo/reviews.json') : [];
const cases = existsSync(resolve(ROOT, 'seo/cases.json')) ? J('seo/cases.json') : [];
const pageFiles = readdirSync(resolve(ROOT, 'seo/pages')).filter((f) => f.endsWith('.json')).sort();
const rank = (slug) => { const i = (site.order || []).indexOf(slug); return i < 0 ? 999 : i; };
const PAGES = pageFiles.map((f) => J(`seo/pages/${f}`)).sort((a, b) => rank(a.slug) - rank(b.slug));
const bySlug = Object.fromEntries(PAGES.map((p) => [p.slug, p]));
const semBySlug = Object.fromEntries(sem.pages.map((p) => [p.url.replace(/^\/|\/$/g, '') || '', p]));
const SERVICE_PAGES = PAGES.filter((p) => !p.hub);
const CASES = cases.filter((c) => c.published);
const HUB = PAGES.find((p) => p.hub);

const url = (path = '') => `${site.domain}${path}`;
const pageUrl = (slug) => url(`/${slug}/`);

// ---------- текст ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (s) => String(s).replace(/\[([^\]]+)\]\((\/[a-z0-9\-/]*)\)/g, '$1').replace(new RegExp(NB, 'g'), ' ');
// типографика: неразрывные пробелы после коротких слов, у единиц измерения и перед тире
const SHORT = 'в|к|с|о|у|и|а|но|на|по|за|из|от|до|для|под|при|про|над|без|или|как|не|ни|же|ли|бы|во|со|ко|об';
const typo = (s) => String(s)
  .replace(new RegExp(`(^|[\\s(«„])(${SHORT})\\s`, 'gi'), `$1$2${NB}`)
  .replace(new RegExp(`(^|[\\s(«„])(${SHORT})\\s`, 'gi'), `$1$2${NB}`)
  .replace(/(\d)\s+(ед\.|дн\p{L}*|шт\.?|₽|%)/gu, `$1${NB}$2`)
  .replace(/\s+—/g, `${NB}—`);
const linkCheck = (u) => {
  if (u === '/') return;
  const slug = u.replace(/^\/|\/$/g, '');
  if (!bySlug[slug] && !['privacy', 'consent'].includes(slug)) throw new Error(`Ссылка на несуществующую страницу: ${u}`);
};
const rich = (s) => esc(typo(s)).replace(/\[([^\]]+)\]\((\/[a-z0-9\-/]*)\)/g, (m, t, u) => { linkCheck(u); return `<a href="${u}">${t}</a>`; });
const todo = (t) => `<span class="todo">[${esc(t)}]</span>`;
const legalOk = () => ['operator', 'inn', 'ogrn', 'address', 'email', 'responsible'].every((k) => site.legal[k]);

// ---------- подстановка данных в известные места (идемпотентно) ----------
const responseText = () => site.responseTime || null;
const fillHooks = (html) => html
  .replace(/<span[^>]*data-ks="response"[^>]*>[\s\S]*?<\/span>/g, () => (responseText() ? `<span data-ks="response">${esc(responseText())}</span>` : '<span class="todo" data-ks="response">[уточнить срок]</span>'))
  .replace(/<span[^>]*data-ks="hours"[^>]*>[\s\S]*?<\/span>/g, () => (site.hours ? `<span data-ks="hours">${esc(site.hours)}</span>` : '<span class="todo" data-ks="hours">[уточнить часы работы]</span>'))
  .replace(/<li data-ks="requisites">[\s\S]*?<\/li>/g, () => `<li data-ks="requisites">${site.legal.operator ? `<span class="req">${esc(site.legal.operator)}, ИНН ${esc(site.legal.inn || '—')}${site.legal.ogrn ? `, ОГРН ${esc(site.legal.ogrn)}` : ''}</span>` : `Реквизиты ${todo('уточнить')}`}</li>`);

// ---------- услуги в подвале ----------
const GROUPS = ['Направления', 'Изделия', 'Услуги', 'Цены'];
const footerServices = () => {
  const items = [...SERVICE_PAGES.map((p) => `<li><a href="/${p.slug}/">${esc(typo(p.crumb))}</a></li>`), ...(CASES.length ? ['<li><a href="/keysy/">Кейсы</a></li>'] : [])].join('\n          ');
  return `      <nav class="footer-col footer-services" aria-label="Услуги и изделия">
        <h3><a href="/uslugi/">Услуги и изделия</a></h3>
        <ul>
          ${items}
        </ul>
      </nav>`;
};

// ---------- вставки между маркерами ----------
const wrapMarker = (src, name, inner) => {
  const re = new RegExp(`(<!-- seo:${name}:start -->)[\\s\\S]*?(<!-- seo:${name}:end -->)`);
  if (!re.test(src)) throw new Error(`В index.html нет маркера seo:${name}`);
  return src.replace(re, (m, a, b) => `${a}\n${inner}\n${b}`);
};
// ---------- общие блоки из мастера (index.html) ----------
const masterSrc = read('index.html');
const between = (src, start, end) => {
  const i = src.indexOf(start);
  if (i < 0) throw new Error(`Нет в index.html: ${start}`);
  const j = src.indexOf(end, i);
  if (j < 0) throw new Error(`Нет конца блока: ${end}`);
  return src.slice(i, j + end.length);
};
// мастер = index.html с уже вставленным блоком услуг в подвале: внутренние страницы берут подвал отсюда
const masterRaw = wrapMarker(masterSrc, 'footer-services', footerServices());
const master = {
  sprites: masterRaw.match(/<svg class="sprite"[\s\S]*?<\/svg>/g).join('\n'),
  header: between(masterRaw, '<header class="site-header">', '</header>'),
  footer: between(masterRaw, '<footer class="site-footer" id="kontakty">', '</footer>'),
  tape: between(masterRaw, '<a class="tape"', '</a>'),
  sticky: between(masterRaw, '<div class="sticky-cta"', '</div>'),
  menu: between(masterRaw, '<dialog class="menu" id="menu"', '</dialog>'),
  discuss: between(masterRaw, '<dialog class="modal modal--small" id="discuss"', '</dialog>'),
  price: between(masterRaw, '<dialog class="modal modal--small" id="price"', '</dialog>'),
  calc: between(masterRaw, '<section class="section s-calc" id="raschet"', '</section>'),
  final: between(masterRaw, '<section class="final"', '</section>'),
  script: masterRaw.match(/<script>\s*\(function \(\) \{\s*var d = document\.documentElement[\s\S]*?<\/script>/)[0],
};
if ((master.calc.match(/<section/g) || []).length !== 1) throw new Error('В квизе появилась вложенная <section>: поправьте извлечение');

// скрипт темы для страниц во вложенных папках: пути от корня, без предзагрузки картинок главной
const innerThemeScript = master.script
  .replace("l.href = 'theme-dark.css'", "l.href = '/theme-dark.css'")
  .replace(/\n\s*if \(t === 'dark' && window\.matchMedia[^\n]*\n/, '\n')
  .replace('P.forEach(function (p) {', "P = P.filter(function (p) { return p[0] === 'font'; }).map(function (p) { return [p[0], '/' + p[1]]; });\n  P.forEach(function (p) {");

// пути ресурсов от корня и якоря главной
const rootify = (html) => html
  .replace(/(["'\s,(])assets\//g, '$1/assets/')
  .replace(/href="#(zadachi|proizvodstvo|portfolio|osnovatel)"/g, 'href="/#$1"')
  .replace(/href="#top"/g, 'href="/"');

// ---------- JSON-LD ----------
const ORG = `${url('/')}#org`;
const offerCatalog = () => ({
  '@type': 'OfferCatalog', name: 'Услуги швейного производства',
  itemListElement: SERVICE_PAGES.map((p) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: p.serviceType, url: pageUrl(p.slug) } })),
});
const orgLd = () => {
  const o = {
    '@type': ['Organization', 'LocalBusiness'], '@id': ORG, name: site.name, url: url('/'), description: site.description,
    logo: { '@type': 'ImageObject', url: url(`/${site.logo}`) }, image: url(`/${site.ogDefault}`),
    telephone: site.phone.replace(/[^+\d]/g, ''),
    address: { '@type': 'PostalAddress', addressLocality: site.address.locality, addressRegion: site.address.region, addressCountry: site.address.country },
    areaServed: [{ '@type': 'City', name: site.address.locality }, { '@type': 'Country', name: 'Россия' }],
    founder: { '@type': 'Person', name: site.founder.name, jobTitle: site.founder.jobTitle, image: url(`/${site.founder.image}`) },
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'sales', telephone: site.phone.replace(/[^+\d]/g, ''), areaServed: 'RU', availableLanguage: 'ru' }],
    sameAs: Object.values(site.social).filter(Boolean),
    hasOfferCatalog: offerCatalog(),
  };
  if (site.address.street) o.address.streetAddress = site.address.street;
  if (site.address.postalCode) o.address.postalCode = site.address.postalCode;
  if (site.email) o.email = site.email;
  if (site.legal.inn) o.taxID = site.legal.inn;
  if (site.legal.operator) o.legalName = site.legal.operator;
  return o;
};
const websiteLd = () => ({ '@type': 'WebSite', '@id': `${url('/')}#website`, url: url('/'), name: site.name, inLanguage: 'ru-RU', publisher: { '@id': ORG } });
const faqLd = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: plain(q), acceptedAnswer: { '@type': 'Answer', text: plain(a) } })) });
const crumbsLd = (list) => ({ '@type': 'BreadcrumbList', itemListElement: list.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })) });
const reviewsLd = () => reviews.filter((r) => r.published).map((r) => ({ '@type': 'Review', itemReviewed: { '@id': ORG }, author: { '@type': 'Person', name: r.author }, reviewBody: r.text, datePublished: r.date, ...(r.rating ? { reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 } } : {}) }));
const ld = (graph) => `<script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 1)}\n</script>`;

// ---------- head ----------
const ogImage = (slug) => (slug ? url(`/assets/og/${slug}.jpg`) : url(`/${site.ogDefault}`));
const headSeo = ({ title, description, canonical, robots = 'index,follow,max-image-preview:large', slug, ogAlt, graph, preload }) => `<title>${esc(plain(title))}</title>
<meta name="description" content="${esc(plain(description))}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${robots}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${site.locale}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(plain(title))}">
<meta property="og:description" content="${esc(plain(description))}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage(slug)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ogAlt || title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(plain(title))}">
<meta name="twitter:description" content="${esc(plain(description))}">
<meta name="twitter:image" content="${ogImage(slug)}">${site.metrikaId ? `\n<meta name="ks-metrika" content="${esc(site.metrikaId)}">` : ''}${preload ? `\n<link rel="preload" as="image" href="${preload}" media="(min-width: 960px)" fetchpriority="high">` : ''}${graph ? `\n${ld(graph)}` : ''}`;

// ---------- страницы ----------
const GEN = (src) => `<!-- Сгенерировано tools/seo-build.mjs (${src}). Правьте данные в seo/, а не этот файл. -->`;
const pageMeta = (p) => {
  const s = semBySlug[p.slug] || {};
  return { title: p.title || s.title, description: p.description || s.description, h1: p.h1 || s.h1 };
};

const crumbList = (p, name) => {
  const list = [{ name: 'Главная', url: url('/') }];
  if (!p.hub) list.push({ name: 'Услуги', url: pageUrl('uslugi') });
  list.push({ name, url: pageUrl(p.slug) });
  return list;
};
const crumbsHtml = (list) => `<nav class="crumbs" aria-label="Хлебные крошки"><ol>${list.map((c, i) => (i === list.length - 1
  ? `<li aria-current="page">${esc(typo(c.name))}</li>`
  : `<li><a href="${c.url.replace(site.domain, '') || '/'}">${esc(c.name)}</a></li>`)).join('')}</ol></nav>`;

const calcAttrs = (c = {}) => `${c.direction ? ` data-calc-direction="${c.direction}"` : ''}${c.items ? ` data-calc-item="${c.items.join(' ')}"` : ''}`;
const responseLine = () => `<p class="pg-promise">${responseText() ? `Ответим на заявку ${esc(responseText())}.` : `Ответим на заявку ${todo('уточнить срок')}.`} Расчёт делает технолог.</p>`;

const blockHtml = (b, i) => {
  const id = `b${i + 1}`;
  const head = `<h2 id="${id}">${esc(typo(b.h))}</h2>`;
  let body = '';
  if (b.type === 'text') body = b.p.map((t) => `<p>${rich(t)}</p>`).join('\n          ');
  if (b.type === 'list') body = `<ul class="pg-list">\n${b.items.map((t) => `            <li>${rich(t)}</li>`).join('\n')}\n          </ul>`;
  if (b.type === 'steps') body = `<ol class="pg-steps">\n${b.items.map(([t, d], k) => `            <li><span class="pg-n" aria-hidden="true">${String(k + 1).padStart(2, '0')}</span><div><h3>${esc(typo(t))}</h3><p>${rich(d)}</p></div></li>`).join('\n')}\n          </ol>`;
  return `      <section class="pg-block" aria-labelledby="${id}">
        <div class="pg-block__head">${head}</div>
        <div class="pg-block__body">
          ${body}
        </div>
      </section>`;
};

const faqHtml = (faq, cls = 'pg-faq') => `    <section class="section ${cls}" aria-labelledby="faq-title">
    <div class="container">
      <div class="sec-head"><h2 id="faq-title">Частые <span class="acc">вопросы</span></h2></div>
      <div class="faq-list">
${faq.map(([q, a]) => `        <details class="faq-item"><summary>${esc(typo(q))}</summary><div class="faq-a"><p>${rich(a)}</p></div></details>`).join('\n')}
      </div>
    </div>
  </section>`;

const relatedHtml = (p) => {
  const list = (p.related || []).map((s) => bySlug[s]).filter(Boolean);
  if (!list.length) return '';
  return `    <section class="section pg-related" aria-labelledby="rel-title">
    <div class="container">
      <div class="sec-head"><h2 id="rel-title">Смотрите <span class="acc">также</span></h2></div>
      <ul class="pg-cards">
${list.map((r) => `        <li><a class="pg-card" href="/${r.slug}/"><span class="pg-card__t">${esc(typo(r.crumb))}</span><span class="pg-card__d">${esc(typo(r.card))}</span><span class="pg-card__go" aria-hidden="true">Подробнее</span></a></li>`).join('\n')}
      </ul>
    </div>
  </section>`;
};

const reviewsHtml = () => {
  const list = reviews.filter((r) => r.published);
  if (!list.length) return '';
  return `    <section class="section pg-reviews" aria-labelledby="rev-title">
    <div class="container">
      <div class="sec-head"><h2 id="rev-title">Отзывы <span class="acc">клиентов</span></h2></div>
      <ul class="pg-cards">
${list.map((r) => `        <li><figure class="pg-review"><blockquote><p>${esc(r.text)}</p></blockquote><figcaption>${esc(r.author)}${r.company ? `, ${esc(r.company)}` : ''}${r.source ? ` · <a href="${esc(r.source)}" rel="noopener nofollow" target="_blank">источник</a>` : ''}</figcaption></figure></li>`).join('\n')}
      </ul>
    </div>
  </section>`;
};

const cookieNotice = `<div class="cookie" data-cookie role="region" aria-label="Уведомление об использовании cookie" hidden>
  <p>Сайт использует cookie и Яндекс Метрику, чтобы работать корректно и анализировать посещаемость. Подробнее в <a href="/privacy/#cookie">политике конфиденциальности</a>.</p>
  <button class="btn btn-secondary" type="button" data-cookie-ok>Понятно</button>
</div>`;

const CSS = ['/styles.css', '/modules/kc-calc.css', '/v3.css', '/theme-base.css', '/seo.css'];
const SCRIPTS = ['/script.js', '/modules/kc-calc.js', '/theme.js', '/analytics.js'];

// calc=false: на странице нет квиза (юридические страницы, 404), кнопки «Рассчитать» ведут на главную
const shell = ({ head, body, mainClass = '', calc = true }) => (calc ? shellHtml({ head, body, mainClass, calc }) : shellHtml({ head, body, mainClass, calc }).replace(/href="#raschet"/g, 'href="/#raschet"'));
const shellHtml = ({ head, body, mainClass = '', calc }) => `<!doctype html>
<html lang="ru" data-theme-default="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
<meta name="theme-color" content="#E6DECE">
${innerThemeScript}
<link rel="icon" href="/assets/logo/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/logo/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/logo/apple-touch-icon.png">
${CSS.filter((h) => calc || !h.includes('kc-calc')).map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
${SCRIPTS.filter((s) => calc || !s.includes('kc-calc')).map((s) => `<script src="${s}" defer></script>`).join('\n')}
</head>
<body id="top">
${rootify(master.sprites)}
<a class="skip" href="#main">Перейти к содержимому</a>

${rootify(fillHooks(master.header))}

<main id="main"${mainClass ? ` class="${mainClass}"` : ''}>
${body}
</main>

${rootify(fillHooks(master.footer))}

${rootify(master.tape)}
${rootify(master.sticky)}
${rootify(master.menu)}
${rootify(fillHooks(master.discuss))}
${rootify(master.price)}
${cookieNotice}

</body>
</html>
`;

function servicePage(p) {
  const m = pageMeta(p);
  const crumbs = crumbList(p, p.crumb);
  const phrases = [p.primary, ...(p.secondary || [])];
  const graph = [
    orgLd(), websiteLd(),
    { '@type': 'WebPage', '@id': `${pageUrl(p.slug)}#webpage`, url: pageUrl(p.slug), name: plain(m.h1), description: plain(m.description), inLanguage: 'ru-RU', isPartOf: { '@id': `${url('/')}#website` }, about: { '@id': `${pageUrl(p.slug)}#service` }, primaryImageOfPage: { '@type': 'ImageObject', url: url(`/${p.image.src}`) }, breadcrumb: { '@id': `${pageUrl(p.slug)}#crumbs` } },
    { ...crumbsLd(crumbs), '@id': `${pageUrl(p.slug)}#crumbs` },
    { '@type': 'Service', '@id': `${pageUrl(p.slug)}#service`, name: p.serviceType, serviceType: p.serviceType, description: plain(m.description), url: pageUrl(p.slug), provider: { '@id': ORG }, areaServed: [{ '@type': 'City', name: site.address.locality }, { '@type': 'Country', name: 'Россия' }] },
    ...(p.faq?.length ? [faqLd(p.faq)] : []),
  ];
  const head = headSeo({ title: m.title, description: m.description, canonical: pageUrl(p.slug), slug: p.slug, ogAlt: plain(m.h1), graph, preload: `/${p.image.src}` });
  const facts = (p.facts || []).map(([n, l]) => `<div><dt>${esc(typo(n))}</dt><dd>${esc(typo(l))}</dd></div>`).join('');
  const body = `${GEN(`seo/pages/${p.slug}.json`)}
  <section class="pg-hero" aria-labelledby="pg-title">
    <div class="container pg-hero__grid">
      <div class="pg-hero__text">
        ${crumbsHtml(crumbs)}
        <p class="pg-eyebrow">${esc(typo(p.eyebrow))}</p>
        <h1 id="pg-title">${esc(typo(m.h1))}</h1>
        <p class="pg-lead">${rich(p.lead)}</p>
        <div class="hero-actions" data-hero-actions>
          <a class="btn btn-primary" href="#raschet"${calcAttrs(p.calc)}>${esc(p.calc?.label || 'Рассчитать стоимость')} <svg class="btn-ico" viewBox="0 0 256 256" aria-hidden="true"><use href="#ph-arrow-right"/></svg></a>
          <button class="btn btn-secondary" type="button" data-open="price">Скачать прайс</button>
          <a class="pg-phone" href="tel:${site.phone.replace(/[^+\d]/g, '')}">${esc(site.phone).replace(/ /g, NB)}</a>
        </div>
        ${responseLine()}
        <dl class="pg-facts">${facts}</dl>
      </div>
      <figure class="pg-hero__media"><img src="/${p.image.src}" alt="${esc(p.image.alt)}" width="${p.image.w}" height="${p.image.h}" decoding="async"></figure>
    </div>
  </section>

  <div class="section pg-body">
    <div class="container">
${p.blocks.map(blockHtml).join('\n')}
${p.note ? `      <p class="pg-note">${esc(typo(p.note))}</p>` : ''}
    </div>
  </div>
${relatedHtml(p)}
${reviewsHtml()}
${p.faq?.length ? faqHtml(p.faq) : ''}

  ${rootify(fillHooks(master.calc))}

  ${rootify(fillHooks(master.final))}`;
  return shell({ head, body });
}

function hubPage(p) {
  const m = pageMeta(p);
  const crumbs = [{ name: 'Главная', url: url('/') }, { name: 'Услуги', url: pageUrl('uslugi') }];
  const graph = [
    orgLd(), websiteLd(),
    { '@type': 'CollectionPage', '@id': `${pageUrl('uslugi')}#webpage`, url: pageUrl('uslugi'), name: plain(m.h1), description: plain(m.description), inLanguage: 'ru-RU', isPartOf: { '@id': `${url('/')}#website` }, breadcrumb: { '@id': `${pageUrl('uslugi')}#crumbs` },
      mainEntity: { '@type': 'ItemList', itemListElement: SERVICE_PAGES.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: pageUrl(s.slug), name: plain(pageMeta(s).h1) })) } },
    { ...crumbsLd(crumbs), '@id': `${pageUrl('uslugi')}#crumbs` },
  ];
  const head = headSeo({ title: m.title, description: m.description, canonical: pageUrl('uslugi'), slug: 'uslugi', ogAlt: plain(m.h1), graph, preload: `/${p.image.src}` });
  const groups = p.groups.map((g) => {
    const items = SERVICE_PAGES.filter((s) => s.group === g);
    if (!items.length) return '';
    return `      <section class="pg-block" aria-labelledby="g-${esc(g)}">
        <div class="pg-block__head"><h2 id="g-${esc(g)}">${esc(g)}</h2></div>
        <div class="pg-block__body">
          <ul class="pg-cards pg-cards--wide">
${items.map((s) => `            <li><a class="pg-card" href="/${s.slug}/"><span class="pg-card__t">${esc(typo(pageMeta(s).h1))}</span><span class="pg-card__d">${esc(typo(s.card))}</span><span class="pg-card__go" aria-hidden="true">Подробнее</span></a></li>`).join('\n')}
          </ul>
        </div>
      </section>`;
  }).join('\n');
  const body = `${GEN('seo/pages/uslugi.json')}
  <section class="pg-hero" aria-labelledby="pg-title">
    <div class="container pg-hero__grid">
      <div class="pg-hero__text">
        ${crumbsHtml(crumbs)}
        <p class="pg-eyebrow">Каталог</p>
        <h1 id="pg-title">${esc(typo(m.h1))}</h1>
        <p class="pg-lead">${rich(p.lead)}</p>
        <div class="hero-actions" data-hero-actions>
          <a class="btn btn-primary" href="#raschet">Рассчитать стоимость <svg class="btn-ico" viewBox="0 0 256 256" aria-hidden="true"><use href="#ph-arrow-right"/></svg></a>
          <button class="btn btn-secondary" type="button" data-open="price">Скачать прайс</button>
        </div>
        ${responseLine()}
      </div>
      <figure class="pg-hero__media"><img src="/${p.image.src}" alt="${esc(p.image.alt)}" width="${p.image.w}" height="${p.image.h}" decoding="async"></figure>
    </div>
  </section>
  <div class="section pg-body">
    <div class="container">
${groups}
    </div>
  </div>

  ${rootify(fillHooks(master.calc))}

  ${rootify(fillHooks(master.final))}`;
  return shell({ head, body });
}

// ---------- кейсы (только настоящие: seo/cases.json, published: true) ----------
function casesPage() {
  const title = 'Кейсы: пошив партий для брендов и селлеров | Культура шитья';
  const description = 'Примеры работ швейного производства «Культура шитья»: задача заказчика, что сделали, результат.';
  const crumbs = [{ name: 'Главная', url: url('/') }, { name: 'Кейсы', url: pageUrl('keysy') }];
  const graph = [orgLd(), websiteLd(), { '@type': 'CollectionPage', '@id': `${pageUrl('keysy')}#webpage`, url: pageUrl('keysy'), name: 'Кейсы швейного производства', description, inLanguage: 'ru-RU', isPartOf: { '@id': `${url('/')}#website` }, breadcrumb: { '@id': `${pageUrl('keysy')}#crumbs` } }, { ...crumbsLd(crumbs), '@id': `${pageUrl('keysy')}#crumbs` }];
  const head = headSeo({ title, description, canonical: pageUrl('keysy'), slug: null, graph });
  const items = CASES.map((c, i) => `      <section class="pg-block" aria-labelledby="c${i}">
        <div class="pg-block__head"><h2 id="c${i}">${esc(typo(c.title))}</h2>${c.date ? `<p class="pg-note">${esc(c.date)}</p>` : ''}</div>
        <div class="pg-block__body">
          <dl class="pg-case">
            <dt>Задача</dt><dd>${rich(c.task)}</dd>
            <dt>Что сделали</dt><dd>${rich(c.solution)}</dd>
            <dt>Результат</dt><dd>${rich(c.result)}</dd>
          </dl>
          ${(c.images || []).map((im) => `<figure class="pg-case__fig"><img src="/${im.src}" alt="${esc(im.alt)}" width="${im.w}" height="${im.h}" loading="lazy" decoding="async"></figure>`).join('')}
        </div>
      </section>`).join('\n');
  const body = `${GEN('seo/cases.json')}
  <section class="pg-hero pg-legal" aria-labelledby="pg-title">
    <div class="container">
      ${crumbsHtml(crumbs)}
      <h1 id="pg-title">Кейсы</h1>
      <p class="pg-lead">Задача заказчика, что сделали, результат. Публикуем только реальные работы и с согласия заказчиков.</p>
      <div class="hero-actions" data-hero-actions><a class="btn btn-primary" href="#raschet">Рассчитать стоимость <svg class="btn-ico" viewBox="0 0 256 256" aria-hidden="true"><use href="#ph-arrow-right"/></svg></a></div>
    </div>
  </section>
  <div class="section pg-body">
    <div class="container">
${items}
    </div>
  </div>

  ${rootify(fillHooks(master.calc))}

  ${rootify(fillHooks(master.final))}`;
  return shell({ head, body });
}

// ---------- 404 ----------
function notFoundPage() {
  const head = headSeo({ title: 'Страница не найдена | Культура шитья', description: 'Такой страницы нет. Перейдите на главную или выберите услугу швейного производства.', canonical: url('/404.html'), robots: 'noindex,follow', slug: null });
  const body = `${GEN('tools/seo-build.mjs')}
  <section class="pg-hero pg-404" aria-labelledby="pg-title">
    <div class="container">
      <p class="pg-eyebrow">Ошибка 404</p>
      <h1 id="pg-title">Страница не${NB}найдена</h1>
      <p class="pg-lead">Возможно, адрес изменился или в${NB}нём опечатка. Вернитесь на${NB}главную или${NB}выберите нужную услугу.</p>
      <div class="hero-actions" data-hero-actions>
        <a class="btn btn-primary" href="/">На главную <svg class="btn-ico" viewBox="0 0 256 256" aria-hidden="true"><use href="#ph-arrow-right"/></svg></a>
        <a class="btn btn-secondary" href="/uslugi/">Все услуги</a>
        <a class="pg-phone" href="tel:${site.phone.replace(/[^+\d]/g, '')}">${esc(site.phone).replace(/ /g, NB)}</a>
      </div>
    </div>
  </section>
  <div class="section pg-body">
    <div class="container">
      <section class="pg-block" aria-labelledby="nf-h">
        <div class="pg-block__head"><h2 id="nf-h">Популярные разделы</h2></div>
        <div class="pg-block__body">
          <ul class="pg-cards pg-cards--wide">
${['opt', 'obrazec', 'brendam', 'price'].map((s) => `            <li><a class="pg-card" href="/${s}/"><span class="pg-card__t">${esc(typo(bySlug[s].crumb))}</span><span class="pg-card__d">${esc(typo(bySlug[s].card))}</span><span class="pg-card__go" aria-hidden="true">Подробнее</span></a></li>`).join('\n')}
          </ul>
        </div>
      </section>
    </div>
  </div>`;
  return shell({ head, body, calc: false });
}

// ---------- юридические страницы (черновики для проверки юристом) ----------
const L = (key, label) => (site.legal[key] ? esc(site.legal[key]) : todo(label));
const operatorLine = () => `${L('operator', 'наименование оператора')}, ИНН ${L('inn', 'ИНН')}, ОГРН/ОГРНИП ${L('ogrn', 'ОГРН')}, адрес: ${L('address', 'адрес')}`;
const draftBanner = () => (legalOk() ? '' : `<p class="pg-note pg-note--draft"><strong>Проект документа.</strong> Тексты подготовлены как основа для юриста: перед публикацией нужно заполнить реквизиты оператора (метки в квадратных скобках) и проверить документ. Сейчас он не является действующей редакцией.</p>`);

function legalPage(kind) {
  const isPrivacy = kind === 'privacy';
  const title = isPrivacy ? 'Политика конфиденциальности | Культура шитья' : 'Согласие на обработку персональных данных | Культура шитья';
  const h1 = isPrivacy ? 'Политика конфиденциальности' : 'Согласие на обработку персональных данных';
  const description = isPrivacy ? 'Как «Культура шитья» обрабатывает персональные данные посетителей сайта: состав данных, цели, сроки, права пользователя, cookie.' : 'Текст согласия на обработку персональных данных при отправке заявки, расчёта стоимости или запроса прайс-листа на сайте «Культура шитья».';
  const crumbs = [{ name: 'Главная', url: url('/') }, { name: h1, url: url(`/${kind}/`) }];
  const head = headSeo({ title, description, canonical: url(`/${kind}/`), robots: isPrivacy ? 'index,follow' : 'noindex,follow', slug: null, graph: [orgLd(), websiteLd(), { ...crumbsLd(crumbs) }] });
  const sections = isPrivacy ? [
    ['1. Общие положения', [
      `Настоящая политика определяет порядок обработки и защиты персональных данных посетителей сайта ${esc(site.domain.replace('https://', ''))} (далее — сайт). Она разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».`,
      `Оператор персональных данных: ${operatorLine()}.`,
      `Лицо, ответственное за обработку персональных данных: ${L('responsible', 'ФИО или должность ответственного')}. Контакт для обращений: ${L('email', 'e-mail для обращений')}.`]],
    ['2. Какие данные мы собираем', [
      'Через формы сайта: имя; номер телефона или e-mail; предпочтительный мессенджер; удобное время звонка; сведения о заказе (направление, изделия, количество, ткань, дополнительные услуги, срок); текст сообщения, если вы его оставили.',
      'Автоматически: данные о посещении (адрес страницы, источник перехода, тип устройства и браузера, IP-адрес), которые собирает сервис веб-аналитики с помощью cookie.']],
    ['3. Цели обработки', [
      'Связаться с вами по заявке; рассчитать стоимость пошива; отправить прайс-лист; организовать обратный звонок; улучшать работу сайта по данным веб-аналитики. Данные не используются для целей, не указанных в этом документе.']],
    ['4. Правовые основания', [
      'Обработка выполняется на основании вашего согласия, которое вы даёте отдельным действием при отправке формы (ст. 6 и 9 Федерального закона № 152-ФЗ). Согласие оформлено отдельным документом: <a href="/consent/">текст согласия</a>.']],
    ['5. Порядок и сроки обработки', [
      'Мы собираем, записываем, систематизируем, накапливаем, храним, уточняем, используем, блокируем, удаляем и уничтожаем персональные данные с использованием средств автоматизации и без них.',
      `Данные хранятся до достижения целей обработки или до отзыва согласия, если иное не требуется законом. Срок хранения заявок: ${todo('уточнить срок хранения')}.`,
      'Первичная запись и хранение персональных данных граждан Российской Федерации выполняются в базах данных на территории Российской Федерации.']],
    ['6. Передача данных третьим лицам', [
      `Данные не продаются и не передаются третьим лицам, кроме случаев, предусмотренных законом, и сервисов, которые нужны для работы с заявками и аналитики: ${todo('перечень: CRM, почтовый сервис, Яндекс Метрика')}. Трансграничная передача: ${todo('указать, осуществляется ли')}.`]],
    ['7. Ваши права', [
      'Вы можете запросить сведения об обработке своих данных, потребовать их уточнения, блокирования или удаления, отозвать согласие. Для этого направьте обращение на e-mail оператора или по адресу, указанному выше. Ответ мы направляем в сроки, установленные законом (10 рабочих дней с возможностью продления).']],
    ['8. Меры защиты', [
      'Оператор применяет правовые, организационные и технические меры защиты: ограничение доступа к данным, передача по защищённому соединению (HTTPS), хранение у поставщиков, расположенных в Российской Федерации.']],
    ['9. Cookie и веб-аналитика', [
      'Для работы сайта используется локальное хранилище браузера: оно запоминает выбранную тему оформления и ваш ответ на уведомление о cookie. Для анализа посещаемости применяется Яндекс Метрика: сервис собирает обезличенные данные о действиях на сайте (просмотры страниц, клики, источник перехода). Вы можете отключить cookie в настройках браузера: сайт продолжит работать.']],
    ['10. Изменения политики', [
      'Актуальная редакция всегда опубликована на этой странице. Дата последнего обновления: ' + esc(site.lastmod) + '.']]] : [
    ['Оператор', [`${operatorLine()}.`]],
    ['Кто даёт согласие', ['Посетитель сайта, который отправляет форму («Рассчитать стоимость», «Обсудить задачу», «Скачать прайс») и отмечает согласие.']],
    ['Цели обработки', ['Связаться с вами по заявке; рассчитать стоимость пошива; отправить прайс-лист; организовать обратный звонок.']],
    ['Какие данные обрабатываются', ['Имя; номер телефона или e-mail; предпочтительный мессенджер; удобное время звонка; сведения о заказе (направление, изделия, количество, ткань, дополнительные услуги, срок); текст сообщения.']],
    ['Какие действия выполняются', ['Сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача (предоставление, доступ) в пределах цели, блокирование, удаление, уничтожение. Обработка выполняется с использованием средств автоматизации и без них.']],
    ['Третьи лица', [`Передача данных третьим лицам: ${todo('указать получателей: CRM, почта, мессенджер или «не осуществляется»')}.`]],
    ['Срок и отзыв', ['Согласие действует до достижения целей обработки или до его отзыва. Отозвать согласие можно письменно: направьте обращение на e-mail оператора ' + L('email', 'e-mail оператора') + ' или по адресу оператора. После отзыва данные удаляются, если закон не требует их хранения.']],
    ['Как дано согласие', ['Согласие даётся добровольно, отдельным действием: отметкой в форме на сайте. Оно не распространяется на разрешение публиковать данные в открытом доступе. Подробности об обработке — в <a href="/privacy/">политике конфиденциальности</a>.']]];
  const body = `${GEN('tools/seo-build.mjs')}
  <section class="pg-hero pg-legal" aria-labelledby="pg-title">
    <div class="container">
      ${crumbsHtml(crumbs)}
      <h1 id="pg-title">${esc(typo(h1))}</h1>
      ${draftBanner()}
    </div>
  </section>
  <div class="section pg-body">
    <div class="container">
${sections.map(([h, ps], i) => `      <section class="pg-block"${h.startsWith('9.') ? ' id="cookie"' : ''} aria-labelledby="l${i}">
        <div class="pg-block__head"><h2 id="l${i}">${esc(typo(h))}</h2></div>
        <div class="pg-block__body">${ps.map((t) => `<p>${t}</p>`).join('\n          ')}</div>
      </section>`).join('\n')}
    </div>
  </div>`;
  return shell({ head, body, calc: false });
}

// ---------- sitemap и robots ----------
const gitDate = (path) => {
  try {
    const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', path], { cwd: ROOT, encoding: 'utf8' }).trim();
    return d || site.lastmod;
  } catch { return site.lastmod; }
};
const SITEMAP_URLS = [
  { loc: url('/'), lastmod: gitDate('index.html') },
  { loc: pageUrl('uslugi'), lastmod: gitDate('seo/pages/uslugi.json') },
  ...SERVICE_PAGES.map((p) => ({ loc: pageUrl(p.slug), lastmod: gitDate(`seo/pages/${p.slug}.json`) })),
  ...(CASES.length ? [{ loc: pageUrl('keysy'), lastmod: gitDate('seo/cases.json') }] : []),
  { loc: url('/privacy/'), lastmod: gitDate('seo/site.json') },
];
const sitemapXml = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_URLS.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
const CLEAN = 'utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&ysclid&_openstat&from&theme&slots';
const robotsTxt = () => `# Культура шитья. Сгенерировано tools/seo-build.mjs
User-agent: *
Allow: /
Disallow: /*?theme=
Disallow: /*?slots

# Яндекс читает только свою группу: правила повторены, Clean-param склеивает адреса с метками
User-agent: Yandex
Allow: /
Disallow: /*?theme=
Disallow: /*?slots
Clean-param: ${CLEAN} /

Sitemap: ${url('/sitemap.xml')}
`;

function homePage() {
  const h = homeData;
  const graph = [orgLd(), websiteLd(),
    { '@type': 'WebPage', '@id': `${url('/')}#webpage`, url: url('/'), name: plain(h.title), description: plain(sem.pages.find((p) => p.url === '/').description), inLanguage: 'ru-RU', isPartOf: { '@id': `${url('/')}#website` }, about: { '@id': ORG }, primaryImageOfPage: { '@type': 'ImageObject', url: ogImage(null) } },
    faqLd(h.faq), ...reviewsLd()];
  const head = headSeo({ title: h.title, description: sem.pages.find((p) => p.url === '/').description, canonical: url('/'), slug: null, ogAlt: 'Швейное производство «Культура шитья» в Челябинске', graph });
  let src = masterRaw;
  src = wrapMarker(src, 'head', head);
  src = wrapMarker(src, 'footer-services', footerServices());
  src = wrapMarker(src, 'faq', faqHtml(h.faq, 's-calc s-faq'));
  return fillHooks(src);
}

// ---------- сборка ----------
const OUT = new Map();
for (const p of PAGES) OUT.set(`${p.slug}/index.html`, p.hub ? hubPage(p) : servicePage(p));
OUT.set('privacy/index.html', legalPage('privacy'));
OUT.set('consent/index.html', legalPage('consent'));
if (CASES.length) OUT.set('keysy/index.html', casesPage());
OUT.set('404.html', notFoundPage());
OUT.set('sitemap.xml', sitemapXml());
OUT.set('robots.txt', robotsTxt());
OUT.set('index.html', homePage());

let stale = 0;
for (const [rel, text] of OUT) {
  const abs = resolve(ROOT, rel);
  const old = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  if (old === text) continue;
  stale++;
  if (CHECK) { console.error(`устарел: ${rel}`); continue; }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}
for (const rel of ['keysy/index.html']) {
  const abs = resolve(ROOT, rel);
  if (OUT.has(rel) || !existsSync(abs) || !readFileSync(abs, 'utf8').includes('Сгенерировано tools/seo-build.mjs')) continue;
  stale++;
  if (CHECK) console.error(`лишний: ${rel}`);
  else { unlinkSync(abs); try { rmdirSync(dirname(abs)); } catch { /* не пусто */ } }
}
if (CHECK) { if (stale) { console.error(`\n${stale} файл(ов) устарело: запустите npm run seo`); process.exit(1); } console.log(`seo: ${OUT.size} файлов актуальны`); }
else console.log(`seo: ${OUT.size} файлов, обновлено ${stale}`);
