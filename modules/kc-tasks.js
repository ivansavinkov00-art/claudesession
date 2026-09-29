// kc-tasks — «Ваша задача определяет решение»: ховер-список с картинкой (≥960) и аккордеон (<960).
// Спека: PLAN-v2.md, раздел 6.3. Паттерн — кнопки-раскрывашки с aria-expanded (не tabs), обоснование там же.
//
// Разметка: корень [data-kc-tasks], внутри data-kc:
//   row > toggle[aria-expanded][aria-controls]  строка и её кнопка
//   panel                                       раскрывающаяся часть (id = aria-controls), свёрнутая — inert
//   stage > media[data-index]                   картинки справа (≥960), активная .is-active, остальные aria-hidden
// Ссылки-действия в панелях — a[href="#raschet"][data-calc-direction]; их обрабатывает kc-calc.
// Изолирован: IIFE, без глобальных переменных, несколько экземпляров. Переносится в Тильду блоком T123.
(() => {
  const desktop = window.matchMedia('(min-width: 960px)');
  const hover = window.matchMedia('(hover: hover)');

  function init(root) {
    const rows = [...root.querySelectorAll('[data-kc="row"]')];
    const media = [...root.querySelectorAll('[data-kc="media"]')];
    if (!rows.length) return;
    const toggleOf = (row) => row.querySelector('[data-kc="toggle"]');
    const panelOf = (row) => row.querySelector('[data-kc="panel"]');

    // open = индекс открытой строки или -1 (все закрыты — только на <960)
    function setOpen(open) {
      rows.forEach((row, i) => {
        const on = i === open;
        row.classList.toggle('is-open', on);
        toggleOf(row).setAttribute('aria-expanded', String(on));
        panelOf(row).inert = !on;
      });
      media.forEach((m, i) => {
        const on = i === open;
        m.classList.toggle('is-active', on);
        if (on) m.removeAttribute('aria-hidden'); else m.setAttribute('aria-hidden', 'true');
      });
    }

    // TODO 6.3: клик по toggle — на ≥960 только активирует, на <960 переключает;
    //   на ≥960 при hover.matches — pointerenter на row активирует; focusin на toggle активирует (≥960);
    //   desktop 'change': если на ≥960 ничего не открыто — открыть 0.
    void desktop; void hover;

    const initial = rows.findIndex((r) => r.classList.contains('is-open'));
    setOpen(initial === -1 ? 0 : initial);
  }

  const start = () => document.querySelectorAll('[data-kc-tasks]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
