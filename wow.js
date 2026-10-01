// Культура шитья, v5: «вау» тёмной темы. Подгружается theme.js только в тёмной теме (PLAN-v5.md).
// Фонарь за курсором и параллакс кадра, пыль в свете окна, проявление слов в заголовках, нить с иглой у левого края,
// магнитные кнопки. Всё декоративное (aria-hidden), всё гасится при prefers-reduced-motion; светлая тема этот файл не получает.
(() => {
  if (window.__ksWow) return;
  window.__ksWow = true;
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const wide = window.matchMedia('(min-width: 960px)');
  const isDark = () => root.dataset.theme === 'dark';
  let fx = null;

  // ---------- Слова заголовков: маска + выезд снизу ----------
  function splitWords(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    let k = 0;
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/([ \t\n\r]+)/).forEach((p) => {
          if (!p) return;
          if (/^[ \t\n\r]+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.className = 'wi'; i.style.setProperty('--k', k++); i.textContent = p;
          w.appendChild(i); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
    });
    walk(el);
    el.classList.add('is-split');
  }

  function headings() {
    const list = $$('.hero .ht-mid, .sec-head h2, .prod-body h2, .founder-body h2, #final-title');
    list.forEach((h) => { h.classList.remove('reveal'); splitWords(h); });
    const show = (h) => h.classList.add('is-in');
    if (reduce.matches || !('IntersectionObserver' in window)) { list.forEach(show); return () => {}; }
    const hero = list.filter((h) => h.closest('.hero'));
    const rest = list.filter((h) => !h.closest('.hero'));
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => hero.forEach(show)));
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    rest.forEach((h) => (h.getBoundingClientRect().top < innerHeight * 0.85 ? show(h) : io.observe(h)));
    return () => io.disconnect();
  }

  // ---------- Фонарь за курсором и параллакс кадра ----------
  function lantern() {
    const hero = $('.hero');
    if (!hero || !fine.matches || reduce.matches) return () => {};
    const el = document.createElement('div');
    el.className = 'hero-lantern'; el.setAttribute('aria-hidden', 'true');
    hero.appendChild(el);
    let tx = 0.7, ty = 0.35, x = tx, y = ty, raf = 0, seen = false;
    const tick = () => {
      x += (tx - x) * 0.09; y += (ty - y) * 0.09;
      hero.style.setProperty('--lx', `${(x * 100).toFixed(2)}%`);
      hero.style.setProperty('--ly', `${(y * 100).toFixed(2)}%`);
      hero.style.setProperty('--px', (x - 0.5).toFixed(3));
      hero.style.setProperty('--py', (y - 0.5).toFixed(3));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height;
      if (!seen) { seen = true; el.classList.add('is-on'); }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    hero.addEventListener('pointermove', move, { passive: true });
    return () => { hero.removeEventListener('pointermove', move); cancelAnimationFrame(raf); el.remove(); hero.style.removeProperty('--px'); hero.style.removeProperty('--py'); };
  }

  // ---------- Пыль в свете окна ----------
  function dust() {
    const hero = $('.hero');
    if (!hero || !wide.matches || reduce.matches) return () => {};
    const cv = document.createElement('canvas');
    cv.className = 'hero-dust'; cv.setAttribute('aria-hidden', 'true');
    hero.appendChild(cv);
    const ctx = cv.getContext('2d');
    if (!ctx) { cv.remove(); return () => {}; }
    let W = 0, H = 0, run = false, raf = 0, last = 0, vis = true;
    const N = 64, ps = [];
    const spawn = (p, init) => {
      p.x = W * (0.42 + 0.58 * Math.random()); p.y = init ? H * Math.random() : H * (0.85 + 0.2 * Math.random());
      p.r = 0.6 + Math.random() * 1.9; p.vx = -(0.04 + Math.random() * 0.16); p.vy = -(0.05 + Math.random() * 0.2);
      p.a = 0.18 + Math.random() * 0.5; p.ph = Math.random() * 6.28; p.s = 0.0004 + Math.random() * 0.0008;
      return p;
    };
    const size = () => { W = cv.width = Math.max(2, Math.round(cv.clientWidth)); H = cv.height = Math.max(2, Math.round(cv.clientHeight)); ps.length = 0; for (let i = 0; i < N; i++) ps.push(spawn({}, true)); };
    const frame = (t) => {
      if (!run) return;
      raf = requestAnimationFrame(frame);
      if (t - last < 33) return;
      last = t;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        p.x += p.vx + Math.sin(t * p.s + p.ph) * 0.12; p.y += p.vy;
        if (p.y < -8 || p.x < -8) spawn(p, false);
        const a = p.a * (0.55 + 0.45 * Math.sin(t * p.s * 2.4 + p.ph)) * (0.35 + 0.65 * Math.min(1, Math.max(0, (p.x / W - 0.3) * 2)));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.2);
        g.addColorStop(0, `rgba(255, 214, 160, ${a.toFixed(3)})`); g.addColorStop(1, 'rgba(255, 214, 160, 0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, 6.2832); ctx.fill();
      }
    };
    const start = () => { if (run || !vis || document.hidden) return; run = true; raf = requestAnimationFrame(frame); };
    const stop = () => { run = false; cancelAnimationFrame(raf); };
    const ro = new ResizeObserver(size); ro.observe(cv);
    size();
    const io = new IntersectionObserver((en) => { vis = en[0].isIntersecting; vis ? start() : stop(); });
    io.observe(hero);
    const vc = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', vc);
    start();
    return () => { stop(); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', vc); cv.remove(); };
  }

  // ---------- Нить с иглой у левого края (иглу двигает CSS по прокрутке) ----------
  function thread() {
    const el = document.createElement('div');
    el.className = 'thread'; el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return () => el.remove();
  }

  // ---------- Магнитные кнопки ----------
  function magnetic() {
    if (!fine.matches || reduce.matches) return () => {};
    const btns = $$('.btn-primary, .btn-on-dark, .header-cta');
    const off = [];
    btns.forEach((b) => {
      const mv = (e) => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.translate = `${(dx * 10).toFixed(1)}px ${(dy * 8).toFixed(1)}px`;
      };
      const lv = () => { b.style.translate = ''; };
      b.addEventListener('pointermove', mv); b.addEventListener('pointerleave', lv);
      off.push(() => { b.removeEventListener('pointermove', mv); b.removeEventListener('pointerleave', lv); b.style.translate = ''; });
    });
    return () => off.forEach((f) => f());
  }

  function enable() {
    if (fx) return;
    fx = [headings(), lantern(), dust(), thread(), magnetic()];
    root.classList.add('wow');
  }
  function disable() {
    if (!fx) return;
    fx.forEach((f) => f());
    fx = null;
    root.classList.remove('wow');
  }
  document.addEventListener('themechange', (e) => (e.detail.theme === 'dark' ? enable() : disable()));
  if (isDark()) enable();
})();
