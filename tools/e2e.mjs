// Проверка интерактива v2 по контракту разметки (PLAN-v2.md, раздел 4).
// node tools/e2e.mjs [BASE] [--only=подстрока]   (нужен сервер, по умолчанию http://127.0.0.1:5507/)
// Каждая проверка — на свежей странице; падение одной не останавливает остальные. Код выхода 1, если есть FAIL.
import { launch } from './browser.mjs';
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
const BASE = args.find((a) => a.startsWith('http')) || 'http://127.0.0.1:5507/';
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7);

const browser = await launch();
const consoleErrors = [];
let passed = 0;
const failed = [];

const DESK = { viewport: { width: 1440, height: 800 } };
const MOTION = { viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' };
const MOB = { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true };

async function open(opts = {}) {
  const { url = BASE, ...ctxOpts } = opts;
  const ctx = await browser.newContext({ reducedMotion: 'reduce', locale: 'ru-RU', ...DESK, ...ctxOpts });
  ctx.setDefaultTimeout(4000); // элемента нет — быстрый FAIL, а не 30 с ожидания
  ctx.setDefaultNavigationTimeout(15000);
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function test(name, opts, fn) {
  if (only && !name.includes(only)) return;
  let page;
  try {
    page = await open(opts);
    await fn(page);
    passed++;
    console.log('ok   ', name);
  } catch (err) {
    failed.push(name);
    console.log('FAIL ', name, '\n      ', String(err.message).split('\n')[0]);
  } finally {
    if (page) await page.context().close();
  }
}

// ---------- помощники ----------
const C = '#raschet [data-kc-calc]';
const nb = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const wait = (p, ms = 120) => p.waitForTimeout(ms);
// радио и чекбоксы визуально скрыты — кликаем по label, как человек
const pick = (p, sel) => p.locator(sel).locator('xpath=ancestor::label[1]').click();
const isChecked = (p, name, value) => p.locator(`${C} input[name="${name}"][value="${value}"]`).isChecked();
const stepNow = (p) => p.evaluate((sel) => [...document.querySelectorAll(`${sel} [data-kc="step"]`)].findIndex((s) => !s.hidden) + 1, C);
const focusInfo = (p) => p.evaluate(() => {
  const a = document.activeElement;
  return { id: a.id, kc: a.dataset.kc || '', inCalc: !!a.closest('[data-kc-calc]'), text: (a.textContent || '').trim().slice(0, 40) };
});
const fullyInView = (p, sel) => p.locator(sel).first().evaluate((e) => {
  const r = e.getBoundingClientRect();
  return r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
});
const calcTop = (p) => p.locator(C).evaluate((e) => e.getBoundingClientRect().top);
const counter = async (p) => nb(await p.locator('#portfolio [data-kc="counter"]').innerText()).slice(0, 7);
const expanded = (p) => p.locator('#zadachi [data-kc="toggle"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-expanded')));
const next = (p) => p.click(`${C} [data-kc="next"]`);

async function toStep(p, n) {
  if (n >= 2) { await pick(p, `${C} input[name="direction"][value="wb"]`); await next(p); }
  if (n >= 3) { await pick(p, `${C} input[name="item"][value="hoodie"]`); await p.fill('#kc-qty', '500'); await next(p); }
  if (n >= 4) await next(p);
}

async function assertLandedInCalc(p, { heading = true } = {}) {
  await wait(p, 200);
  const top = await calcTop(p);
  assert.ok(top >= 0 && top < 240, `верх квиза после перехода: ${Math.round(top)}px`);
  if (heading) {
    const f = await focusInfo(p);
    assert.ok(f.inCalc && f.kc === 'heading', `фокус не на заголовке шага: ${JSON.stringify(f)}`);
  }
}

// ================= Каркас =================
await test('каркас: нет окна #calc и секций v1', DESK, async (p) => {
  for (const sel of ['#calc', '#uslugi', '#cikl', '#prais', '[data-open="calc"]']) {
    assert.equal(await p.locator(sel).count(), 0, `${sel} ещё на странице`);
  }
});

await test('каркас: экраны и окна по контракту', DESK, async (p) => {
  for (const sel of ['section.hero', 'section#proizvodstvo', 'section#osnovatel', '#portfolio [data-kc-carousel]', 'section.seam',
    '#zadachi [data-kc-tasks]', '#raschet .path', C, 'section.final', 'footer#kontakty', 'dialog#price', 'dialog#discuss', 'dialog#menu']) {
    assert.equal(await p.locator(sel).count(), 1, `нет ${sel}`);
  }
  assert.equal(await p.locator('h1').count(), 1);
});

await test('каркас: навигация — 5 якорей в шапке, меню и подвале', DESK, async (p) => {
  const want = ['#zadachi', '#proizvodstvo', '#portfolio', '#raschet', '#kontakty'];
  const hrefs = (sel) => p.locator(sel).evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  assert.deepEqual(await hrefs('.site-header nav a[href^="#"]'), want);
  assert.deepEqual(await hrefs('#menu .menu-nav a'), want);
  assert.deepEqual(await hrefs('.site-footer nav a[href^="#"]'), want);
  const stubs = await p.locator('a[data-stub]').evaluateAll((els) => els.map((e) => e.textContent.trim()));
  assert.ok(!stubs.includes('Портфолио'), '«Портфолио» всё ещё заглушка');
});

