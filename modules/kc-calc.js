// kc-calc — квиз «Рассчитать стоимость» из четырёх шагов + панель «Ваш проект».
// Спека: PLAN-v2.md, раздел 6.4; поля, значения, ошибки — 4.4; переход и предвыбор — 4.2.
//
// Разметка: корень [data-kc-calc], внутри data-kc:
//   step[data-step=1…4] (fieldset, неактивные hidden) > heading (h3, tabindex="-1")
//   progress · ruler (--kc-step) · prev · next · submit · done
//   qty-wrap · models-wrap · qty-quick[data-value] · hint · switch · sizes-wrap
//   summary > sum[data-key=direction|items|qty|fabric|services|when] · sumline
// Перехватывает клик по любому a[href="#raschet"] на странице и читает с него
//   data-calc-direction (wb|brand|opt|sample), data-calc-item (через пробел), data-calc-nonstandard.
// Логика не сложнее одного уровня условий (подсказка < 300, поле моделей для «Образца») — квиз должен
// повторяться штатной формой-квизом Тильды.
// Изолирован: IIFE, без глобальных переменных. Переносится в Тильду блоком T123.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const STEPS = 4;
  const MIN_BATCH = 300;
  const MIN_BATCH_DIRECTIONS = ['wb', 'opt']; // здесь < 300 ед. — подсказка, а не ошибка

  // подписи для панели «Ваш проект» и строки-итога
  const LABELS = {
    direction: { wb: 'Партия для WB и OZON', brand: 'Коллекция бренда', opt: 'Опт и СТМ', sample: 'Образец' },
    item: { hoodie: 'Худи', ziphoodie: 'Зип-худи', sweatshirt: 'Свитшот', shirt: 'Рубашка', dress: 'Платье', pants: 'Брюки', shorts: 'Шорты', other: 'Другое' },
    models: { '1': '1', '2-3': '2–3', '4+': '4 и больше' },
    fabric: { own: 'Своя — давальческое сырьё', consult: 'Нужна консультация по ткани' },
    service: { patterns: 'Лекала и конструирование', labels: 'Бирки и составы', packaging: 'Упаковка по ТЗ', dtf: 'Печать DTF', embroidery: 'Вышивка' },
    when: { asap: 'Как можно скорее', month: 'В течение месяца', '1-2m': 'Через 1–2 месяца', later: 'Пока присматриваюсь' },
  };

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // телефон: 10–11 цифр, допустимы + ( ) - и пробелы; или e-mail
  function isContact(value) {
    const v = value.trim();
    if (EMAIL.test(v)) return true;
    const digits = v.replace(/\D/g, '');
    return /^[+\d\s()\-‐‑]+$/.test(v) && digits.length >= 10 && digits.length <= 11;
  }
  const isQty = (value) => value.trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 1;

  function init(root) {
    const form = root.querySelector('form');
    const q = (role) => root.querySelector(`[data-kc="${role}"]`);
    const steps = [...root.querySelectorAll('[data-kc="step"]')];
    if (!form || steps.length !== STEPS) return null;
    const el = form.elements;
    const done = q('done');
    const hint = q('hint');
    let cur = 1;

    // ---------- данные формы ----------
    const checked = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
    function data() {
      return {
        direction: el.direction.value,
        items: checked('item'),
        qty: el.qty.value,
        models: el.models.value,
        nonstandard: el.nonstandard.checked,
        sizes: el.sizes.value.trim(),
        fabric: el.fabric.value,
        services: checked('service'),
        when: el.when.value,
        name: el.name.value.trim(),
        contact: el.contact.value.trim(),
        messenger: el.messenger.value,
        consent: el.consent.checked,
      };
    }

    // ---------- поля с проверкой (PLAN-v2.md, 4.4) ----------
    const errEl = (id) => document.getElementById(id);
    const FIELDS = {
      1: [{ err: 'kc-err-direction', ok: (d) => !!d.direction, target: () => el.direction[0] }],
      2: [
        { err: 'kc-err-item', ok: (d) => d.items.length > 0, target: () => form.querySelector('input[name="item"]') },
        { err: 'kc-err-qty', ok: (d) => d.direction === 'sample' || isQty(d.qty), target: () => el.qty },
      ],
      3: [],
      4: [
        { err: 'kc-err-name', ok: (d) => d.name.length > 0, target: () => el.name },
        { err: 'kc-err-contact', ok: (d) => isContact(d.contact), target: () => el.contact },
        { err: 'kc-err-consent', ok: (d) => d.consent, target: () => el.consent },
      ],
    };
    const allFields = Object.values(FIELDS).flat();

    function showError(field, on) {
      errEl(field.err).hidden = !on;
      field.target().setAttribute('aria-invalid', on ? 'true' : 'false');
    }
    // первое невалидное поле шага (или null); ошибки показываются у всех невалидных полей шага
    function validate(n) {
      const d = data();
      let first = null;
      for (const field of FIELDS[n]) {
        const ok = field.ok(d);
        showError(field, !ok);
        if (!ok && !first) first = field.target();
      }
      return first;
    }
    // ошибка гаснет, как только поле исправлено
    function clearFixedErrors() {
      const d = data();
      for (const field of allFields) if (!errEl(field.err).hidden && field.ok(d)) showError(field, false);
    }

    // ---------- шаги ----------
    const headingOf = (n) => steps[n - 1].querySelector('[data-kc="heading"]');
    function show(n, { focus = true } = {}) {
      cur = n;
      steps.forEach((s, i) => { s.hidden = i + 1 !== n; });
      q('progress').textContent = `Шаг ${n} из ${STEPS}`;
      q('ruler').style.setProperty('--kc-step', String(n));
      q('prev').hidden = n === 1;
      q('next').hidden = n === STEPS;
      q('submit').hidden = n !== STEPS;
      if (focus) headingOf(n).focus({ preventScroll: true });
      // если верх квиза ушёл выше шапки — вернуть его в окно
      if (focus && root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
    }

    // ---------- зависимости между полями ----------
    function syncMode() {
      const sample = el.direction.value === 'sample';
      q('qty-wrap').hidden = sample;
      q('models-wrap').hidden = !sample;
    }
    function syncHint() {
      const d = data();
      const n = Number(d.qty);
      hint.hidden = !(MIN_BATCH_DIRECTIONS.includes(d.direction) && d.qty !== '' && n > 0 && n < MIN_BATCH);
    }
    function syncSizes() { q('sizes-wrap').hidden = !el.nonstandard.checked; }
    function syncQuick() {
      const v = el.qty.value;
      root.querySelectorAll('[data-kc="qty-quick"]').forEach((b) => b.classList.toggle('is-active', v !== '' && v === b.dataset.value));
    }

    // ---------- панель «Ваш проект» и строка-итог ----------
    function summary() {
      const d = data();
      const items = d.items.map((v) => LABELS.item[v]);
      if (d.nonstandard) items.push('нестандартные размеры');
      return {
        direction: LABELS.direction[d.direction] || '',
        items: items.join(', '),
        qty: d.direction === 'sample' ? `Моделей: ${LABELS.models[d.models]}` : (d.qty.trim() ? `${d.qty.trim()} ед.` : ''),
        fabric: LABELS.fabric[d.fabric] || '',
        services: d.services.map((v) => LABELS.service[v]).join(', '),
        when: LABELS.when[d.when] || '',
      };
    }
    function renderSummary() {
      const s = summary();
      root.querySelectorAll('[data-kc="sum"]').forEach((dd) => {
        const v = s[dd.dataset.key];
        dd.textContent = v || '—';
        dd.classList.toggle('is-empty', !v);
      });
      q('sumline').textContent = [s.direction, s.items, s.qty].filter(Boolean).join(' · ');
    }

    function sync() { syncMode(); syncHint(); syncSizes(); syncQuick(); renderSummary(); }
    const onChange = () => { sync(); clearFixedErrors(); };
    form.addEventListener('input', onChange);
    form.addEventListener('change', onChange);

    // ---------- кнопки ----------
    root.querySelectorAll('[data-kc="qty-quick"]').forEach((b) => b.addEventListener('click', () => {
      el.qty.value = b.dataset.value;
      onChange();
    }));
    q('switch').addEventListener('click', () => {
      el.direction.value = 'brand'; // «Партии меньше 300 ед. шьём в направлении „Коллекция бренда“»
      onChange();
    });
    q('prev').addEventListener('click', () => show(cur - 1));
    function nextStep() {
      const bad = validate(cur);
      if (bad) { bad.focus(); return; }
      show(cur + 1);
    }
    q('next').addEventListener('click', nextStep);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Enter в поле на шагах 1–3 работает как «Далее»
      if (cur < STEPS) { nextStep(); return; }
      for (let n = 1; n <= STEPS; n++) {
        const bad = validate(n);
        if (bad) { if (n !== cur) show(n, { focus: false }); bad.focus(); return; }
      }
      // TODO: отправка (Тильда: форма-квиз → почта + Telegram)
      // payload: data() — направление, изделия, количество / модели, ткань, услуги, срок, имя, контакт, мессенджер
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });

    // ---------- сброс и предвыбор ----------
    function reset() {
      form.reset();
      allFields.forEach((f) => showError(f, false));
      done.hidden = true;
      form.hidden = false;
      sync();
      show(1, { focus: false });
    }

    // opts: { direction, items[], nonstandard } — с ссылок a[href="#raschet"] (PLAN-v2.md, 4.2)
    function prefill({ direction, items, nonstandard }) {
      if (!done.hidden) reset();
      if (direction && LABELS.direction[direction]) el.direction.value = direction;
      const known = (items || []).filter((v) => LABELS.item[v]);
      if (known.length) form.querySelectorAll('input[name="item"]').forEach((i) => { i.checked = known.includes(i.value); });
      if (nonstandard) el.nonstandard.checked = true;
      sync();
      clearFixedErrors();
      if (nonstandard) show(2, { focus: false });
      else if (direction || known.length) show(1, { focus: false });
    }

    sync();
    show(1, { focus: false });

    return {
      root,
      prefill,
      // куда ставить фокус после перехода: заголовок активного шага или поле описания размеров
      focusTarget: (nonstandard) => (nonstandard ? el.sizes : headingOf(cur)),
    };
  }

  function start() {
    const calc = [...document.querySelectorAll('[data-kc-calc]')].map(init).find(Boolean);
    if (!calc) return;

    // Переход к квизу с предвыбором (PLAN-v2.md, 4.2): один обработчик на весь документ
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href="#raschet"]');
      if (!link) return;
      e.preventDefault();
      const opts = {
        direction: link.dataset.calcDirection || null,
        items: (link.dataset.calcItem || '').split(/\s+/).filter(Boolean),
        nonstandard: link.hasAttribute('data-calc-nonstandard'),
      };
      const dialog = link.closest('dialog[open]');
      if (dialog) dialog.close(); // script.js закрывает меню без возврата фокуса (PLAN-v2.md, 5.1)
      requestAnimationFrame(() => {
        calc.prefill(opts);
        calc.root.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
        calc.focusTarget(opts.nonstandard)?.focus({ preventScroll: true });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
