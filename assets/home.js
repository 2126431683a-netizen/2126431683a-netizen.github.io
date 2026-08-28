(function () {
  'use strict';

  /* ============================================================
     主页双特效（home.js · v2 像素风）
     1) Portal —— 首屏像素艺术传送门：低分辨率绘制 → 灰度量化 →
        放大成像素画；环形拱的“扫描”辉光 + 星球坑影 + 漂浮字符闪烁。
     2) ASCII Rain —— 探索场景：矩阵字符雨 + 滚动驱动的成形
        （剪影 = 星球 + 光环 + 地平线建筑），随滚动速率加速下落。
     全部 canvas 生成，尊重 prefers-reduced-motion，滚出视口即暂停。
     ============================================================ */

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var FONT = '"Fusion Pixel 12px Mono zh_hans", Menlo, Consolas, monospace';
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  var SPRITE = ('abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    'рдщэьъёяу·.,:;月暗面星系河の').split('');

  function randChar() {
    return SPRITE[(Math.random() * SPRITE.length) | 0];
  }

  /* ==================== 1) 像素传送门 ==================== */
  var portalCanvas = document.getElementById('portal-canvas');
  if (portalCanvas && portalCanvas.getContext) {
    var pctx = portalCanvas.getContext('2d');
    var low = document.createElement('canvas');
    var lctx = low.getContext('2d');
    var pW = 0, pH = 0, lw = 0, lh = 0;
    var stars = [], chars = [];
    var pRunning = false, pRaf = null, pT0 = 0;

    function pResize() {
      var rect = portalCanvas.getBoundingClientRect();
      pW = Math.max(1, rect.width);
      pH = Math.max(1, rect.height);
      portalCanvas.width = Math.round(pW * DPR);
      portalCanvas.height = Math.round(pH * DPR);
      pctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // 低分辨率画布：约 8px 一个“大像素”
      lw = Math.max(60, Math.round(pW / 8));
      lh = Math.max(34, Math.round(pH / 8));
      low.width = lw;
      low.height = lh;

      stars = [];
      var sn = Math.round(lw * lh * 0.006);
      for (var i = 0; i < sn; i++) {
        stars.push({ x: Math.random() * lw, y: Math.random() * lh, a: 0.3 + Math.random() * 0.7, tw: Math.random() * Math.PI * 2 });
      }
      chars = [];
      var cn = 80;
      for (var j = 0; j < cn; j++) {
        chars.push({
          x: Math.random() * lw, y: Math.random() * lh,
          ch: randChar(), a: 0.12 + Math.random() * 0.3,
          tw: Math.random() * Math.PI * 2, s: 0.6 + Math.random() * 1.2
        });
      }
    }

    // 灰度量化（4 级），制造像素画质感
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

      var cx = lw / 2, cy = lh * 0.48;
      var R = Math.min(lw, lh) * 0.30;

      // 角落微光云雾
      var g = lctx.createRadialGradient(0, 0, 0, 0, 0, Math.hypot(lw, lh) * 0.55);
      g.addColorStop(0, 'rgba(255,255,255,0.10)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      lctx.fillStyle = g;
      lctx.fillRect(0, 0, lw, lh);

      // 星点（闪烁）
      for (var s = 0; s < stars.length; s++) {
        var st = stars[s];
        lctx.globalAlpha = st.a * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.001 + st.tw)));
        lctx.fillStyle = '#fff';
        lctx.fillRect(st.x, st.y, 1, 1);
      }
      lctx.globalAlpha = 1;

      // 环形拱：分段的辉光“扫描”（动态抖动感）
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

      // 外圈淡环
      lctx.strokeStyle = 'rgba(255,255,255,0.10)';
      lctx.lineWidth = Math.max(1, R * 0.05);
      lctx.beginPath();
      lctx.arc(cx, cy, R * 1.24, 0, Math.PI * 2);
      lctx.stroke();

      // 星球本体
      var pg = lctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.08, cx, cy, R * 0.64);
      pg.addColorStop(0, 'rgba(195,195,195,1)');
      pg.addColorStop(0.55, 'rgba(94,94,94,1)');
      pg.addColorStop(1, 'rgba(16,16,16,1)');
      lctx.fillStyle = pg;
      lctx.beginPath();
      lctx.arc(cx, cy, R * 0.64, 0, Math.PI * 2);
      lctx.fill();

      // 陨石坑
      var craters = [[-0.3, -0.22, 0.15], [0.24, -0.34, 0.1], [0.32, 0.2, 0.085], [-0.12, 0.32, 0.1], [0.02, -0.04, 0.05]];
      for (var c = 0; c < craters.length; c++) {
        var cr = craters[c];
        lctx.fillStyle = 'rgba(14,14,14,0.92)';
        lctx.beginPath();
        lctx.arc(cx + cr[0] * R, cy + cr[1] * R, Math.max(1.2, cr[2] * R), 0, Math.PI * 2);
        lctx.fill();
      }

      // 环形拱前段（穿过星球下方）
      lctx.strokeStyle = 'rgba(205,205,205,0.5)';
      lctx.lineWidth = Math.max(1, R * 0.08);
      lctx.beginPath();
      lctx.arc(cx, cy, R, Math.PI * 0.16, Math.PI * 0.84);
      lctx.stroke();

      // 漂浮字符（闪烁）
      lctx.font = Math.max(6, Math.round(R * 0.13)) + 'px ' + FONT;
      for (var j = 0; j < chars.length; j++) {
        var ch = chars[j];
        lctx.fillStyle = 'rgba(255,255,255,' + (ch.a * (0.5 + 0.5 * Math.sin(t * 0.0016 + ch.tw))).toFixed(3) + ')';
        lctx.fillText(ch.ch, ch.x, ch.y);
      }
      lctx.globalAlpha = 1;

      posterize();

      pctx.imageSmoothingEnabled = false;
      pctx.fillStyle = '#000';
      pctx.fillRect(0, 0, pW, pH);
      pctx.drawImage(low, 0, 0, pW, pH);
    }

    function pFrame(now) {
      if (!pRunning) return;
      if (now - pT0 > 30) {           // ~30fps 足够颗粒感，省电
        drawPortal(now);
        pT0 = now;
      }
      pRaf = requestAnimationFrame(pFrame);
    }
    function pStart() { if (!pRunning) { pRunning = true; pRaf = requestAnimationFrame(pFrame); } }
    function pStop() { pRunning = false; if (pRaf) cancelAnimationFrame(pRaf); pRaf = null; }

    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(pResize).observe(portalCanvas);
    else window.addEventListener('resize', pResize);
    pResize();

    if (reducedMotion) {
      drawPortal(0);
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? pStart() : pStop(); });
      }, { threshold: 0.01 }).observe(portalCanvas);
    } else {
      pStart();
    }
  }

  /* ==================== 2) 滚动字符雨（探索阶段） ==================== */
  var rainCanvas = document.getElementById('rain-canvas');
  var exploreSection = document.getElementById('explore');
  if (rainCanvas && rainCanvas.getContext && exploreSection) {
    var rctx = rainCanvas.getContext('2d');
    var CELL = 12;
    var rW = 0, rH = 0, cols = 0, rows = 0;
    var mask = null, order = null, total = 0, nextFill = 0;
    var stuck = document.createElement('canvas');
    var sctx = stuck.getContext('2d');
    var rain = [];
    var rRunning = false, rRaf = null, lastY = 0, velBoost = 0, prevScrollY = window.scrollY;

    function buildMask() {
      // 剪影：星球 + 光环 + 地平线建筑 —— 画成 cols×rows 的位图
      var m = document.createElement('canvas');
      m.width = cols; m.height = rows;
      var mc = m.getContext('2d');
      mc.fillStyle = '#000';
      mc.fillRect(0, 0, cols, rows);
      mc.fillStyle = '#fff';

      var cx = cols * 0.5, cy = rows * 0.52, R = Math.min(cols, rows) * 0.26;
      mc.beginPath();
      mc.arc(cx, cy, R, 0, Math.PI * 2);
      mc.fill();
      // 光环（环形带）
      mc.beginPath();
      mc.arc(cx, cy, R * 1.32, 0, Math.PI * 2);
      mc.arc(cx, cy, R * 1.15, 0, Math.PI * 2, true);
      mc.fill();
      // 左下像素建筑群（呼应参考图的楼房剪影）
      mc.fillRect(cols * 0.04, rows * 0.8, cols * 0.11, rows * 0.2);
      mc.fillRect(cols * 0.17, rows * 0.87, cols * 0.08, rows * 0.13);
      mc.fillRect(cols * 0.27, rows * 0.905, cols * 0.06, rows * 0.095);
      // 地平线
      mc.fillRect(0, rows * 0.985, cols, 1.6);

      var img = mc.getImageData(0, 0, cols, rows).data;
      mask = new Uint8Array(cols * rows);
      var list = [];
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          if (img[(y * cols + x) * 4 + 3] > 127) {
            mask[y * cols + x] = 1;
            list.push({ x: x, y: y });
          }
        }
      }
      // 自上而下成形（随滚动“画出”剪影）
      list.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
      order = list;
      total = list.length;
      nextFill = 0;
    }

    function rResize() {
      var rect = rainCanvas.getBoundingClientRect();
      rW = Math.max(1, rect.width);
      rH = Math.max(1, rect.height);
      rainCanvas.width = Math.round(rW * DPR);
      rainCanvas.height = Math.round(rH * DPR);
      rctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      stuck.width = rainCanvas.width;
      stuck.height = rainCanvas.height;
      sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      sctx.clearRect(0, 0, rW, rH);

      cols = Math.max(10, Math.floor(rW / CELL));
      rows = Math.max(10, Math.floor(rH / CELL));
      buildMask();

      rain = [];
      for (var i = 0; i < cols; i++) {
        rain.push({ y: -(Math.random() * rows), v: 1.2 + Math.random() * 2.4, ch: randChar() });
      }
    }

    function fillUpTo(target) {
      while (nextFill < total && nextFill < target) {
        var cell = order[nextFill++];
        var alpha = 0.82 + Math.random() * 0.18;
        sctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
        sctx.font = Math.round(CELL * 1.0) + 'px ' + FONT;
        sctx.fillText(randChar(), cell.x * CELL, cell.y * CELL + CELL);
      }
    }

    function drawRain(t) {
      // 滚动进度 p：0（入场）→ 1（满屏）
      var rect = exploreSection.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = clamp((vh - rect.top) / rect.height, 0, 1);
      var target = Math.floor(Math.pow(p, 1.15) * total);
      fillUpTo(target);

      // 滚动加速
      var dY = Math.abs(window.scrollY - prevScrollY);
      prevScrollY = window.scrollY;
      velBoost += (clamp(dY / 26, 0, 3) - velBoost) * 0.2;

      rctx.fillStyle = '#000';
      rctx.fillRect(0, 0, rW, rH);

      // 背景字符雨：越靠近成形区越淡，让剪影成为视觉主体
      var fade = 0.35 + 0.45 * (1 - p);
      rctx.font = Math.round(CELL * 0.92) + 'px ' + FONT;
      for (var c = 0; c < cols; c++) {
        var r0 = rain[c];
        r0.y += r0.v * (1 + velBoost);
        if (r0.y > rows + 6) {
          r0.y = -(Math.random() * 12);
          if (Math.random() < 0.3) r0.ch = randChar();
        }
        var px = c * CELL + CELL * 0.5;
        var py = r0.y * CELL;
        var yN = clamp(r0.y / rows, 0, 1);
        var vFade = 1 - yN * 0.8;          // 底部（成形区）几乎无雨
        // 头部亮点 + 拖尾（同列同字符，矩阵质感更稳）
        rctx.globalAlpha = 0.3 * fade * vFade;
        rctx.fillStyle = '#fff';
        rctx.fillText(r0.ch, px - CELL * 0.5, py);
        for (var tr = 1; tr <= 3; tr++) {
          rctx.globalAlpha = (0.14 - tr * 0.035) * fade * vFade;
          rctx.fillText(r0.ch, px - CELL * 0.5, py - tr * CELL);
        }
      }
      rctx.globalAlpha = 1;

      // 成形层（已固定的字符，静态图直接贴回）
      rctx.drawImage(stuck, 0, 0, rW, rH);

      // 成形边缘轻微闪光
      if (nextFill < total && p > 0) {
        rctx.globalAlpha = 0.12 + 0.1 * Math.sin(t * 0.01);
        var edge = order[Math.min(nextFill, total - 1)];
        rctx.fillStyle = '#fff';
        rctx.fillRect(edge.x * CELL, edge.y * CELL, CELL, 1);
        rctx.globalAlpha = 1;
      }
    }

    function rFrame(now) {
      if (!rRunning) return;
      drawRain(now);
      rRaf = requestAnimationFrame(rFrame);
    }
    function rStart() { if (!rRunning) { rRunning = true; rRaf = requestAnimationFrame(rFrame); } }
    function rStop() { rRunning = false; if (rRaf) cancelAnimationFrame(rRaf); rRaf = null; }

    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(rResize).observe(rainCanvas);
    else window.addEventListener('resize', rResize);
    rResize();

    if (reducedMotion) {
      fillUpTo(Infinity);
      drawRain(0);
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? rStart() : rStop(); });
      }, { threshold: 0.01 }).observe(rainCanvas);
    } else {
      rStart();
    }
  }

  /* ==================== 3) 头部折叠菜单（移动端） ==================== */
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