await test('каркас: description из texts.md', DESK, async (p) => {
  const d = await p.locator('meta[name="description"]').getAttribute('content');
  assert.equal(nb(d), 'Швейное производство полного цикла в Челябинске: одежда второго слоя для селлеров WB и OZON, брендов и оптовых заказчиков. Опт от 300 ед., образец за 2–3 дня, доставка по России.');
});

await test('каркас: каждая «Рассчитать стоимость» — ссылка на #raschet', DESK, async (p) => {
  const bad = await p.evaluate(() => [...document.querySelectorAll('a, button')]
    .filter((e) => (e.textContent.trim() === 'Рассчитать стоимость' || e.getAttribute('aria-label') === 'Рассчитать стоимость'))
    .filter((e) => !(e.tagName === 'A' && e.getAttribute('href') === '#raschet'))
    .map((e) => e.outerHTML.slice(0, 80)));
  assert.deepEqual(bad, []);
  assert.equal(await p.locator('.tape[href="#raschet"]').count(), 1);
});

// ================= Картинки =================
await test('слоты: 01–13 на месте, размеры и загрузка', DESK, async (p) => {
  const slots = await p.locator('[data-slot]').evaluateAll((els) => [...new Set(els.map((e) => e.dataset.slot))].sort());
  assert.deepEqual(slots, Array.from({ length: 13 }, (_, i) => String(i + 1).padStart(2, '0')));
  const imgs = await p.locator('[data-slot] img').evaluateAll((els) => els.map((i) => ({
    slot: i.closest('[data-slot]').dataset.slot, src: i.getAttribute('src'), w: i.getAttribute('width'), h: i.getAttribute('height'),
    loading: i.getAttribute('loading'), prio: i.getAttribute('fetchpriority'), alt: i.getAttribute('alt'),
  })));
  for (const i of imgs) {
    assert.equal(i.src, `assets/img/img-${i.slot}.webp`, `слот ${i.slot}: src ${i.src}`);
    assert.ok(i.w && i.h, `слот ${i.slot}: нет width/height`);
    assert.ok(i.alt && i.alt.length > 5, `слот ${i.slot}: нет alt`);
    if (i.slot === '01') { assert.equal(i.prio, 'high'); assert.notEqual(i.loading, 'lazy'); }
    else assert.equal(i.loading, 'lazy', `слот ${i.slot}: не lazy`);
  }
});

await test('слоты: data-placeholder совпадает с тем, что лежит в файле', DESK, async (p) => {
  const imgs = await p.locator('img[src*="assets/img/img-"]').evaluateAll((els) => els.map((i) => ({ src: i.getAttribute('src'), ph: i.hasAttribute('data-placeholder') })));
  for (const i of imgs) {
    const meta = `${i.src}.json`;
    const isPh = existsSync(meta) && /^Placeholder/.test(JSON.parse(readFileSync(meta, 'utf8')).prompt);
    assert.equal(i.ph, isPh, `${i.src}: data-placeholder=${i.ph}, а файл ${isPh ? 'заглушка' : 'фото'}`);
  }
});

await test('слоты: ?slots показывает номера, без параметра — нет', { ...DESK, url: `${BASE}?slots` }, async (p) => {
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('show-slots')), true);
  const info = await p.locator('[data-slot="03"]').first().evaluate((e) => ({ c: getComputedStyle(e, '::after').content, pos: getComputedStyle(e).position }));
  assert.equal(info.c, '"03"');
  const statics = await p.locator('[data-slot]').evaluateAll((els) => els.filter((e) => e.offsetParent !== null && getComputedStyle(e).position === 'static').map((e) => e.dataset.slot));
  assert.deepEqual(statics, [], 'обёртки слотов без позиционирования');
  await p.goto(BASE, { waitUntil: 'networkidle' });
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('show-slots')), false);
});

// ================= Первый экран =================
for (const [w, h, mobile] of [[1440, 800, false], [1366, 650, false], [390, 664, true], [360, 640, true]]) {
  await test(`первый экран ${w}×${h}: видны H1 и ${mobile ? '«Рассчитать стоимость»' : 'обе кнопки'}`, { viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile }, async (p) => {
    assert.ok(await fullyInView(p, '.hero h1'), 'H1 не целиком в окне');
    assert.ok(await fullyInView(p, '[data-hero-actions] a[href="#raschet"]'), '«Рассчитать стоимость» не в окне');
    if (!mobile) assert.ok(await fullyInView(p, '[data-hero-actions] [data-open="price"]'), '«Скачать прайс» не в окне');
  });
}

