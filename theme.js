// Культура шитья, v4: переключатель темы и поведение шапки в тёмной теме (PLAN-v4.md, 2.3 и 5).
// Начальная тема ставится инлайн-скриптом в <head> (без мигания); здесь только действия пользователя.
(() => {
  const root = document.documentElement;
  const KEY = 'ks-theme';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggles = [...document.querySelectorAll('[data-theme-toggle]')];
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');

  const sync = () => {
    const dark = root.dataset.theme === 'dark';
    toggles.forEach((b) => {
      b.setAttribute('aria-pressed', String(dark));
      b.setAttribute('aria-label', dark ? 'Светлая тема' : 'Тёмная тема');
    });
  };

  function setTheme(next) {
    const apply = () => {
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* приватный режим */ }
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.content = next === 'dark' ? '#14100D' : '#E6DECE';
      sync();
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
    };
    if (document.startViewTransition && !reduce.matches) document.startViewTransition(apply); else apply();
  }

  toggles.forEach((b) => b.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark')));
  sync();

  // Шапка в тёмной теме прозрачна над фото первого экрана и сплошная ниже (иначе текст страницы лёг бы под навигацию)
  if (header && hero && 'IntersectionObserver' in window) {
    const h = () => parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 80;
    let io = null;
    const watch = () => {
      if (io) io.disconnect();
      io = new IntersectionObserver((en) => header.classList.toggle('is-solid', !en[0].isIntersecting), { rootMargin: `-${h()}px 0px 0px 0px`, threshold: 0 });
      io.observe(hero);
    };
    watch();
    window.addEventListener('resize', watch, { passive: true });
  } else if (header) {
    header.classList.add('is-solid');
  }
})();
