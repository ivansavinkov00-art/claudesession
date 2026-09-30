// Культура шитья, v3: появление блоков, ткань первого экрана (WebGL), пауза бегущей строки.
// Без сборки. Всё необязательное: страница читается без этого файла (PLAN-v3.md, раздел 5).
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- Появление блоков ----------
  // Классы ставим сами, чтобы не раздувать разметку. Контент скрыт только пока IO не подтвердил выход в экран.
  const GROUPS = [
    '.sec-head', '.prod-body > *', '.facts .fact', '.founder-body > *', '.seam-inner',
    '.path li', '.final-inner > *', '.footer-call', '.footer-col', '.hero-facts > div',
  ];
  const targets = [];
  GROUPS.forEach((sel) => $$(sel).forEach((el) => {
    if (el.closest('dialog') || el.classList.contains('reveal')) return;
    // порядок внутри родителя даёт задержку (не больше 5 шагов)
    const i = [...el.parentElement.children].indexOf(el);
    el.style.setProperty('--i', Math.min(i, 5));
    el.classList.add('reveal');
    targets.push(el);
  }));
  if ('IntersectionObserver' in window && !reduce.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add('is-in'));
  }

  // ---------- Бегущая строка: кнопка паузы (WCAG 2.2.2) ----------
  const marquee = $('[data-marquee]');
  const pauseBtn = $('[data-marquee-pause]');
  if (marquee && pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      const paused = marquee.classList.toggle('is-paused');
      pauseBtn.setAttribute('aria-pressed', String(paused));
      pauseBtn.setAttribute('aria-label', paused ? 'Запустить бегущую строку' : 'Остановить бегущую строку');
    });
  }

  // ---------- Ткань первого экрана ----------
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `precision mediump float;
uniform vec2 uRes;uniform float uT;uniform vec2 uM;uniform float uS;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
void main(){
 vec2 px=gl_FragCoord.xy;vec2 uv=px/uRes;float asp=uRes.x/uRes.y;
 vec2 q=vec2(uv.x*asp,uv.y);vec2 m=vec2(uM.x*asp,uM.y);
 float d=distance(q,m);
 // медленная складка полотна и круги от курсора
 float w=sin(q.x*2.6+uT*.22+n(q*1.8)*3.)*.012+sin(q.y*3.4-uT*.17+q.x)*.008;
 w+=.02*exp(-d*d*9.)*sin(d*16.-uT*1.4);
 vec2 g=(px+vec2(w,w*.6)*uRes.y*.6)/uS;
 // переплетение: уток и основа со сдвигом в шахматку
 float warp=.5+.5*sin(g.x*6.2832);float weft=.5+.5*sin(g.y*6.2832);
 float chk=mod(floor(g.x)+floor(g.y),2.);
 float th=mix(warp,weft,chk);
 float slub=n(vec2(g.x*.22,g.y*5.))*.6+n(vec2(g.x*6.,g.y*.25))*.4;
 float light=smoothstep(.95,0.,d);
 vec3 base=vec3(.902,.871,.808);
 float k=1.+(th-.5)*.05+(slub-.5)*.05+(light-.35)*.07+w*1.6;
 gl_FragColor=vec4(base*k,1.);
}`;

  function initFabric() {
    const hero = $('.hero');
    const cv = $('.fabric');
    if (!hero || !cv) return;
    if (window.matchMedia('(max-width: 959px)').matches) return;
    if (navigator.connection && navigator.connection.saveData) return;
    const gl = cv.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT);
    const fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const uRes = U('uRes'), uT = U('uT'), uM = U('uM'), uS = U('uS');

    const SCALE = 0.5; // рендер в половинном разрешении: ткань мягкая, GPU почти не нагружен
    let mx = 0.62, my = 0.5, tx = mx, ty = my;
    let running = false, raf = 0, last = 0;
    const t0 = performance.now();

    const resize = () => {
      const w = Math.max(2, Math.round(cv.clientWidth * SCALE));
      const h = Math.max(2, Math.round(cv.clientHeight * SCALE));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      gl.viewport(0, 0, w, h);
    };
    const draw = (t) => {
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uT, t);
      gl.uniform2f(uM, mx, my);
      gl.uniform1f(uS, 3.0); // период нити в пикселях рендера = 6 css px
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const frame = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // 30 к/с
      last = now;
      mx += (tx - mx) * 0.08; my += (ty - my) * 0.08;
      draw((now - t0) / 1000);
    };
    const start = () => { if (running || reduce.matches) return; running = true; raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    draw(4.0);
    cv.classList.add('is-on');
    if (reduce.matches) return; // один статичный кадр

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = 1 - (e.clientY - r.top) / r.height;
    }, { passive: true });
    let visible = true;
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; visible && !document.hidden ? start() : stop(); }).observe(hero);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : visible && start(); });
    window.addEventListener('resize', () => { resize(); if (!running) draw(4.0); }, { passive: true });
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); cv.classList.remove('is-on'); });
    start();
  }

  const boot = () => ('requestIdleCallback' in window ? requestIdleCallback(initFabric, { timeout: 1200 }) : setTimeout(initFabric, 300));
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot, { once: true });
})();