await test('первый экран: строка фактов цифрами, WB и OZON неразрывно', DESK, async (p) => {
  const facts = nb(await p.locator('.hero-facts').innerText());
  for (const f of ['10+ лет', '2–3 дня', '1 цех']) assert.ok(facts.includes(f), `нет факта «${f}»`);
  assert.ok((await p.locator('.hero-lead').textContent()).includes('WB и OZON'), 'WB и OZON без неразрывных пробелов');
});

// ================= Квиз: переходы и предвыбор =================
await test('переход: первый экран → квиз, фокус на заголовке шага 1', DESK, async (p) => {
  await p.click('[data-hero-actions] a[href="#raschet"]');
  await assertLandedInCalc(p);
  assert.equal(await stepNow(p), 1);
});

await test('переход: лента → квиз', DESK, async (p) => {
  await p.click('.tape');
  await assertLandedInCalc(p);
});

await test('переход: «Прайс» в шапке → квиз', DESK, async (p) => {
  await p.click('.site-header nav a[href="#raschet"]');
  await assertLandedInCalc(p);
});

await test('переход: карусель → квиз с изделием (карточки 01 и 03)', DESK, async (p) => {
  await p.click('#portfolio [data-kc="slide"][data-index="0"] [data-kc="calc-link"]');
  await assertLandedInCalc(p);
  assert.ok(await isChecked(p, 'item', 'hoodie') && await isChecked(p, 'item', 'ziphoodie'), 'карточка 01: худи и зип-худи');
  await p.locator('#portfolio').scrollIntoViewIfNeeded();
  await p.click('#portfolio [data-kc="goto"][data-index="2"]');
  await wait(p);
  await p.click('#portfolio [data-kc="slide"][data-index="2"] [data-kc="calc-link"]');
  await assertLandedInCalc(p);
  assert.ok(await isChecked(p, 'item', 'shirt'), 'карточка 03: рубашка');
  assert.equal(await stepNow(p), 1);
});

await test('переход: шов → «Нестандартные размеры», фокус в описании', DESK, async (p) => {
  await p.click('.seam a[href="#raschet"]');
  await assertLandedInCalc(p, { heading: false });
  assert.equal(await stepNow(p), 2);
  assert.equal(await p.locator('#kc-nonstandard').isChecked(), true);
  assert.equal(await p.locator('#kc-sizes').isVisible(), true);
  assert.equal((await focusInfo(p)).id, 'kc-sizes');
});

await test('переход: задачи 01–04 → квиз с направлением', DESK, async (p) => {
  const dirs = ['wb', 'brand', 'opt', 'sample'];
  for (let i = 0; i < 4; i++) {
    await p.locator('#zadachi').scrollIntoViewIfNeeded();
    await p.locator('#zadachi [data-kc="toggle"]').nth(i).click();
    await wait(p);
    await p.locator('#zadachi [data-kc="panel"]').nth(i).locator(`a[href="#raschet"][data-calc-direction="${dirs[i]}"]`).click();
    await assertLandedInCalc(p);
    assert.ok(await isChecked(p, 'direction', dirs[i]), `строка ${i + 1}: не выбрано ${dirs[i]}`);
  }
});

await test('переход: мобильная липкая кнопка → квиз', MOB, async (p) => {
  await p.evaluate(() => window.scrollTo(0, 1400));
  await wait(p, 400);
  await p.click('.sticky-cta a[href="#raschet"]');
  await assertLandedInCalc(p);
});

await test('переход: кнопка в мобильном меню → квиз, меню закрыто, фокус не на «≡»', MOB, async (p) => {
  await p.click('[data-open="menu"]');
  await p.click('#menu a.btn[href="#raschet"]');
  await wait(p, 400);
  assert.equal(await p.evaluate(() => document.getElementById('menu').open), false);
  await assertLandedInCalc(p);
});

// ================= Квиз: шаги =================
await test('квиз: «Далее» без направления — ошибка, шаг не меняется', DESK, async (p) => {
  await next(p);
  assert.equal(await p.locator('#kc-err-direction').isVisible(), true);
  assert.equal(nb(await p.locator('#kc-err-direction').innerText()), 'Выберите, что нужно');
  assert.equal(await stepNow(p), 1);
  assert.equal(await p.locator(`${C} [data-kc="next"]`).isDisabled(), false, '«Далее» заблокирована молча');
  await pick(p, `${C} input[name="direction"][value="brand"]`);
  assert.equal(await p.locator('#kc-err-direction').isVisible(), false, 'ошибка не погасла после выбора');
});

await test('квиз: шаг 2 без изделия и количества — две ошибки', DESK, async (p) => {
  await toStep(p, 2);
  await next(p);
  assert.equal(await stepNow(p), 2);
  assert.equal(nb(await p.locator('#kc-err-item').innerText()), 'Выберите хотя бы одно изделие');
  assert.equal(nb(await p.locator('#kc-err-qty').innerText()), 'Укажите количество — можно примерно');
});

