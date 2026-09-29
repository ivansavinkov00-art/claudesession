// Культура шитья — прототип главной, v2. Vanilla JS, без сборки.
// В Tilda всё это заменяется штатными средствами: попапы Zero Block, встроенные формы, фиксированные элементы.
// Три интерактивных модуля (карусель, задачи, квиз) живут отдельно в modules/ — каждый вставляется в Тильду блоком T123.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Режим ?slots: бирка с номером слота на каждой картинке ([data-slot] на обёртке, стили в styles.css)
  if (new URLSearchParams(location.search).has('slots')) document.documentElement.classList.add('show-slots');

  // Ссылки-заглушки (мессенджеры) никуда не ведут и не прыгают наверх
  $$('[data-stub]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

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
      if (id === 'price' || id === 'discuss') resetForm(document.getElementById(id));
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

  // Пункты мобильного меню и кнопка в нём: закрыть меню, якорь или переход к квизу отработают сами.
  // Фокус на «≡» не возвращаем: квиз ставит его на свой заголовок (PLAN-v2.md, 5.1).
  $$('#menu .menu-nav a, #menu .menu-foot .btn').forEach((a) => a.addEventListener('click', () => {
    opener = null;
    $('#menu').close();
  }));

  // ---------- Формы: прайс и «Обсудить задачу» ----------
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE = /^[+\d\s()\-‐‑]+$/;
  function isPhone(value) {
    const v = value.trim();
    const digits = v.replace(/\D/g, '');
    return PHONE.test(v) && digits.length >= 10 && digits.length <= 11;
  }
  const isContact = (value) => EMAIL.test(value.trim()) || isPhone(value);
  // проверка поля по имени: телефон — только телефон, контакт — телефон или e-mail
  const fieldOk = (input) => {
    if (input.type === 'checkbox') return input.checked;
    if (input.name === 'phone') return isPhone(input.value);
    if (input.name === 'contact') return isContact(input.value);
    return input.value.trim().length > 0;
  };

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
  }

  function validate(form) {
    // порядок проверки = порядок полей в форме
    const inputs = ['name', 'phone', 'contact', 'consent'].map((n) => form.elements[n]).filter(Boolean);
    let firstBad = null;
    for (const input of inputs) {
      const ok = fieldOk(input);
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
      if (fieldOk(input)) setError(input, document.getElementById(input.getAttribute('aria-describedby')), false);
    });
  });

  // ---------- Липкая нижняя кнопка < 960px ----------
  // Показывается, когда кнопки первого экрана ушли из вида; прячется, пока на экране квиз (#raschet) или финал.
  const sticky = $('[data-sticky-cta]');
  const heroActions = $('[data-hero-actions]');
  const mobile = window.matchMedia('(max-width: 959px)');
  const inView = new Map(); // цель → видна ли
  let heroActionsAbove = false;

  const syncSticky = () => {
    sticky.hidden = !mobile.matches;
    const heroGone = !inView.get(heroActions);
    const covered = inView.get($('#raschet')) || inView.get($('.final'));
    sticky.classList.toggle('is-visible', mobile.matches && heroGone && !covered);
  };
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      // кнопки первого экрана ниже окна (страница ещё не прокручена) считаем «видимыми», липкая кнопка не нужна
      if (entry.target === heroActions) heroActionsAbove = entry.boundingClientRect.top > 0;
      inView.set(entry.target, entry.target === heroActions ? (entry.isIntersecting || heroActionsAbove) : entry.isIntersecting);
    }
    syncSticky();
  });
  [heroActions, $('#raschet'), $('.final')].forEach((el) => { if (el) { inView.set(el, el === heroActions); io.observe(el); } });
  mobile.addEventListener('change', syncSticky);
  syncSticky();
})();
