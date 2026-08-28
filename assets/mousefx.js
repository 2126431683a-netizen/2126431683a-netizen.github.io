(function () {
  'use strict';

  /* ============================================================
     mousefx —— 全站鼠标追踪光球
     Canvas 2D（无 WebGL 依赖，任何机器都能跑）：
     一颗冷白蓝光球以弹性惯性追随光标，移动时拖出像素星光尾迹；
     静止 2.5s 后光球淡出，移动立即恢复；触摸/点击时在触点爆发
     一小撮星尘。fixed 全屏、pointer-events:none、DPR 自适应、
     尊重 prefers-reduced-motion、标签页隐藏暂停。
     ============================================================ */

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'mousefx';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;
  var target = { x: -200, y: -200 };        // 光标位置
  var orb = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: 0 };
  var parts = [];                           // 尾迹粒子
  var lastMove = 0, running = false, raf = null;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function burst(x, y, n, power) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = (0.4 + Math.random() * 0.9) * power;
      parts.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 0.25,
        s: 1 + Math.random() * 2.2,
        life: 34 + Math.random() * 34,
        age: 0
      });
    }
  }

  function frame(now) {
    if (!running) return;
    // 弹性惯性追随（轻微过冲的“磁性”感）
    var k = 0.085;
    orb.vx = (orb.vx + (target.x - orb.x) * k) * 0.86;
    orb.vy = (orb.vy + (target.y - orb.y) * k) * 0.86;
    orb.x += orb.vx;
    orb.y += orb.vy;

    var speed = Math.hypot(orb.vx, orb.vy);
    var idle = now - lastMove > 2500;
    var targetA = (target.x < -50 || idle) ? 0 : Math.min(1, 0.25 + speed * 0.06);
    orb.a += (targetA - orb.a) * 0.08;

    // 移动时撒星尘尾迹
    if (!idle && speed > 1.6 && Math.random() < 0.85) {
      parts.push({
        x: orb.x + (Math.random() - 0.5) * 10,
        y: orb.y + (Math.random() - 0.5) * 10,
        vx: -orb.vx * 0.12 + (Math.random() - 0.5) * 0.6,
        vy: -orb.vy * 0.12 + (Math.random() - 0.5) * 0.6 - 0.18,
        s: 1.2 + Math.random() * 2.2,
        life: 40 + Math.random() * 40,
        age: 0
      });
    }

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    // 星尘
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.age++;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy = p.vy * 0.96 - 0.012;
      var fade = 1 - p.age / p.life;
      ctx.fillStyle = 'rgba(170, 195, 255,' + (fade * 0.7).toFixed(3) + ')';
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }

    // 光球本体：外晕 + 内核
    if (orb.a > 0.01) {
      var g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, 70 + speed * 1.6);
      g.addColorStop(0, 'rgba(150, 175, 255,' + (orb.a * 0.38).toFixed(3) + ')');
      g.addColorStop(0.45, 'rgba(130, 150, 255,' + (orb.a * 0.10).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(120, 140, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 70 + speed * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(235, 242, 255,' + (orb.a * 0.9).toFixed(3) + ')';
      ctx.fillRect(orb.x - 1.6, orb.y - 1.6, 3.2, 3.2);
    }
    ctx.globalCompositeOperation = 'source-over';

    raf = requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('pointermove', function (e) {
    target.x = e.clientX;
    target.y = e.clientY;
    lastMove = performance.now();
    if (orb.a < 0.05) orb.x = e.clientX, orb.y = e.clientY;   // 唤醒时不飞越
  }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    target.x = e.clientX;
    target.y = e.clientY;
    orb.x = e.clientX;
    orb.y = e.clientY;
    lastMove = performance.now();
    burst(e.clientX, e.clientY, 26, 2.4);   // 点击：星尘爆发
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  start();

  // 供调试/清理
  window.__mousefx = {
    burst: burst,
    cleanup: function () {
      stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', null);
      canvas.remove();
    }
  };
})();