await test('квиз: подсказка < 300 и «Переключить» (WB и опт)', DESK, async (p) => {
  await toStep(p, 2);
  await pick(p, `${C} input[name="item"][value="hoodie"]`);
  const hint = p.locator(`${C} [data-kc="hint"]`);
  await p.fill('#kc-qty', '120'); assert.equal(await hint.isVisible(), true, '120 — нет подсказки');
  await p.fill('#kc-qty', '300'); assert.equal(await hint.isVisible(), false, '300 — подсказка лишняя');
  await p.fill('#kc-qty', '50'); assert.equal(await hint.isVisible(), true);
  assert.ok(nb(await hint.innerText()).includes('Партии меньше 300 ед. шьём в направлении «Коллекция бренда»'));
  await p.click(`${C} [data-kc="switch"]`);
  assert.ok(await isChecked(p, 'direction', 'brand'), '«Переключить» не выбрал «Коллекцию бренда»');
  assert.equal(await hint.isVisible(), false);
  assert.equal(await stepNow(p), 2);
  await p.click(`${C} [data-kc="prev"]`);
  await pick(p, `${C} input[name="direction"][value="opt"]`);
  await next(p);
  assert.equal(await hint.isVisible(), true, 'опт и СТМ с 50 ед. — нет подсказки');
});

await test('квиз: подсказка — не ошибка, со 120 ед. можно дальше', DESK, async (p) => {
  await toStep(p, 2);
  await pick(p, `${C} input[name="item"][value="hoodie"]`);
  await p.fill('#kc-qty', '120');
  await next(p);
  assert.equal(await stepNow(p), 3);
});

await test('квиз: быстрые варианты количества', DESK, async (p) => {
  await toStep(p, 2);
  await p.click(`${C} [data-kc="qty-quick"][data-value="500"]`);
  assert.equal(await p.inputValue('#kc-qty'), '500');
  await p.click(`${C} [data-kc="qty-quick"][data-value="1000"]`);
  assert.equal(await p.inputValue('#kc-qty'), '1000');
});

await test('квиз: «Образец» — «Сколько моделей» вместо количества', DESK, async (p) => {
  await pick(p, `${C} input[name="direction"][value="sample"]`);
  await next(p);
  assert.equal(await p.locator(`${C} [data-kc="qty-wrap"]`).isVisible(), false);
  assert.equal(await p.locator(`${C} [data-kc="models-wrap"]`).isVisible(), true);
  assert.ok(await isChecked(p, 'models', '1'), 'по умолчанию не «1»');
  await pick(p, `${C} input[name="item"][value="dress"]`);
  await next(p);
  assert.equal(await stepNow(p), 3, 'для образца количество не должно требоваться');
});

await test('квиз: «Назад» сохраняет ответы', DESK, async (p) => {
  await toStep(p, 2);
  await pick(p, `${C} input[name="item"][value="hoodie"]`);
  await pick(p, `${C} input[name="item"][value="sweatshirt"]`);
  await p.fill('#kc-qty', '500');
  await next(p);
  await pick(p, `${C} input[name="service"][value="labels"]`);
  await pick(p, `${C} input[name="when"][value="month"]`);
  await p.click(`${C} [data-kc="prev"]`);
  assert.equal(await stepNow(p), 2);
  assert.ok(await isChecked(p, 'item', 'hoodie') && await isChecked(p, 'item', 'sweatshirt'));
  assert.equal(await p.inputValue('#kc-qty'), '500');
  await p.click(`${C} [data-kc="prev"]`);
  assert.ok(await isChecked(p, 'direction', 'wb'));
  await next(p); await next(p);
  assert.ok(await isChecked(p, 'service', 'labels') && await isChecked(p, 'when', 'month'));
});

await test('квиз: панель «Ваш проект» обновляется вживую', DESK, async (p) => {
  const sum = (k) => p.locator(`${C} [data-kc="sum"][data-key="${k}"]`).innerText().then(nb);
  assert.equal(await sum('direction'), '—');
  assert.ok((await sum('fabric')).startsWith('Своя'), 'ткань по умолчанию — своя');
  await pick(p, `${C} input[name="direction"][value="wb"]`);
  assert.equal(await sum('direction'), 'Партия для WB и OZON');
  await next(p);
  await pick(p, `${C} input[name="item"][value="hoodie"]`);
  await p.fill('#kc-qty', '500');
  assert.ok((await sum('items')).includes('Худи'));
  assert.ok((await sum('qty')).includes('500'));
});

await test('квиз: без согласия отправка заблокирована', DESK, async (p) => {
  await toStep(p, 4);
  assert.equal(await p.locator('#kc-consent').isChecked(), false, 'согласие отмечено по умолчанию');
  await p.fill('#kc-name', 'Анна');
  await p.fill('#kc-contact', '+7 999 123-45-67');
  await p.click(`${C} [data-kc="submit"]`);
  assert.equal(nb(await p.locator('#kc-err-consent').innerText()), 'Без согласия мы не сможем прислать расчёт');
  assert.equal(await p.locator(`${C} [data-kc="done"]`).isVisible(), false);
  assert.equal(await p.locator('#kc-err-name').isVisible(), false);
  assert.equal(await p.locator('#kc-err-contact').isVisible(), false);
});

