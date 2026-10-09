// Культура шитья, v8: Яндекс Метрика, цели и уведомление о cookie.
// Номер счётчика приходит из seo/site.json (metrikaId) через <meta name="ks-metrika">. Нет номера — ничего не грузится и не показывается.
// Метрика подключается на любых адресах, кроме локальных. Вебвизор выключен: в формах вводят телефон и почту.
// Цели (создать в Метрике: Конверсии → Цели → JavaScript-событие, идентификатор = имя ниже):
//   cta_click, calc_start, calc_submit, callback_submit, price_open, price_submit, price_download, phone_click, messenger_click
(() => {
  const KEY = 'ks-cookie';
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname) || location.protocol === 'file:';
  let counter = 0;

  const goal = (name, params) => {
    if (!counter || !window.ym) return;
    try { window.ym(counter, 'reachGoal', name, Object.assign({ page: location.pathname }, params || {})); } catch (e) { /* аналитика не должна ломать сайт */ }
  };

  function init(id) {
    id = Number(id);
    if (!id || counter) return;
    counter = id;
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false, ecommerce: false });
    if (!local) {
      const s = document.createElement('script');
      s.async = true; s.src = 'https://mc.yandex.ru/metrika/tag.js';
      document.head.appendChild(s);
    }
    showCookieNotice();
  }

  // ---------- уведомление о cookie ----------
  function showCookieNotice() {
    const box = document.querySelector('[data-cookie]');
    if (!box) return;
    let accepted = false;
    try { accepted = localStorage.getItem(KEY) === '1'; } catch (e) { /* приватный режим */ }
    if (accepted) return;
    box.hidden = false;
    const ok = box.querySelector('[data-cookie-ok]');
    if (ok) ok.addEventListener('click', () => {
      try { localStorage.setItem(KEY, '1'); } catch (e) { /* приватный режим */ }
      box.hidden = true;
    }, { once: true });
  }

  // ---------- цели ----------
  const place = (el) => (el.closest('.site-header') ? 'header' : el.closest('.site-footer') ? 'footer' : el.closest('.final') ? 'final' : el.closest('.sticky-cta') ? 'sticky' : el.closest('.tape') ? 'tape' : el.closest('dialog') ? 'dialog' : 'page');

  document.addEventListener('click', (e) => {
    const el = e.target.closest('a, button');
    if (!el) return;
    const href = el.getAttribute('href') || '';
    if (href.startsWith('tel:')) return goal('phone_click', { place: place(el) });
    if (el.closest('.footer-messengers, .final-direct, .messengers')) return goal('messenger_click', { name: el.textContent.trim(), place: place(el) });
    if (el.hasAttribute('download') || /\.pdf($|\?)/i.test(href)) return goal('price_download');
    if (el.dataset.open === 'price') return goal('price_open', { place: place(el) });
    if (href === '#raschet' || el.classList.contains('header-cta')) return goal('cta_click', { place: place(el) });
  });

  let started = false;
  document.addEventListener('input', (e) => {
    if (started || !e.target.closest('.kc-calc__form')) return;
    started = true;
    goal('calc_start');
  });
  document.addEventListener('change', (e) => {
    if (started || !e.target.closest('.kc-calc__form')) return;
    started = true;
    goal('calc_start');
  });

  // успех формы = блок «спасибо» перестал быть скрытым
  const DONE = [
    ['[data-kc="done"]', 'calc_submit'],
    ['#discuss [data-done]', 'callback_submit'],
    ['#price [data-done]', 'price_submit'],
  ];
  DONE.forEach(([sel, name]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    new MutationObserver(() => { if (!el.hidden) goal(name); }).observe(el, { attributes: true, attributeFilter: ['hidden'] });
  });

  window.ksAnalytics = { init, goal, get id() { return counter; } };
  const meta = document.querySelector('meta[name="ks-metrika"]');
  if (meta) init(meta.content);
})();
