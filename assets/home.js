(function () {
  'use strict';

  /* 主页专用特效：cinematic warp-field（光流漩涡）
     —— 仿照 Kimi about-us 的流光背景：近黑画布上，无数彩色光轨从暗心呈放射状涌出，
        像被黑洞吸走，缓慢整体旋转，带轻微闪烁。全 canvas 生成，原创、无外部视频，
        支持 prefers-reduced-motion（只画一帧静态）。 */

  var canvas = document.getElementById('warp-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 光轨色板：暖白 / 琥珀橙 / 紫 / 蓝 / 青 / 粉 —— 对齐参考视频的星尘光谱
  var PALETTE = [
    [255, 255, 255], // 暖白
    [255, 186, 120], // 琥珀橙
    [168, 128, 255], // 紫罗兰
    [108, 178, 255], // 天蓝
    [120, 226, 210], // 青
    [255, 150, 208]  // 粉
  ];

  var W = 0, H = 0, DPR = 1;
  var cx = 0, cy = 0, maxR = 0;
  var angleOffset = 0;
  var particles = [];
  var raf = null;
  var running = false;

  function pickColor() {
    var c = PALETTE[(Math.random() * PALETTE.length) | 0];
    return { r: c[0], g: c[1], b: c[2] };
  }

  function seed() {
    var count = Math.max(220, Math.round((W * H) / 5200));
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: maxR * (0.04 + Math.random() * 0.96),
        speed: 0.6 + Math.random() * 2.0,
        color: pickColor(),
        width: 0.6 + Math.random() * 1.9,
        alpha: 0.30 + Math.random() * 0.55,
        tw: Math.random() * Math.PI * 2
      });
    }
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2;
    cy = H / 2;
    maxR = Math.hypot(W, H) / 2;
    seed();
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // 缓慢的整体旋转，让光轨产生“被吸入”的漩涡感
    angleOffset += 0.00035;
    var rot = angleOffset;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      var streakLen = p.speed * 92;           // 光轨长度，正比于速度
      var prevR = p.radius - streakLen;
      p.radius += p.speed;

      // 飞出画布后从暗心重投，随机换一条光谱
      if (p.radius > maxR * 1.06) {
        p.radius = maxR * 0.055;
        p.angle = Math.random() * Math.PI * 2;
        if (Math.random() < 0.25) p.color = pickColor();
      }

      var a = p.angle + rot * 6;              // 全局旋转系数
      var cos = Math.cos(a);
      var sin = Math.sin(a);
      var x1 = cx + cos * Math.max(0, prevR);
      var y1 = cy + sin * Math.max(0, prevR);
      var x2 = cx + cos * p.radius;
      var y2 = cy + sin * p.radius;

      // 轻微闪烁
      var tAlpha = 0.62 + 0.38 * Math.sin(p.tw + t * 0.0011);

      ctx.lineCap = 'round';
      var c = p.color;

      // 外发光层
      ctx.globalAlpha = p.alpha * 0.16 * tAlpha;
      ctx.strokeStyle = 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
      ctx.lineWidth = p.width * 3.4;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // 内核光轨
      ctx.globalAlpha = p.alpha * tAlpha;
      ctx.lineWidth = p.width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // 事件视界：暗心由实心向外淡出的黑色遮罩，光轨在中心被“吞掉”
    var horizonR = Math.min(W, H) * 0.15;
    var fadeR = maxR * 0.44;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, fadeR);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(Math.min(1, horizonR / fadeR), 'rgba(0,0,0,0.9)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.32)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 中心一点冷光，强化“漩涡眼”
    var gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, horizonR * 0.6);
    gg.addColorStop(0, 'rgba(120,150,255,0.10)');
    gg.addColorStop(1, 'rgba(120,150,255,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, W, H);
  }

  function loop(t) {
    if (!running) return;
    draw(t);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  // 尺寸跟随容器（含滚动吸附、字体加载导致的布局变化）
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener('resize', resize);
  }

  resize();

  if (reducedMotion) {
    draw(0);                 // 只画一帧静态
  } else if ('IntersectionObserver' in window) {
    // 只在场景进入视口时渲染，滚走即暂停，省电
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) start();
        else stop();
      });
    }, { threshold: 0.01 }).observe(canvas);
  } else {
    start();
  }
})();
