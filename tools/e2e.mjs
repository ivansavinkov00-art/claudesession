// Проверка интерактива: формы, модальные окна, лента, меню, липкая кнопка.
// node tools/e2e.mjs [BASE]   (нужен сервер, по умолчанию http://127.0.0.1:5507/)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.argv[2] || 'http://127.0.0.1:5507/';
const browser = await chromium.launch();
const errors = [];
const watch = (page) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
};
const isOpen = (page, id) => page.evaluate((i) => document.getElementById(i).open, id);
let passed = 0;
const step = async (name, fn) => { await fn(); passed++; console.log('ok  ', name); };

// ---------- Десктоп ----------
const desk = await browser.newPage({ viewport: { width: 1440, height: 800 }, reducedMotion: 'reduce' });
watch(desk);
await desk.goto(BASE, { waitUntil: 'networkidle' });

await step('лента видна на десктопе и открывает расчёт', async () => {
  assert.equal(await desk.locator('.tape').isVisible(), true);
  await desk.click('.tape');
  assert.equal(await isOpen(desk, 'calc'), true);
});

await step('Esc закрывает окно, фокус возвращается на ленту', async () => {
  await desk.keyboard.press('Escape');
  assert.equal(await isOpen(desk, 'calc'), false);
  assert.equal(await desk.evaluate(() => document.activeElement.classList.contains('tape')), true);
});

await step('кнопка направления «Экспериментальный цех» предвыбирает направление', async () => {
  await desk.click('.dir-exp [data-open="calc"]');
  assert.equal(await desk.locator('#calc input[name="direction"][value="exp"]').isChecked(), true);
  await desk.keyboard.press('Escape');
});

await step('опт < 300 ед. — подсказка и переключение, а не ошибка', async () => {
  await desk.click('.dir-opt [data-open="calc"]');
  assert.equal(await desk.locator('#calc input[name="direction"][value="opt"]').isChecked(), true);
  await desk.fill('#calc-qty', '120');
  assert.equal(await desk.locator('[data-qty-hint]').isVisible(), true);
  await desk.fill('#calc-qty', '300');
  assert.equal(await desk.locator('[data-qty-hint]').isVisible(), false);
  await desk.fill('#calc-qty', '50');
  await desk.click('[data-switch-exp]');
  assert.equal(await desk.locator('#calc input[name="direction"][value="exp"]').isChecked(), true);
  assert.equal(await desk.locator('[data-qty-hint]').isVisible(), false);
});

await step('пустая отправка — понятные ошибки, фокус на первом поле', async () => {
  await desk.click('#calc button[type="submit"]');
  assert.equal(await desk.locator('#calc-name-err').isVisible(), true);
  assert.equal(await desk.locator('#calc-contact-err').isVisible(), true);
  assert.equal(await desk.locator('#calc-consent-err').isVisible(), true);
  assert.equal(await desk.evaluate(() => document.activeElement.id), 'calc-name');
});

await step('без согласия отправка блокируется', async () => {
  await desk.fill('#calc-name', 'Анна');
  await desk.fill('#calc-contact', '+7 999 123-45-67');
  await desk.click('#calc button[type="submit"]');
  assert.equal(await desk.locator('#calc-name-err').isVisible(), false);
  assert.equal(await desk.locator('#calc-contact-err').isVisible(), false);
  assert.equal(await desk.locator('#calc-consent-err').isVisible(), true);
  assert.equal(await desk.locator('#calc [data-done]').isVisible(), false);
});

await step('кривой контакт не проходит, e-mail проходит', async () => {
  await desk.fill('#calc-contact', '12345');
  await desk.check('#calc input[name="consent"]');
  await desk.click('#calc button[type="submit"]');
  assert.equal(await desk.locator('#calc-contact-err').isVisible(), true);
  await desk.fill('#calc-contact', 'anna@brand.ru');
  assert.equal(await desk.locator('#calc-contact-err').isVisible(), false);
});

await step('успешная отправка — «Заявка принята»', async () => {
  await desk.click('#calc button[type="submit"]');
  assert.equal(await desk.locator('#calc [data-done]').isVisible(), true);
  assert.match(await desk.locator('#calc [data-done] h2').innerText(), /Заявка принята/);
});

await step('клик по фону закрывает; повторное открытие — чистая форма', async () => {
  await desk.mouse.click(10, 400);
  assert.equal(await isOpen(desk, 'calc'), false);
  await desk.click('.hero-actions [data-open="calc"]');
  assert.equal(await desk.locator('#calc form').isVisible(), true);
  assert.equal(await desk.inputValue('#calc-name'), '');
  await desk.keyboard.press('Escape');
});

await step('прайс: контакт + согласие → ссылка на PDF', async () => {
  await desk.click('.hero-actions [data-open="price"]');
  await desk.click('#price button[type="submit"]');
  assert.equal(await desk.locator('#price-contact-err').isVisible(), true);
  await desk.fill('#price-contact', '8 (999) 588-88-04');
  await desk.check('#price input[name="consent"]');
  await desk.click('#price button[type="submit"]');
  const href = await desk.locator('#price [data-done] a[download]').getAttribute('href');
  assert.equal(href, 'assets/price-demo.pdf');
  const res = await desk.request.get(new URL(href, BASE).href);
  assert.equal(res.status(), 200);
  await desk.keyboard.press('Escape');
});

await step('шапка получает фон после прокрутки', async () => {
  await desk.evaluate(() => window.scrollTo(0, 0));
  await desk.waitForTimeout(200);
  assert.equal(await desk.locator('.site-header').evaluate((e) => e.classList.contains('is-scrolled')), false);
  await desk.mouse.wheel(0, 900);
  await desk.waitForTimeout(200);
  assert.equal(await desk.locator('.site-header').evaluate((e) => e.classList.contains('is-scrolled')), true);
});

// ---------- Мобильный ----------
const mob = await browser.newPage({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
watch(mob);
await mob.goto(BASE, { waitUntil: 'networkidle' });

await step('мобильный: лента скрыта, липкая кнопка появляется после первого экрана', async () => {
  assert.equal(await mob.locator('.tape').isVisible(), false);
  assert.equal(await mob.locator('.sticky-cta').evaluate((e) => e.classList.contains('is-visible')), false);
  await mob.evaluate(() => window.scrollTo(0, 1400));
  await mob.waitForTimeout(400);
  assert.equal(await mob.locator('.sticky-cta').evaluate((e) => e.classList.contains('is-visible')), true);
  await mob.evaluate(() => window.scrollTo(0, 0));
  await mob.waitForTimeout(400);
  assert.equal(await mob.locator('.sticky-cta').evaluate((e) => e.classList.contains('is-visible')), false);
});

await step('мобильное меню: открывается, пункт ведёт к якорю и закрывает меню', async () => {
  await mob.click('[data-open="menu"]');
  assert.equal(await isOpen(mob, 'menu'), true);
  await mob.click('#menu a[href="#proizvodstvo"]');
  await mob.waitForTimeout(600);
  assert.equal(await isOpen(mob, 'menu'), false);
  const top = await mob.locator('#proizvodstvo').evaluate((e) => e.getBoundingClientRect().top);
  assert.ok(Math.abs(top) < 120, `section top ${top}`);
});

await browser.close();
assert.deepEqual(errors, [], 'console errors: ' + errors.join(' | '));
console.log(`\n${passed} checks passed, 0 console errors`);