await test('квиз: контакт — 12345 и 12 цифр нельзя, e-mail и 11 цифр можно', DESK, async (p) => {
  await toStep(p, 4);
  await p.fill('#kc-name', 'Анна');
  await p.check('#kc-consent');
  await p.fill('#kc-contact', '12345');
  await p.click(`${C} [data-kc="submit"]`);
  assert.equal(nb(await p.locator('#kc-err-contact').innerText()), 'Нужен телефон (10–11 цифр) или e-mail');
  await p.fill('#kc-contact', 'anna@brand.ru');
  assert.equal(await p.locator('#kc-err-contact').isVisible(), false, 'ошибка не погасла после исправления');
  await p.fill('#kc-contact', '+7 999 123-45-678');
  await p.click(`${C} [data-kc="submit"]`);
  assert.equal(await p.locator('#kc-err-contact').isVisible(), true, '12 цифр прошли');
});

await test('квиз: успех — «Заявка принята» и «Скачать прайс»', DESK, async (p) => {
  await toStep(p, 4);
  await p.fill('#kc-name', 'Анна');
  await p.fill('#kc-contact', '8 (999) 588-88-04');
  await pick(p, `${C} input[name="messenger"][value="telegram"]`);
  await p.check('#kc-consent');
  await p.click(`${C} [data-kc="submit"]`);
  const done = p.locator(`${C} [data-kc="done"]`);
  assert.equal(await done.isVisible(), true);
  assert.ok(nb(await done.innerText()).includes('Заявка принята'));
  assert.equal((await focusInfo(p)).kc, 'done');
  await done.locator('[data-open="price"]').click();
  assert.equal(await p.evaluate(() => document.getElementById('price').open), true);
});

await test('квиз: после успеха новый переход открывает чистый шаг 1', DESK, async (p) => {
  await toStep(p, 4);
  await p.fill('#kc-name', 'Анна');
  await p.fill('#kc-contact', 'anna@brand.ru');
  await p.check('#kc-consent');
  await p.click(`${C} [data-kc="submit"]`);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.click('[data-hero-actions] a[href="#raschet"]');
  await assertLandedInCalc(p);
  assert.equal(await p.locator(`${C} [data-kc="done"]`).isVisible(), false);
  assert.equal(await stepNow(p), 1);
  assert.equal(await isChecked(p, 'direction', 'wb'), false, 'ответы не сброшены');
});

await test('квиз: отправка с пропущенным шагом возвращает на него', DESK, async (p) => {
  await p.click('.seam a[href="#raschet"]'); // шаг 2 без направления
  await wait(p, 200);
  await pick(p, `${C} input[name="item"][value="hoodie"]`);
  await p.fill('#kc-qty', '500');
  await next(p); await next(p);
  await p.fill('#kc-name', 'Анна');
  await p.fill('#kc-contact', 'anna@brand.ru');
  await p.check('#kc-consent');
  await p.click(`${C} [data-kc="submit"]`);
  assert.equal(await stepNow(p), 1);
  assert.equal(await p.locator('#kc-err-direction').isVisible(), true);
});

// ================= Квиз: крайние вводы (harden) =================
await test('квиз-harden: количество 0, −5, «abc» и пробелы — ошибка; 99999 — можно', DESK, async (p) => {
  await toStep(p, 2);
  await pick(p, `${C} input[name="item"][value="hoodie"]`);
  for (const bad of ['0', '-5', '   ']) {
    await p.fill('#kc-qty', bad);
    await next(p);
    assert.equal(await stepNow(p), 2, `«${bad}» пропущено`);
    assert.equal(await p.locator('#kc-err-qty').isVisible(), true, `«${bad}»: нет ошибки`);
  }
  await p.fill('#kc-qty', '99999');
  assert.equal(await p.locator('#kc-err-qty').isVisible(), false);
  await next(p);
  assert.equal(await stepNow(p), 3);
});

await test('квиз-harden: имя из одних пробелов не проходит', DESK, async (p) => {
  await toStep(p, 4);
  await p.fill('#kc-name', '   ');
  await p.fill('#kc-contact', 'anna@brand.ru');
  await p.check('#kc-consent');
  await p.click(`${C} [data-kc="submit"]`);
  assert.equal(await p.locator('#kc-err-name').isVisible(), true);
  assert.equal(await p.locator(`${C} [data-kc="done"]`).isVisible(), false);
});

await test('квиз-harden: Enter в поле количества работает как «Далее», а не как отправка', DESK, async (p) => {
  await toStep(p, 2);
  await pick(p, `${C} input[name="item"][value="hoodie"]`);
  await p.fill('#kc-qty', '500');
  await p.press('#kc-qty', 'Enter');
  assert.equal(await stepNow(p), 3);
  assert.equal(await p.locator(`${C} [data-kc="done"]`).isVisible(), false);
});

