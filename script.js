// Культура шитья — прототип главной. Vanilla JS, без сборки.
// В Tilda всё это заменяется штатными средствами: попапы Zero Block, встроенные формы, фиксированные элементы.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Режим ?slots: бирка с номером слота на каждой картинке ([data-slot] на обёртке, стили в styles.css)
  if (new URLSearchParams(location.search).has('slots')) document.documentElement.classList.add('show-slots');

  // Ссылки-заглушки (Портфолио, мессенджеры) никуда не ведут и не прыгают наверх
  $$('[data-stub]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

  // Шапка: фон --linen и линия снизу после начала прокрутки
  const header = $('[data-header]');
  const syncHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();

  // ---------- Диалоги: <dialog>.showModal() даёт фокус-ловушку, inert-фон и Esc ----------
  let opener = null;

  function openDialog(id, trigger) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    $$('dialog[open]').forEach((d) => d !== dialog && d.close());
    if (dialog.open) return;
    opener = trigger || null;
    dialog.showModal();
  }

  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) {
      const id = openBtn.dataset.open;
      if (id === 'calc') resetForm($('#calc'));
      if (id === 'price') resetForm($('#price'));
      if (id === 'calc' && openBtn.dataset.direction) setDirection(openBtn.dataset.direction);
      openDialog(id, openBtn);
      return;
    }
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) closeBtn.closest('dialog').close();
  });

  $$('dialog').forEach((dialog) => {
    // клик по фону: и нажатие, и отпускание снаружи окна (выделение текста с выходом за край не закрывает)
    const outside = (e) => {
      const r = dialog.getBoundingClientRect();
      return e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
    };
    let downOutside = false;
    dialog.addEventListener('pointerdown', (e) => { downOutside = outside(e); });
    dialog.addEventListener('click', (e) => { if (downOutside && outside(e)) dialog.close(); downOutside = false; });
    dialog.addEventListener('close', () => {
      if (opener && document.contains(opener) && !opener.closest('dialog')) opener.focus({ preventScroll: true });
      opener = null;
    });
  });

  // Пункты мобильного меню: закрыть меню, якорь отработает сам
  $$('#menu .menu-nav a:not([data-stub])').forEach((a) => a.addEventListener('click', () => $('#menu').close()));

  // ---------- Формы ----------
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function isContact(value) {
    const v = value.trim();
    if (EMAIL.test(v)) return true;
    const digits = v.replace(/\D/g, '');
    return /^[+\d\s()\-‐‑]+$/.test(v) && digits.length >= 10 && digits.length <= 12;
  }

  function setError(input, errEl, show) {
    input.setAttribute('aria-invalid', show ? 'true' : 'false');
    errEl.hidden = !show;
  }

  function resetForm(dialog) {
    if (!dialog) return;
    const form = $('form', dialog);
    const done = $('[data-done]', dialog);
    if (!done.hidden) { form.reset(); form.hidden = false; done.hidden = true; }
    $$('[aria-invalid]', form).forEach((i) => i.setAttribute('aria-invalid', 'false'));
    $$('.err', form).forEach((e) => { e.hidden = true; });
    syncQtyHint();
  }

  function validate(form) {
    const checks = [];
    const name = form.elements.name;
    if (name) checks.push([name, name.value.trim().length > 0]);
    const contact = form.elements.contact;
    checks.push([contact, isContact(contact.value)]);
    const consent = form.elements.consent;
    checks.push([consent, consent.checked]);

    let firstBad = null;
    for (const [input, ok] of checks) {
      setError(input, document.getElementById(input.getAttribute('aria-describedby')), !ok);
      if (!ok && !firstBad) firstBad = input;
    }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  $$('form[data-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate(form)) return;
      // TODO: отправка (в Тильде — встроенные формы → почта + Telegram)
      const dialog = form.closest('dialog');
      const done = $('[data-done]', dialog);
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });
    // ошибка поля гаснет, как только поле исправлено
    form.addEventListener('input', (e) => {
      const input = e.target;
      if (input.getAttribute('aria-invalid') !== 'true') return;
      const ok = input.type === 'checkbox' ? input.checked
        : input.name === 'contact' ? isContact(input.value)
        : input.value.trim().length > 0;
      if (ok) setError(input, document.getElementById(input.getAttribute('aria-describedby')), false);
    });
  });

  // ---------- Калькулятор: мягкий отсев партий < 300 ед. в «Опте» ----------
  const calc = $('#calc');
  const qty = $('#calc-qty');
  const qtyHint = $('[data-qty-hint]');

  function setDirection(value) {
    const radio = $(`input[name="direction"][value="${value}"]`, calc);
    if (radio) radio.checked = true;
    syncQtyHint();
  }

  function syncQtyHint() {
    const dir = $('input[name="direction"]:checked', calc)?.value;
    const n = Number(qty.value);
    qtyHint.hidden = !(dir === 'opt' && qty.value !== '' && n > 0 && n < 300);
  }

  qty.addEventListener('input', syncQtyHint);
  $$('input[name="direction"]', calc).forEach((r) => r.addEventListener('change', syncQtyHint));
  $('[data-switch-exp]', calc).addEventListener('click', () => {
    setDirection('exp');
    $('input[name="direction"][value="exp"]', calc).focus();
  });

  // ---------- Липкая нижняя кнопка < 960px ----------
  const sticky = $('[data-sticky-cta]');
  const heroActions = $('[data-hero-actions]');
  const mobile = window.matchMedia('(max-width: 959px)');
  let heroActionsVisible = true;

  const syncSticky = () => {
    sticky.hidden = !mobile.matches;
    sticky.classList.toggle('is-visible', mobile.matches && !heroActionsVisible);
  };
  new IntersectionObserver(([entry]) => {
    heroActionsVisible = entry.isIntersecting || entry.boundingClientRect.top > 0;
    syncSticky();
  }).observe(heroActions);
  mobile.addEventListener('change', syncSticky);
  syncSticky();
})();
