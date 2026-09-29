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
// При prefers-reduced-motion карусель — плоский ряд со scroll-snap: data-pos не ставится,
// активный индекс определяется по прокрутке ряда.
// Изолирован: IIFE, без глобальных переменных, несколько экземпляров на странице. Переносится в Тильду блоком T123.
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const pad = (n) => String(n).padStart(2, '0');
  const SWIPE = 40;   // px: сдвиг, после которого перетаскивание листает
  const TILT = 5;     // градусы: наклон активной карточки за курсором

  function init(root) {
    const q = (role) => root.querySelector(`[data-kc="${role}"]`);
    const qa = (role) => [...root.querySelectorAll(`[data-kc="${role}"]`)];
    const slides = qa('slide');
    const gotos = qa('goto');
    const index = q('index');
    const stage = q('stage');
    const counter = q('counter');
    const prev = q('prev');
    const next = q('next');
    if (!slides.length || !stage) return;
    const last = slides.length - 1;
    let active = 0;
    const flat = () => reduce.matches;
    const clamp = (i) => Math.max(0, Math.min(last, i));

    // ---------- отрисовка состояния ----------
    function render() {
      slides.forEach((slide, i) => {
        const d = i - active;
        const link = slide.querySelector('[data-kc="calc-link"]');
        // в плоском режиме видны и доступны все карточки
        const inert = !flat() && d !== 0;
        if (flat()) slide.removeAttribute('data-pos'); else slide.setAttribute('data-pos', String(Math.max(-3, Math.min(3, d))));
        if (inert) slide.setAttribute('aria-hidden', 'true'); else slide.removeAttribute('aria-hidden');
        if (link) { if (inert) link.setAttribute('tabindex', '-1'); else link.removeAttribute('tabindex'); }
      });
      gotos.forEach((btn, i) => { if (i === active) btn.setAttribute('aria-current', 'true'); else btn.removeAttribute('aria-current'); });
      if (counter) counter.textContent = `${pad(active + 1)} / ${pad(slides.length)}`;
      if (prev) prev.disabled = active === 0;
      if (next) next.disabled = active === last;
    }

    // активный пункт ряда-указателя прокручиваем в видимость, не трогая прокрутку страницы
    function revealGoto() {
      const btn = gotos[active];
      if (!index || !btn || index.scrollWidth <= index.clientWidth) return;
      index.scrollTo({ left: btn.offsetLeft - (index.clientWidth - btn.offsetWidth) / 2, behavior: reduce.matches ? 'auto' : 'smooth' });
    }

    // плоский режим: карточку — в центр ряда
    function scrollToCard(i) {
      const slide = slides[i];
      stage.scrollTo({ left: slide.offsetLeft - (stage.clientWidth - slide.offsetWidth) / 2, behavior: 'auto' });
    }

    function go(i) {
      i = clamp(i);
      if (flat()) scrollToCard(i);
      if (i === active) return;
      active = i;
      render();
      revealGoto();
    }

    // ---------- стрелки, ряд-указатель, клик по соседней карточке, клавиши ----------
    if (prev) prev.addEventListener('click', () => go(active - 1));
    if (next) next.addEventListener('click', () => go(active + 1));
    gotos.forEach((btn) => btn.addEventListener('click', () => go(Number(btn.dataset.index))));

    slides.forEach((slide, i) => slide.addEventListener('click', (e) => {
      if (i === active && !flat()) return;
      if (e.target.closest('a, button')) return; // «Рассчитать» отрабатывает сама
      e.preventDefault();
      go(i);
    }));

    root.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      go(active + (e.key === 'ArrowRight' ? 1 : -1));
    });

    // ---------- перетаскивание и свайп (3D-режим) ----------
    let drag = null;
    let suppressClick = false;
    stage.addEventListener('pointerdown', (e) => {
      if (flat() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { x: e.clientX, id: e.pointerId, dx: 0, captured: false };
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x;
      if (Math.abs(drag.dx) > 6 && !drag.captured) { stage.setPointerCapture(e.pointerId); drag.captured = true; }
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { dx, captured } = drag;
      drag = null;
      if (captured) {
        suppressClick = true; // после перетаскивания click по карточке не нужен
        setTimeout(() => { suppressClick = false; }, 0);
      }
      if (e.type === 'pointerup' && Math.abs(dx) > SWIPE) go(active + (dx < 0 ? 1 : -1));
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('click', (e) => { if (suppressClick) { e.preventDefault(); e.stopPropagation(); } }, true);

    // ---------- наклон активной карточки за курсором (только мышь, без reduce) ----------
    const card = () => slides[active].querySelector('.kc-carousel__card');
    function resetTilt() {
      slides.forEach((s) => {
        const c = s.querySelector('.kc-carousel__card');
        if (c) { c.style.removeProperty('--tilt-x'); c.style.removeProperty('--tilt-y'); }
      });
    }
    stage.addEventListener('pointermove', (e) => {
      if (flat() || !finePointer.matches || e.pointerType !== 'mouse' || drag) return;
      const c = card();
      if (!c) return;
      const r = slides[active].getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      if (Math.abs(x) > 1 || Math.abs(y) > 1) { resetTilt(); return; }
      c.style.setProperty('--tilt-x', `${(x * TILT).toFixed(2)}deg`);
      c.style.setProperty('--tilt-y', `${(-y * TILT).toFixed(2)}deg`);
    });
    stage.addEventListener('pointerleave', resetTilt);

    // ---------- плоский режим: активный индекс по прокрутке ряда ----------
    let raf = 0;
    stage.addEventListener('scroll', () => {
      if (!flat() || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const center = stage.scrollLeft + stage.clientWidth / 2;
        let best = active, bestDist = Infinity;
        slides.forEach((s, i) => {
          const dist = Math.abs(s.offsetLeft + s.offsetWidth / 2 - center);
          if (dist < bestDist) { best = i; bestDist = dist; }
        });
        if (best !== active) { active = best; render(); revealGoto(); }
      });
    }, { passive: true });

    // переключение reduce в браузере на лету
    reduce.addEventListener('change', () => { resetTilt(); render(); if (flat()) scrollToCard(active); });

    render();
    if (flat()) scrollToCard(active);
  }

  const start = () => document.querySelectorAll('[data-kc-carousel]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