await test('квиз-harden: предвыбор посреди заполнения не стирает ответы', DESK, async (p) => {
  await toStep(p, 2);
  await pick(p, `${C} input[name="item"][value="dress"]`);
  await p.fill('#kc-qty', '700');
  await p.locator('#zadachi').scrollIntoViewIfNeeded();
  await p.locator('#zadachi [data-kc="toggle"]').nth(2).click();
  await wait(p);
  await p.locator('#zadachi [data-kc="panel"]').nth(2).locator('a[data-calc-direction="opt"]').click();
  await assertLandedInCalc(p);
  assert.ok(await isChecked(p, 'direction', 'opt'), 'направление не сменилось');
  assert.ok(await isChecked(p, 'item', 'dress'), 'изделие потеряно');
  assert.equal(await p.inputValue('#kc-qty'), '700', 'количество потеряно');
});

await test('квиз-harden: двойной клик «Далее» не перепрыгивает шаг с ошибкой', DESK, async (p) => {
  await pick(p, `${C} input[name="direction"][value="wb"]`);
  await p.dblclick(`${C} [data-kc="next"]`);
  assert.equal(await stepNow(p), 2, 'двойной клик пропустил шаг 2 без изделия');
});

await test('задачи-harden: смена ширины окна сохраняет открытую строку', DESK, async (p) => {
  await p.locator('#zadachi [data-kc="toggle"]').nth(2).hover();
  await wait(p);
  await p.setViewportSize({ width: 600, height: 800 });
  await wait(p, 200);
  assert.deepEqual(await expanded(p), ['false', 'false', 'true', 'false']);
  await p.setViewportSize({ width: 1440, height: 800 });
  await wait(p, 200);
  assert.deepEqual(await expanded(p), ['false', 'false', 'true', 'false']);
});

// ================= Карусель =================
await test('карусель: роли, подписи, счётчик', MOTION, async (p) => {
  const root = p.locator('#portfolio [data-kc-carousel]');
  assert.equal(await root.getAttribute('role'), 'region');
  assert.equal(await root.getAttribute('aria-roledescription'), 'карусель');
  const slides = p.locator('#portfolio [data-kc="slide"]');
  assert.equal(await slides.count(), 6);
  assert.equal(await slides.nth(0).getAttribute('aria-label'), '1 из 6: Худи и зип-худи');
  assert.equal(await slides.nth(2).getAttribute('aria-label'), '3 из 6: Рубашки');
  assert.equal(await p.locator('#portfolio [data-kc="counter"]').getAttribute('aria-live'), 'polite');
  assert.equal(await counter(p), '01 / 06');
  assert.equal(await p.locator('#portfolio [data-kc="prev"]').isDisabled(), true, '«назад» на первой не disabled');
});

await test('карусель: стрелки листают, на краях disabled', MOTION, async (p) => {
  await p.click('#portfolio [data-kc="next"]');
  await wait(p, 350);
  assert.equal(await counter(p), '02 / 06');
  assert.equal(await p.locator('#portfolio [data-kc="slide"][data-index="1"]').getAttribute('data-pos'), '0');
  assert.equal(await p.locator('#portfolio [data-kc="slide"][data-index="0"]').getAttribute('data-pos'), '-1');
  await p.click('#portfolio [data-kc="goto"][data-index="5"]');
  await wait(p, 350);
  assert.equal(await counter(p), '06 / 06');
  assert.equal(await p.locator('#portfolio [data-kc="next"]').isDisabled(), true);
  assert.equal(await p.locator('#portfolio [data-kc="goto"][data-index="5"]').getAttribute('aria-current'), 'true');
  await p.click('#portfolio [data-kc="prev"]');
  await wait(p, 350);
  assert.equal(await counter(p), '05 / 06');
});

await test('карусель: клавиши ← →', MOTION, async (p) => {
  await p.locator('#portfolio [data-kc="next"]').focus();
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowRight');
  await wait(p, 350);
  assert.equal(await counter(p), '03 / 06');
  await p.keyboard.press('ArrowLeft');
  await wait(p, 350);
  assert.equal(await counter(p), '02 / 06');
});

await test('карусель: клик по соседней карточке', MOTION, async (p) => {
  await p.locator('#portfolio [data-kc="stage"]').scrollIntoViewIfNeeded();
  const box = await p.locator('#portfolio [data-kc="slide"][data-index="1"]').boundingBox();
  await p.mouse.click(box.x + box.width * 0.85, box.y + box.height / 2);
  await wait(p, 350);
  assert.equal(await counter(p), '02 / 06');
});

await test('карусель: перетаскивание мышью', MOTION, async (p) => {
  const stage = p.locator('#portfolio [data-kc="stage"]');
  await stage.scrollIntoViewIfNeeded();
  const b = await stage.boundingBox();
  const y = b.y + b.height / 2;
  await p.mouse.move(b.x + b.width / 2 + 80, y);
  await p.mouse.down();
  for (let dx = 0; dx <= 160; dx += 20) await p.mouse.move(b.x + b.width / 2 + 80 - dx, y);
  await p.mouse.up();
  await wait(p, 350);
  assert.equal(await counter(p), '02 / 06');
});

