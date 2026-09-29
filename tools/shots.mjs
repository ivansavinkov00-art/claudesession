// Скриншоты страницы через Playwright. Нужен запущенный статический сервер (по умолчанию http://127.0.0.1:5507/).
//
// node tools/shots.mjs before   -> screenshots/v2/hero-before-*.png  (первый экран v1: 1440x800, 1366x650, 390x664, 360x640)
// node tools/shots.mjs after    -> screenshots/v2/hero-after-*.png   (те же размеры после доводки)
// node tools/shots.mjs v2       -> screenshots/v2/*: каждый экран на 1440 и 390, вся страница, состояния модулей и окна
// node tools/shots.mjs review   -> .impeccable/review/*: ширины Тильды + 1920
//
// Опции: любой аргумент http… — BASE; --only=подстрока — снять только кадры, в имени которых она есть
//   (например, после замены картинок: node tools/shots.mjs v2 --only=portfolio).
//
// Селекторы ниже — контракт разметки v2 (PLAN-v2.md, раздел «Контракт»). Переименовал в разметке — поправь здесь.
import { launch } from './browser.mjs';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const mode = args.find((a) => !a.startsWith('http') && !a.startsWith('--')) || 'v2';
const BASE = args.find((a) => a.startsWith('http')) || 'http://127.0.0.1:5507/';
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7);

// ---------- помощники взаимодействия ----------
const pause = (page, ms) => page.waitForTimeout(ms);
// радио/чекбоксы визуально скрыты — кликаем по их label, как человек
const pick = (page, sel) => page.locator(sel).locator('xpath=ancestor::label[1]').click();
const CALC = '#raschet [data-kc-calc]';

async function calcStep(page, step) {
  // довести калькулятор до шага step (1–4) с типовыми ответами
  await page.locator(CALC).scrollIntoViewIfNeeded();
  if (step >= 2) {
    await pick(page, `${CALC} input[name="direction"][value="wb"]`);
    await page.click(`${CALC} [data-kc="next"]`);
  }
  if (step >= 3) {
    await pick(page, `${CALC} input[name="item"][value="hoodie"]`);
    await pick(page, `${CALC} input[name="item"][value="sweatshirt"]`);
    await page.fill('#kc-qty', '500');
    await page.click(`${CALC} [data-kc="next"]`);
  }
  if (step >= 4) {
    await pick(page, `${CALC} input[name="service"][value="labels"]`);
    await pick(page, `${CALC} input[name="service"][value="packaging"]`);
    await pick(page, `${CALC} input[name="when"][value="month"]`);
    await page.click(`${CALC} [data-kc="next"]`);
  }
  await pause(page, 150);
}

const section = (name, sel) => [
  { name: `screen-${name}-1440`, w: 1440, h: 900, el: sel },
  { name: `screen-${name}-390`, w: 390, h: 844, mobile: true, el: sel },
];

