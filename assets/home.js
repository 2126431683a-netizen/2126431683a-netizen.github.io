(function () {
  'use strict';

  if (document.body) document.body.classList.remove('no-js');

  /* ============================================================
     主页动效（home.js · v3 —— 电影式序章）
     仿照 careers.kimi.com/about-us 的动效设计：一整屏、按时间线
     自动循环播放的生成式 ASCII 序章，三段：
       A 像素传送门（环形拱 + 月球 + 星点）
       B 多尺度 ASCII“流沙”荒原 —— 大字形与小点字符组成流动沙丘，
         中心挖出纯黑圆洞放文案
       C 字符雨落成城市地形剪影
     文案全部为本人的内容（陈黄勇 · 游戏产品）。
     点击「继续了解」或滚动 → 淡出序章，滚入作品星系。
     ============================================================ */

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var FONT = '"Fusion Pixel 12px Mono zh_hans", Menlo, Consolas, monospace';
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth01 = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  var GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    'рдщуэьъёякєч·.,:;月暗面星系河の'.split('');
  function randGlyph() { return GLYPHS[(Math.random() * GLYPHS.length) | 0]; }

  // ---------- 值噪声 + FBM（沙丘地形用） ----------
  function hash2(x, y) {
    var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y) {
    var v = 0, amp = 0.5, f = 1;
    for (var i = 0; i < 4; i++) {
      v += amp * vnoise(x * f, y * f);
      amp *= 0.5;
      f *= 2.05;
    }
    return v / 0.9375;
  }

  /* ==================== 序章画布 ==================== */
  var canvas = document.getElementById('cinema-canvas');
  var cinema = document.getElementById('cinema');
  if (!canvas || !cinema || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // 阶段时长（秒）
  var T_A0 = 0, T_A1 = 7000;     // A 传送门（毫秒）
  var T_B0 = 7200, T_B1 = 17000; // B 沙丘
  var T_C0 = 17200, T_C1 = 28000;// C 城市
  var CYCLE = 28600;          // 整轮时长（毫秒）

  var W = 0, H = 0;
  var running = false, raf = null, startT = 0, exitT = 0;

  // —— A：低分辨率像素画布（传送门） ——
  var low = document.createElement('canvas');
  var lctx = low.getContext('2d');
  var lw = 0, lh = 0, stars = [], floaters = [];

  // —— B：沙丘网格 ——
  var CELL = 15;
  var cols = 0, rows = 0, duneCells = [];

  // —— C：城市剪影 ——
  var CRC = 12;                 // 字符单元
  var cCols = 0, cRows = 0, cityMask = null, cityOrder = null, cityTotal = 0;
  var rainCols = [];
  var cityCanvas = document.createElement('canvas');
  var cityCtx = cityCanvas.getContext('2d');
  var fieldCanvas = document.createElement('canvas');
  var fieldCtx = fieldCanvas.getContext('2d');
  var fieldCells = [];
  var lastMutate = 0;

  var exited = false;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // A 低分辨率
    lw = Math.max(60, Math.round(W / 8));
    lh = Math.max(34, Math.round(H / 8));
    low.width = lw;
    low.height = lh;
    stars = [];
    for (var i = 0; i < lw * lh * 0.005; i++) {
      stars.push({ x: Math.random() * lw, y: Math.random() * lh, a: 0.3 + Math.random() * 0.7, tw: Math.random() * Math.PI * 2 });
    }
    floaters = [];
    for (var j = 0; j < 70; j++) {
      floaters.push({
        x: Math.random() * lw, y: Math.random() * lh, ch: randGlyph(),
        a: 0.12 + Math.random() * 0.3, tw: Math.random() * Math.PI * 2
      });
    }

    // B 沙丘网格
    cols = Math.max(12, Math.round(W / CELL));
    rows = Math.max(8, Math.round(H / CELL));
    duneCells = [];
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        duneCells.push({ x: x, y: y, ch: randGlyph(), seed: Math.random() * 100 });
      }
    }

    // C 城市
    cCols = Math.max(12, Math.round(W / CRC));
    cRows = Math.max(10, Math.round(H / CRC));
    buildCity();
    rainCols = [];
    for (var c2 = 0; c2 < cCols; c2++) {
      rainCols.push({ y: -(Math.random() * cRows), v: 1.2 + Math.random() * 2.6, ch: randGlyph() });
    }
  }

  function buildCity() {
    // 城市剪影：起伏天际线 + 几栋高楼 + 路面 —— 位图
    var m = document.createElement('canvas');
    m.width = cCols;
    m.height = cRows;
    var mc = m.getContext('2d');
    mc.fillStyle = '#000';
    mc.fillRect(0, 0, cCols, cRows);
    mc.fillStyle = '#fff';
    // 起伏地形（噪声天际线），占据底部约 1/4
    var base = cRows * 0.78;
    for (var x = 0; x < cCols; x++) {
      var h = base - fbm(x / 26 + 7.7, 3.3) * cRows * 0.15 - fbm(x / 9 + 20.1, 8.8) * cRows * 0.06;
      mc.fillRect(x, h, 1, cRows - h);
    }
    // 高楼（短一些，避免占满屏幕）
    var towers = [[0.06, 0.15], [0.18, 0.2], [0.3, 0.13], [0.5, 0.17], [0.62, 0.13], [0.78, 0.18], [0.88, 0.14]];
    for (var t = 0; t < towers.length; t++) {
      var tw = towers[t];
      var bx = Math.round(cCols * tw[0]);
      var th = Math.round(cRows * tw[1]);
      mc.fillRect(bx, cRows - th, Math.max(2, Math.round(cCols * 0.035)), th);
      if (t % 2 === 0) mc.fillRect(bx + 1, cRows - th - 2, 2, 2); // 天线
    }
    // 高架桥横线（呼应参考图的钢架）
    mc.fillRect(0, Math.round(cRows * 0.66), cCols, 2);

    var img = mc.getImageData(0, 0, cCols, cRows).data;
    cityMask = new Uint8Array(cCols * cRows);
    var list = [];
    for (var y = 0; y < cRows; y++) {
      for (var x2 = 0; x2 < cCols; x2++) {
        if (img[(y * cCols + x2) * 4 + 3] > 127) {
          cityMask[y * cCols + x2] = 1;
          list.push({ x: x2, y: y });
        }
      }
    }
    list.sort(function (a, b) { return b.y - a.y || a.x - b.x; }); // 自下而上成形：地面先起，楼再长高
    cityOrder = list;
    cityTotal = list.length;

    cityCanvas.width = Math.round(W * DPR);
    cityCanvas.height = Math.round(H * DPR);
    cityCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cityCtx.clearRect(0, 0, W, H);

    buildField();
  }

  // 预渲染的“字符场”：背景铺满小字符（噪声决定明暗），周期性微变
  function buildField() {
    fieldCanvas.width = Math.round(W * DPR);
    fieldCanvas.height = Math.round(H * DPR);
    fieldCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fieldCtx.clearRect(0, 0, W, H);
    fieldCells = [];
    for (var y = 0; y < cRows; y++) {
      for (var x = 0; x < cCols; x++) {
        fieldCells.push({ x: x, y: y, ch: randGlyph(), a: 0 });
      }
    }
    paintField();
  }

  function paintCell(fc) {
    var yN = fc.y / cRows;
    var vFade = 1 - yN * 0.82;                 // 城市区让位
    var n = fbm(fc.x / 9 + fc.y / 5, fc.y / 11 + 0.3) * (1 - yN * 0.5);
    var a = clamp((0.12 + 0.4 * n) * vFade, 0, 0.55);
    fc.a = a;
    fieldCtx.clearRect(fc.x * CRC, fc.y * CRC, CRC, CRC);
    if (a < 0.03) return;
    fieldCtx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
    fieldCtx.font = Math.round(CRC * 0.9) + 'px ' + FONT;
    fieldCtx.fillText(fc.ch, fc.x * CRC, fc.y * CRC + CRC);
  }

  function paintField() {
    for (var i = 0; i < fieldCells.length; i++) paintCell(fieldCells[i]);
  }

  function mutateField() {
    var n = 120 + ((Math.random() * 90) | 0);
    for (var i = 0; i < n; i++) {
      var fc = fieldCells[(Math.random() * fieldCells.length) | 0];
      if (Math.random() < 0.5) fc.ch = randGlyph();
      paintCell(fc);
    }
  }

  function fillCity(progress) {
    var target = Math.floor(smooth01(progress) * cityTotal);
    var i = 0;
    while (i < target) {
      var cell = cityOrder[i++];
      var alpha = 0.8 + Math.random() * 0.2;
      cityCtx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
      cityCtx.font = Math.round(CRC * 0.95) + 'px ' + FONT;
      cityCtx.fillText(randGlyph(), cell.x * CRC, cell.y * CRC + CRC);
    }
  }

  /* ---------- A：传送门 ---------- */
  function posterize() {
    var img = lctx.getImageData(0, 0, lw, lh);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var q = ((d[i] / 255) * 4) | 0;
      if (q > 3) q = 3;
      var v = q * 85;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    lctx.putImageData(img, 0, 0);
  }

  function drawPortal(t) {
    lctx.fillStyle = '#000';
    lctx.fillRect(0, 0, lw, lh);
    var cx = lw / 2, cy = lh * 0.52;
    var R = Math.min(lw, lh) * 0.31;

    var g = lctx.createRadialGradient(0, 0, 0, 0, 0, Math.hypot(lw, lh) * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,0.09)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    lctx.fillStyle = g;
    lctx.fillRect(0, 0, lw, lh);

    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      lctx.globalAlpha = st.a * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.001 + st.tw)));
      lctx.fillStyle = '#fff';
      lctx.fillRect(st.x, st.y, 1, 1);
    }
    lctx.globalAlpha = 1;

    var seg = 44;
    for (var k = 0; k < seg; k++) {
      var a0 = (k / seg) * Math.PI * 2;
      var a1 = a0 + (Math.PI * 2 / seg) + 0.02;
      var alpha = 0.22 + 0.5 * (0.5 + 0.5 * Math.sin(k * 2.7 + t * 0.014));
      lctx.strokeStyle = 'rgba(235,235,235,' + alpha.toFixed(3) + ')';
      lctx.lineWidth = Math.max(1, R * 0.10);
      lctx.beginPath();
      lctx.arc(cx, cy, R, a0, a1);
      lctx.stroke();
    }
    lctx.strokeStyle = 'rgba(255,255,255,0.10)';
    lctx.lineWidth = Math.max(1, R * 0.05);
    lctx.beginPath();
    lctx.arc(cx, cy, R * 1.24, 0, Math.PI * 2);
    lctx.stroke();

    var pg = lctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.08, cx, cy, R * 0.64);
    pg.addColorStop(0, 'rgba(195,195,195,1)');
    pg.addColorStop(0.55, 'rgba(94,94,94,1)');
    pg.addColorStop(1, 'rgba(16,16,16,1)');
    lctx.fillStyle = pg;
    lctx.beginPath();
    lctx.arc(cx, cy, R * 0.64, 0, Math.PI * 2);
    lctx.fill();

    var craters = [[-0.3, -0.22, 0.15], [0.24, -0.34, 0.1], [0.32, 0.2, 0.085], [-0.12, 0.32, 0.1], [0.02, -0.04, 0.05]];
    for (var c = 0; c < craters.length; c++) {
      var cr = craters[c];
      lctx.fillStyle = 'rgba(14,14,14,0.92)';
      lctx.beginPath();
      lctx.arc(cx + cr[0] * R, cy + cr[1] * R, Math.max(1.2, cr[2] * R), 0, Math.PI * 2);
      lctx.fill();
    }
    lctx.strokeStyle = 'rgba(205,205,205,0.5)';
    lctx.lineWidth = Math.max(1, R * 0.08);
    lctx.beginPath();
    lctx.arc(cx, cy, R, Math.PI * 0.16, Math.PI * 0.84);
    lctx.stroke();

    lctx.font = Math.max(6, Math.round(R * 0.13)) + 'px ' + FONT;
    for (var j = 0; j < floaters.length; j++) {
      var ch = floaters[j];
      lctx.fillStyle = 'rgba(255,255,255,' + (ch.a * (0.5 + 0.5 * Math.sin(t * 0.0016 + ch.tw))).toFixed(3) + ')';
      lctx.fillText(ch.ch, ch.x, ch.y);
    }
    lctx.globalAlpha = 1;
    posterize();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, W, H);
  }

  /* ---------- B：ASCII 流沙 ---------- */
  function drawDunes(t) {
    var cells = duneCells;
    ctx.textAlign = 'center';
    var half = CELL / 2;
    var wx = t * 0.00035, wy = t * 0.00022;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      var nx = c.x / cols + wx + c.seed * 0.001;
      var ny = c.y / rows + wy;
      // 域扭曲让“沙丘”蜿蜒流动
      var warp = fbm(nx * 2.6 + 9.2, ny * 2.6 + 4.4) * 1.2;
      var n = fbm(nx * 4.6 + warp * 0.8, ny * 4.6 - warp * 0.5);
      n = clamp((n - 0.34) * 1.5, 0, 1);   // 只留山脊，大部分保持暗
      if (n < 0.04) continue;
      var size = 7 + Math.pow(n, 2.4) * 190;
      var alpha = clamp(n * 0.72, 0, 0.92);
      ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
      ctx.font = Math.round(size) + 'px ' + FONT;
      ctx.fillText(c.ch, c.x * CELL + half, c.y * CELL + half + size * 0.42);
    }
    ctx.textAlign = 'start';
    // 中心圆洞（呼吸）
    var holeR = Math.min(W, H) * (0.27 + 0.015 * Math.sin(t * 0.0006));
    var hg = ctx.createRadialGradient(W / 2, H * 0.52, holeR * 0.62, W / 2, H * 0.52, holeR * 1.12);
    hg.addColorStop(0, 'rgba(0,0,0,1)');
    hg.addColorStop(0.82, 'rgba(0,0,0,1)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.52, holeR * 1.12, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------- C：字符雨城 ---------- */
  var cityFill = 0;
  function drawCityRain(t, progress) {
    // 1) 背景字符场（整屏铺满，噪声明暗，周期性微变）
    if (t - lastMutate > 170) {
      mutateField();
      lastMutate = t;
    }
    ctx.drawImage(fieldCanvas, 0, 0, W, H);
    // 2) 亮色雨头（上亮下淡，城市区让位）
    var fade = 0.9;
    ctx.font = Math.round(CRC * 0.95) + 'px ' + FONT;
    for (var c = 0; c < cCols; c++) {
      var r0 = rainCols[c];
      r0.y += r0.v;
      if (r0.y > cRows + 6) {
        r0.y = -(Math.random() * 12);
        if (Math.random() < 0.3) r0.ch = randGlyph();
      }
      var px = c * CRC;
      var py = r0.y * CRC;
      var yN = clamp(r0.y / cRows, 0, 1);
      var vFade = 1 - yN * 0.8;
      ctx.globalAlpha = 0.55 * fade * vFade;
      ctx.fillStyle = '#fff';
      ctx.fillText(r0.ch, px, py);
      for (var tr = 1; tr <= 3; tr++) {
        ctx.globalAlpha = (0.24 - tr * 0.06) * fade * vFade;
        ctx.fillText(r0.ch, px, py - tr * CRC);
      }
    }
    ctx.globalAlpha = 1;
    // 3) 成形城市层（最亮，压在最上）
    ctx.drawImage(cityCanvas, 0, 0, W, H);
    ctx.textAlign = 'start';
    // 城市边缘微光
    if (cityFill < cityTotal && progress > 0) {
      ctx.globalAlpha = 0.1 + 0.08 * Math.sin(t * 0.01);
      var e = cityOrder[Math.min(cityFill, cityTotal - 1)];
      ctx.fillStyle = '#fff';
      ctx.fillRect(e.x * CRC, e.y * CRC, CRC, 1);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- 主循环 ---------- */
  var lastPhaseA = -1, lastTt = -1;
  var lastFrameT = 0;
  function frame() {
    if (!running) return;
    var now = performance.now();           // 墙钟，任何环境都真实
    if (now - lastFrameT < 33) {           // ~30fps 帧门，兼顾流畅与省电
      raf = requestAnimationFrame(frame);
      return;
    }
    lastFrameT = now;
    var t = now - startT;
    var tt = t % CYCLE;
    if (tt < lastTt) {                // 循环回卷：清空城市层，重新成形
      cityFill = 0;
      cityCtx.clearRect(0, 0, W, H);
    }
    lastTt = tt;
    var alphaA = 1 - smooth01((tt - T_A1) / 1.4);            // A 淡出
    var alphaB = smooth01((tt - T_B0) / 1.4) * (1 - smooth01((tt - T_B1) / 1.4));
    var alphaC = smooth01((tt - T_C0) / 1.2);                // C 淡入并不淡出（保持至循环结束）

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // A
    if (alphaA > 0.01) {
      ctx.globalAlpha = alphaA;
      drawPortal(t);
      ctx.globalAlpha = 1;
    }
    // B
    if (alphaB > 0.01) {
      ctx.globalAlpha = alphaB;
      drawDunes(t);
      ctx.globalAlpha = 1;
    }
    // C（城市层渐进成形）
    if (alphaC > 0.01) {
      var cp = smooth01((tt - T_C0) / (T_C1 - T_C0));
      // 增量填充
      var targetFill = Math.floor(cp * cityTotal);
      while (cityFill < targetFill && cityFill < cityTotal) {
        var cell = cityOrder[cityFill++];
        cityCtx.fillStyle = 'rgba(255,255,255,' + (0.8 + Math.random() * 0.2).toFixed(3) + ')';
        cityCtx.font = Math.round(CRC * 0.95) + 'px ' + FONT;
        cityCtx.fillText(randGlyph(), cell.x * CRC, cell.y * CRC + CRC);
      }
      ctx.globalAlpha = alphaC;
      drawCityRain(t, cp);
      ctx.globalAlpha = 1;
    }

    // 阶段切换 → 更新 HTML 文案层
    var phase = tt < T_B0 ? 0 : (tt < T_C0 ? 1 : 2);
    if (phase !== lastPhaseA) {
      lastPhaseA = phase;
      cinema.setAttribute('data-phase', String(phase));
    }

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || !cinema) return;
    running = true;
    startT = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  /* ---------- 退出序章 ---------- */
  function exitIntro(goGalaxy) {
    if (exited) return;
    exited = true;
    stop();
    cinema.classList.add('is-out');
    document.body.classList.remove('no-scroll');
    if (goGalaxy) {
      var target = document.getElementById('scene-solar');
      if (target) setTimeout(function () {
        target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      }, reducedMotion ? 0 : 350);
    }
  }

  var hint = document.querySelector('.cinema-hint');
  if (hint) hint.addEventListener('click', function () { exitIntro(true); });
  window.addEventListener('wheel', function (e) {
    if (!exited && e.deltaY > 8) exitIntro(true);
  }, { passive: true });
  window.addEventListener('touchmove', function () { if (!exited) exitIntro(true); }, { passive: true });

  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();

  if (reducedMotion) {
    // 静态首帧：传送门 + A 文案
    startT = performance.now();
    cinema.setAttribute('data-phase', '0');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    drawPortal(0);
    var hintEl = document.querySelector('.cinema-hint');
    if (hintEl) hintEl.classList.add('is-ready');
  } else {
    start();
  }

  /* ==================== 头部折叠菜单（移动端） ==================== */
  var header = document.querySelector('.ph-header');
  var burger = document.querySelector('.ph-burger');
  if (header && burger) {
    burger.addEventListener('click', function () {
      header.classList.toggle('ph-open');
      burger.setAttribute('aria-expanded', String(header.classList.contains('ph-open')));
    });
    document.querySelectorAll('.ph-links a').forEach(function (a) {
      a.addEventListener('click', function () { header.classList.remove('ph-open'); });
    });
  }
})();