await test('карусель: неактивные карточки вне табуляции, «Рассчитать» у активной', MOTION, async (p) => {
  const info = await p.locator('#portfolio [data-kc="slide"]').evaluateAll((els) => els.map((s) => ({
    pos: s.dataset.pos, hidden: s.getAttribute('aria-hidden'), tab: s.querySelector('[data-kc="calc-link"]').getAttribute('tabindex'),
  })));
  for (const s of info) {
    if (s.pos === '0') { assert.notEqual(s.hidden, 'true'); assert.notEqual(s.tab, '-1'); }
    else { assert.equal(s.hidden, 'true', `pos ${s.pos}: нет aria-hidden`); assert.equal(s.tab, '-1', `pos ${s.pos}: ссылка в табуляции`); }
  }
  assert.equal(await p.locator('#portfolio [data-kc="slide"][data-pos="0"] [data-kc="calc-link"]').isVisible(), true);
});

await test('карусель: при reduced motion — плоский ряд со scroll-snap', DESK, async (p) => {
  const st = await p.locator('#portfolio [data-kc="stage"]').evaluate((e) => ({ ox: getComputedStyle(e).overflowX, snap: getComputedStyle(e).scrollSnapType }));
  assert.equal(st.ox, 'auto');
  assert.ok(st.snap.includes('x'), `scroll-snap-type: ${st.snap}`);
  const transforms = await p.locator('#portfolio [data-kc="slide"]').evaluateAll((els) => els.map((e) => getComputedStyle(e).transform));
  assert.ok(transforms.every((t) => t === 'none'), `есть трансформации: ${transforms.join(' | ')}`);
  await p.locator('#portfolio').scrollIntoViewIfNeeded();
  await p.click('#portfolio [data-kc="next"]');
  await wait(p, 300);
  assert.equal(await counter(p), '02 / 06');
  assert.ok(await p.locator('#portfolio [data-kc="stage"]').evaluate((e) => e.scrollLeft > 0), 'ряд не прокрутился');
});

// ================= Задачи =================
await test('задачи: по умолчанию открыта 01 и картинка 10', DESK, async (p) => {
  assert.deepEqual(await expanded(p), ['true', 'false', 'false', 'false']);
  const media = await p.locator('#zadachi [data-kc="media"]').evaluateAll((els) => els.map((e) => [e.classList.contains('is-active'), e.getAttribute('aria-hidden')]));
  assert.deepEqual(media, [[true, null], [false, 'true'], [false, 'true'], [false, 'true']]);
  const inert = await p.locator('#zadachi [data-kc="panel"]').evaluateAll((els) => els.map((e) => e.inert));
  assert.deepEqual(inert, [false, true, true, true]);
});

await test('задачи: Tab проходит по строке и её ссылке, фокус открывает строку', DESK, async (p) => {
  await p.locator('#zadachi [data-kc="toggle"]').nth(0).focus();
  await p.keyboard.press('Tab');
  assert.equal(await p.evaluate(() => document.activeElement.dataset.calcDirection), 'wb', 'после строки 01 фокус не на её ссылке');
  await p.keyboard.press('Tab');
  await wait(p);
  assert.deepEqual(await expanded(p), ['false', 'true', 'false', 'false']);
  assert.equal(await p.locator('#zadachi [data-kc="media"][data-index="1"]').evaluate((e) => e.classList.contains('is-active')), true);
  await p.locator('#zadachi [data-kc="toggle"]').nth(3).focus();
  await p.keyboard.press('Enter');
  await wait(p);
  assert.deepEqual(await expanded(p), ['false', 'false', 'false', 'true']);
});

await test('задачи: наведение мышью, клик не закрывает активную', DESK, async (p) => {
  await p.locator('#zadachi [data-kc="toggle"]').nth(2).hover();
  await wait(p);
  assert.deepEqual(await expanded(p), ['false', 'false', 'true', 'false']);
  await p.locator('#zadachi [data-kc="toggle"]').nth(2).click();
  await wait(p);
  assert.deepEqual(await expanded(p), ['false', 'false', 'true', 'false']);
});

await test('задачи на мобильном: аккордеон, картинка внутри строки', MOB, async (p) => {
  assert.equal(await p.locator('#zadachi [data-kc="stage"]').isVisible(), false);
  await p.locator('#zadachi [data-kc="toggle"]').nth(1).click();
  await wait(p, 350);
  assert.deepEqual(await expanded(p), ['false', 'true', 'false', 'false']);
  assert.equal(await p.locator('#zadachi [data-kc="panel"]').nth(1).locator('img').isVisible(), true);
  await p.locator('#zadachi [data-kc="toggle"]').nth(1).click();
  await wait(p, 350);
  assert.deepEqual(await expanded(p), ['false', 'false', 'false', 'false']);
});

