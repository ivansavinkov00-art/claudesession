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

  // подписи для панели «Ваш проект» и строки-итога
  const LABELS = {
    direction: { wb: 'Партия для WB и OZON', brand: 'Коллекция бренда', opt: 'Опт и СТМ', sample: 'Образец' },
    item: { hoodie: 'Худи', ziphoodie: 'Зип-худи', sweatshirt: 'Свитшот', shirt: 'Рубашка', dress: 'Платье', pants: 'Брюки', shorts: 'Шорты', other: 'Другое' },
    models: { '1': '1', '2-3': '2–3', '4+': '4 и больше' },
    fabric: { own: 'Своя — давальческое сырьё', consult: 'Нужна консультация по ткани' },
    service: { patterns: 'Лекала и конструирование', labels: 'Бирки и составы', packaging: 'Упаковка по ТЗ', dtf: 'Печать DTF', embroidery: 'Вышивка' },
    when: { asap: 'Как можно скорее', month: 'В течение месяца', '1-2m': 'Через 1–2 месяца', later: 'Пока присматриваюсь' },
  };
  const MIN_BATCH_DIRECTIONS = ['wb', 'opt'];

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // телефон: 10–11 цифр, допустимы + ( ) - и пробелы; или e-mail
  function isContact(value) {
    const v = value.trim();
    if (EMAIL.test(v)) return true;
    const digits = v.replace(/\D/g, '');
    return /^[+\d\s()\-‐‑]+$/.test(v) && digits.length >= 10 && digits.length <= 11;
  }

  function init(root) {
    const form = root.querySelector('form');
    const q = (role) => root.querySelector(`[data-kc="${role}"]`);
    const steps = [...root.querySelectorAll('[data-kc="step"]')];
    if (!form || steps.length !== STEPS) return null;
    let cur = 1;

    // TODO 6.4: show(n, { focus }) · validate(n) · next / prev / submit · syncMode() (sample: qty ↔ models)
    //   · syncHint() (< MIN_BATCH для MIN_BATCH_DIRECTIONS, «Переключить» → brand) · syncSizes() (nonstandard)
    //   · renderSummary() из FormData (пусто → «—») + sumline · быстрые варианты количества · reset()
    //   · гашение ошибок на input/change. Отправка: // TODO: отправка (Тильда: форма-квиз → почта + Telegram)
    void q; void cur; void isContact; void LABELS;

    return {
      // prefill({ direction, items, nonstandard }) — вызывается из перехвата ссылок (ниже)
      prefill(opts) { void opts; },
      // куда ставить фокус после перехода: заголовок активного шага или #kc-sizes
      focusTarget(nonstandard) {
        return nonstandard ? root.querySelector('#kc-sizes') : steps[cur - 1].querySelector('[data-kc="heading"]');
      },
      root,
    };
  }

  function start() {
    const calcs = [...document.querySelectorAll('[data-kc-calc]')].map(init).filter(Boolean);
    const calc = calcs[0];
    if (!calc) return;

    // Переход к квизу с предвыбором (PLAN-v2.md, 4.2)
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