const sets = {
  before: {
    dir: 'screenshots/v2',
    shots: [
      { name: 'hero-before-1440x800', w: 1440, h: 800 },
      { name: 'hero-before-1366x650', w: 1366, h: 650 },
      { name: 'hero-before-390x664', w: 390, h: 664, mobile: true },
      { name: 'hero-before-360x640', w: 360, h: 640, mobile: true },
    ],
  },
  after: {
    dir: 'screenshots/v2',
    shots: [
      { name: 'hero-after-1440x800', w: 1440, h: 800 },
      { name: 'hero-after-1366x650', w: 1366, h: 650 },
      { name: 'hero-after-390x664', w: 390, h: 664, mobile: true },
      { name: 'hero-after-360x640', w: 360, h: 640, mobile: true },
    ],
  },
  v2: {
    dir: 'screenshots/v2',
    shots: [
      ...section('hero', '.hero'),
      ...section('proizvodstvo', '#proizvodstvo'),
      ...section('osnovatel', '#osnovatel'),
      ...section('portfolio', '#portfolio'),
      ...section('seam', '.seam'),
      ...section('zadachi', '#zadachi'),
      ...section('raschet', '#raschet'),
      ...section('final', '.final'),
      ...section('footer', '#kontakty'),
      { name: 'full-1440', w: 1440, h: 900, full: true },
      { name: 'full-390', w: 390, h: 844, full: true, mobile: true },

      // карусель на третьей карточке: 3D (движение включено) и плоский вариант для reduced motion
      { name: 'portfolio-card03-1440', w: 1440, h: 900, el: '#portfolio', motion: true,
        prep: async (p) => { await p.click('#portfolio [data-kc="goto"][data-index="2"]'); await pause(p, 450); } },
      { name: 'portfolio-card03-390', w: 390, h: 844, mobile: true, el: '#portfolio', motion: true,
        prep: async (p) => { await p.click('#portfolio [data-kc="goto"][data-index="2"]'); await pause(p, 450); } },
      { name: 'portfolio-reduced-1440', w: 1440, h: 900, el: '#portfolio' },

      // список задач: активные строки 02 и 04
      { name: 'zadachi-02-1440', w: 1440, h: 900, el: '#zadachi', motion: true,
        prep: async (p) => { await p.locator('#zadachi [data-kc="toggle"]').nth(1).hover(); await pause(p, 350); } },
      { name: 'zadachi-04-1440', w: 1440, h: 900, el: '#zadachi', motion: true,
        prep: async (p) => { await p.locator('#zadachi [data-kc="toggle"]').nth(3).hover(); await pause(p, 350); } },
      { name: 'zadachi-02-390', w: 390, h: 844, mobile: true, el: '#zadachi',
        prep: async (p) => { await p.locator('#zadachi [data-kc="toggle"]').nth(1).click(); await pause(p, 350); } },
      { name: 'zadachi-04-390', w: 390, h: 844, mobile: true, el: '#zadachi',
        prep: async (p) => { await p.locator('#zadachi [data-kc="toggle"]').nth(3).click(); await pause(p, 350); } },

      // калькулятор: шаги 1–4, подсказка < 300, успех
      ...[1, 2, 3, 4].flatMap((n) => [
        { name: `calc-step${n}-1440`, w: 1440, h: 900, el: CALC, prep: (p) => calcStep(p, n) },
        { name: `calc-step${n}-390`, w: 390, h: 844, mobile: true, el: CALC, prep: (p) => calcStep(p, n) },
      ]),
      ...[['1440', 1440, 900, false], ['390', 390, 844, true]].map(([tag, w, h, mobile]) => ({
        name: `calc-hint-${tag}`, w, h, mobile, el: CALC,
        prep: async (p) => {
          await calcStep(p, 2);
          await pick(p, `${CALC} input[name="item"][value="hoodie"]`);
          await p.fill('#kc-qty', '120');
          await pause(p, 150);
        },
      })),
      ...[['1440', 1440, 900, false], ['390', 390, 844, true]].map(([tag, w, h, mobile]) => ({
        name: `calc-done-${tag}`, w, h, mobile, el: CALC,
        prep: async (p) => {
          await calcStep(p, 4);
          await p.fill('#kc-name', 'Анна');
          await p.fill('#kc-contact', '+7 999 123-45-67');
          await pick(p, `${CALC} input[name="messenger"][value="telegram"]`);
          await p.check('#kc-consent');
          await p.click(`${CALC} [data-kc="submit"]`);
          await pause(p, 200);
        },
      })),

      // окно «Обсудить задачу»
      { name: 'discuss-1440', w: 1440, h: 900,
        prep: async (p) => { await p.click('.final [data-open="discuss"]'); await pause(p, 300); } },
      { name: 'discuss-390', w: 390, h: 844, mobile: true,
        prep: async (p) => { await p.click('.final [data-open="discuss"]'); await pause(p, 300); } },
    ],
  },
  review: {
    dir: '.impeccable/review',
    shots: [
      { name: 'desktop', w: 1440, h: 900, full: true },
      { name: 'mobile', w: 390, h: 844, full: true, mobile: true },
      { name: 'w1920', w: 1920, h: 1080 },
      { name: 'w1200', w: 1200, h: 800 },
      { name: 'w960', w: 960, h: 900, full: true },
      { name: 'w640', w: 640, h: 900 },
      { name: 'w480', w: 480, h: 860, mobile: true },
      { name: 'w320', w: 320, h: 640, full: true, mobile: true },
    ],
  },
};

if (!sets[mode]) { console.error(`нет набора «${mode}»: ${Object.keys(sets).join(', ')}`); process.exit(1); }
const { dir } = sets[mode];
const shots = sets[mode].shots.filter((s) => !only || s.name.includes(only));
mkdirSync(dir, { recursive: true });
const browser = await launch();
let problems = 0;
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1,
    reducedMotion: s.motion ? 'no-preference' : 'reduce',
    isMobile: !!s.mobile, hasTouch: !!s.mobile, locale: 'ru-RU',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (s.motion) await pause(page, 1000); // анимация загрузки первого экрана ≤ 900 мс
    if (s.full || s.el) {
      // прогрузить lazy-картинки
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
        window.scrollTo(0, 0);
      });
      await pause(page, 400);
    }
    if (s.prep) await s.prep(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const path = `${dir}/${s.name}.png`;
    if (s.el) {
      const el = page.locator(s.el).first();
      await el.scrollIntoViewIfNeeded();
      await el.screenshot({ path });
    } else {
      await page.screenshot({ path, fullPage: !!s.full });
    }
    if (overflow > 0 || errors.length) problems++;
    console.log(`${s.name}.png  ${s.w}x${s.h}${s.full ? ' full' : ''}  overflowX=${overflow}${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
  } catch (err) {
    problems++;
    console.log(`${s.name}.png  НЕ СНЯТ: ${err.message.split('\n')[0]}`);
  }
  await ctx.close();
}
await browser.close();
process.exitCode = problems ? 1 : 0;
