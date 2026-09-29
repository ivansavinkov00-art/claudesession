// kc-carousel — 3D-карусель «Что мы шьём» (coverflow на CSS 3D, без библиотек).
// Спека: PLAN-v2.md, раздел 6.2. Контракт хуков: раздел 4.3.
//
// Разметка: корень [data-kc-carousel] (role="region", aria-roledescription="карусель"), внутри data-kc:
//   index > goto[data-index]   ряд-указатель, у активного aria-current="true"
//   stage > slide[data-index]  карточки; JS ставит data-pos = index − active, в пределах −3…3
//   calc-link                  «Рассчитать» внутри карточки (a[href="#raschet"][data-calc-item])
//   prev / next                стрелки (disabled на краях, без закольцовки)
//   counter                    «03 / 06», aria-live="polite"
// Геометрия — в kc-carousel.css по [data-pos]; JS только расставляет позиции.
// Изолирован: IIFE, без глобальных переменных, несколько экземпляров на странице. Переносится в Тильду блоком T123.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const pad = (n) => String(n).padStart(2, '0');

  function init(root) {
    const q = (role) => root.querySelector(`[data-kc="${role}"]`);
    const qa = (role) => [...root.querySelectorAll(`[data-kc="${role}"]`)];
    const slides = qa('slide');
    const gotos = qa('goto');
    const stage = q('stage');
    const counter = q('counter');
    const prev = q('prev');
    const next = q('next');
    if (!slides.length || !stage) return;
    let active = 0;

    // TODO 6.2: go(i, { from: 'arrow' | 'goto' | 'key' | 'drag' | 'click' | 'scroll' })
    //   3D-режим: data-pos у слайдов, aria-hidden и tabindex="-1" у ссылок неактивных,
    //   aria-current у goto, disabled у стрелок на краях, counter = `${pad(i + 1)} / ${pad(slides.length)}`,
    //   активный goto прокрутить в видимость (inline: 'nearest').
    //   Плоский режим (reduce): прокрутить stage к карточке, aria-hidden не ставить.
    function go(i) {
      active = Math.max(0, Math.min(slides.length - 1, i));
      // …
      void counter; void prev; void next; void gotos; void pad;
    }

    // TODO 6.2: стрелки; goto; click по неактивному слайду; keydown ←/→ на root;
    //   перетаскивание pointer-событиями на stage (порог 40px, подавить click после drag, touch-action: pan-y);
    //   наклон активной карточки за курсором (--tilt-x / --tilt-y, ±5deg) только при finePointer.matches && !reduce.matches;
    //   в плоском режиме — active по прокрутке stage (ближайший к центру слайд, rAF).
    //   Подписаться на reduce/finePointer 'change' и перерисовать.
    void finePointer;

    go(0);
  }

  const start = () => document.querySelectorAll('[data-kc-carousel]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