// ================= Окна =================
await test('«Обсудить задачу»: открытие, ошибки, Esc возвращает фокус', DESK, async (p) => {
  const btn = p.locator('.final [data-open="discuss"]');
  await btn.click();
  assert.equal(await p.evaluate(() => document.getElementById('discuss').open), true);
  await p.click('#discuss button[type="submit"]');
  for (const id of ['#discuss-name-err', '#discuss-phone-err', '#discuss-consent-err']) assert.equal(await p.locator(id).isVisible(), true, `${id} не видна`);
  await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(() => document.getElementById('discuss').open), false);
  assert.equal(await btn.evaluate((e) => e === document.activeElement), true, 'фокус не вернулся на кнопку');
});

await test('«Обсудить задачу»: клик по фону закрывает', DESK, async (p) => {
  await p.click('.final [data-open="discuss"]');
  await p.mouse.click(10, 400);
  assert.equal(await p.evaluate(() => document.getElementById('discuss').open), false);
});

await test('«Обсудить задачу»: телефон проверяется, заявка уходит', DESK, async (p) => {
  await p.click('.final [data-open="discuss"]');
  await p.fill('#discuss-name', 'Анна');
  await p.fill('#discuss-phone', 'anna@brand.ru');
  await pick(p, '#discuss input[name="slot"][value="12-15"]');
  await p.check('#discuss input[name="consent"]');
  await p.click('#discuss button[type="submit"]');
  assert.equal(await p.locator('#discuss-phone-err').isVisible(), true, 'e-mail прошёл как телефон');
  await p.fill('#discuss-phone', '+7 999 123-45-67');
  await p.click('#discuss button[type="submit"]');
  assert.ok(nb(await p.locator('#discuss [data-done]').innerText()).includes('Спасибо! Перезвоним в выбранное время.'));
});

await test('прайс: контакт + согласие → ссылка на PDF', DESK, async (p) => {
  await p.click('[data-hero-actions] [data-open="price"]');
  await p.click('#price button[type="submit"]');
  assert.equal(await p.locator('#price-contact-err').isVisible(), true);
  await p.fill('#price-contact', '8 (999) 588-88-04');
  await p.check('#price input[name="consent"]');
  await p.click('#price button[type="submit"]');
  const href = await p.locator('#price [data-done] a[download]').getAttribute('href');
  assert.equal(href, 'assets/price-demo.pdf');
  assert.equal((await p.request.get(new URL(href, BASE).href)).status(), 200);
});

await test('финал: «Скачать прайс» открывает окно прайса', DESK, async (p) => {
  await p.click('.final [data-open="price"]');
  assert.equal(await p.evaluate(() => document.getElementById('price').open), true);
});

// ================= Прочее =================
await test('шапка получает фон после прокрутки', DESK, async (p) => {
  assert.equal(await p.locator('.site-header').evaluate((e) => e.classList.contains('is-scrolled')), false);
  await p.mouse.wheel(0, 900);
  await wait(p, 200);
  assert.equal(await p.locator('.site-header').evaluate((e) => e.classList.contains('is-scrolled')), true);
});

await test('мобильный: лента скрыта, липкая кнопка появляется и прячется у квиза', MOB, async (p) => {
  const vis = () => p.locator('.sticky-cta').evaluate((e) => e.classList.contains('is-visible'));
  assert.equal(await p.locator('.tape').isVisible(), false);
  assert.equal(await vis(), false);
  await p.evaluate(() => window.scrollTo(0, 1400));
  await wait(p, 400);
  assert.equal(await vis(), true, 'не появилась после первого экрана');
  await p.locator(C).evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await wait(p, 400);
  assert.equal(await vis(), false, 'закрывает квиз');
  await p.evaluate(() => window.scrollTo(0, 0));
  await wait(p, 400);
  assert.equal(await vis(), false);
});

await test('мобильное меню: пункт ведёт к якорю и закрывает меню', MOB, async (p) => {
  await p.click('[data-open="menu"]');
  await p.click('#menu a[href="#proizvodstvo"]');
  await wait(p, 600);
  assert.equal(await p.evaluate(() => document.getElementById('menu').open), false);
  const top = await p.locator('#proizvodstvo').evaluate((e) => e.getBoundingClientRect().top);
  assert.ok(Math.abs(top) < 120, `верх секции ${top}`);
});

for (const w of [320, 360, 390, 480, 640, 960, 1200, 1366, 1440, 1920]) {
  const mobile = w < 960;
  await test(`нет горизонтального скролла на ${w}px`, { viewport: { width: w, height: 800 }, isMobile: mobile, hasTouch: mobile }, async (p) => {
    const over = await p.evaluate(async () => {
      let max = 0;
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 30));
        max = Math.max(max, document.documentElement.scrollWidth - window.innerWidth);
      }
      return max;
    });
    assert.equal(over, 0, `scrollWidth больше окна на ${over}px`);
  });
}

await browser.close();

if (!only) {
  if (consoleErrors.length) { failed.push('консоль без ошибок'); console.log('FAIL  консоль без ошибок\n      ', [...new Set(consoleErrors)].slice(0, 5).join(' | ')); }
  else { passed++; console.log('ok    консоль без ошибок'); }
}
console.log(`\n${passed} ok, ${failed.length} FAIL`);
process.exitCode = failed.length ? 1 : 0;
