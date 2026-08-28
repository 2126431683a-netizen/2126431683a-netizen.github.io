(function () {
  'use strict';

  /* ============================================================
     全站特效层（fx.js —— 首页 + 各级子页面共享）
     1) 固定粒子流光：细尘缓慢上升 + 偶尔的字符余烬，整体呈
        “月之暗面”式的灰阶星尘材质；
     2) 段落切换：滚动进入新段落时，顶部边界扫过一条粒子幕
        （上滑动效 + 粒子特效），段落内容上滑淡入；
     3) 鼠标指针轻微火花尾迹（仅 fine pointer）。
     尊重 prefers-reduced-motion；标签页隐藏时暂停。
     ============================================================ */

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZрдщэьъёя月暗面星系河·.,:;'.split('');
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  var canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  var dots = document.createElement('div');
  dots.className = 'fx-dots';
  dots.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dots);

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var W = 0, H = 0;
  var parts = [];
  var flashes = [];
  var running = false, raf = null;
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function spawnAmbient() {
    // 细尘
    for (var i = 0; i < 46; i++) {
      parts.push({
        kind: 0,
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.08, 0.08), vy: rand(-0.22, -0.04),
        s: rand(0.6, 1.8),
        a: rand(0.06, 0.3),
        tw: rand(0, Math.PI * 2)
      });
    }
    // 字符余烬（少量，缓升）
    for (var j = 0; j < 7; j++) {
      parts.push({
        kind: 1,
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.05, 0.05), vy: rand(-0.28, -0.12),
        ch: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        s: rand(9, 15),
        a: rand(0.05, 0.16),
        tw: rand(0, Math.PI * 2),
        life: 0
      });
    }
  }

  // 段落进入：沿顶部边界扫一条粒子幕
  function boundaryBurst(y) {
    var yy = clamp(y, 20, H - 20);
    var n = 64;
    for (var i = 0; i < n; i++) {
      var isGlyph = i % 7 === 0;
      parts.push({
        kind: isGlyph ? 1 : 0,
        x: rand(0, W),
        y: yy + rand(-6, 6),
        vx: rand(-0.55, 0.55),
        vy: rand(-1.7, -0.3),
        ch: isGlyph ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : null,
        s: isGlyph ? rand(8, 14) : rand(1, 2.4),
        a: rand(0.25, 0.7),
        tw: rand(0, Math.PI * 2),
        life: rand(50, 90)
      });
    }
    flashes.push({ y: yy, t: 0 });
  }

  function step(dt) {
    ctx.clearRect(0, 0, W, H);

    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      if (p.life !== undefined) {
        p.life -= dt * 0.06;
        if (p.life <= 0 || p.y < -10 || p.x < -10 || p.x > W + 10) {
          parts.splice(i, 1);
          continue;
        }
      }
      // 尘埃/余烬飘出边界后重投（流动循环）
      if (p.y < -12) {
        p.y = H + 8;
        p.x = rand(0, W);
      } else if (p.x < -12) p.x = W + 6;
      else if (p.x > W + 12) p.x = -6;

      var tw = 0.6 + 0.4 * Math.sin(p.tw + performance.now() * 0.0012);
      var alpha = p.a * tw;
      if (p.life !== undefined) alpha *= clamp(p.life / 40, 0, 1);

      if (p.kind === 1) {
        ctx.font = Math.round(p.s) + 'px "Fusion Pixel 12px Mono zh_hans", Menlo, Consolas, monospace';
        ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
        ctx.fillText(p.ch, p.x, p.y);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
        ctx.fillRect(p.x, p.y, p.s, p.s);
      }
    }

    // 边界闪光幕（细白幕布快速淡去）
    for (var f = flashes.length - 1; f >= 0; f--) {
      var fl = flashes[f];
      fl.t += dt;
      var k = fl.t / 700;
      if (k >= 1) {
        flashes.splice(f, 1);
        continue;
      }
      var a2 = 0.16 * (1 - k);
      var g = ctx.createLinearGradient(0, fl.y - 60, 0, fl.y + 60);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,' + a2.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, fl.y - 60, W, 120);
    }
  }

  var lastT = 0;
  function loop(t) {
    if (!running) return;
    var dt = lastT ? t - lastT : 16;
    lastT = t;
    step(dt);
    raf = requestAnimationFrame(loop);
  }
  function startFx() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
  function stopFx() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  window.addEventListener('resize', resize);
  resize();
  spawnAmbient();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopFx();
    else startFx();
  });
  startFx();

  /* ---- 段落入场 + 边界粒子幕 ---- */
  var sections = document.querySelectorAll('main > section, main > .page, header.page-hero, section.contact-band, .scene');
  var observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('fx-sec', 'fx-in');
          observer.unobserve(entry.target);
          var rect = entry.target.getBoundingClientRect();
          boundaryBurst(rect.top <= 60 ? 60 : rect.top);
        });
      }, { threshold: 0.16 })
    : null;

  sections.forEach(function (sec) {
    if (observer) {
      sec.classList.add('fx-sec');
      observer.observe(sec);
    } else {
      sec.classList.add('fx-in');
    }
  });

  /* ---- 鼠标尾迹 ---- */
  if (window.matchMedia('(pointer: fine)').matches) {
    var lastSpawn = 0;
    window.addEventListener('pointermove', function (e) {
      var now = performance.now();
      if (now - lastSpawn < 70) return;
      lastSpawn = now;
      parts.push({
        kind: 0,
        x: e.clientX + rand(-3, 3),
        y: e.clientY + rand(-3, 3),
        vx: rand(-0.15, 0.15),
        vy: rand(-0.4, -0.1),
        s: rand(0.7, 1.6),
        a: rand(0.1, 0.3),
        tw: rand(0, Math.PI * 2),
        life: 40
      });
    }, { passive: true });
  }
})();
