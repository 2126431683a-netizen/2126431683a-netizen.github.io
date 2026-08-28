(function () {
  'use strict';

  /* ============================================================
     主页（home.js · v4）
     1) Portal —— 首屏像素艺术传送门（恢复 v2 封面：环形拱 + 星球
        + 星点闪烁 + 漂浮字符）。
     2) Odyssey —— 作品胶片段：左侧电影胶带（齿孔 + 圆角画框，
        框内为程序生成的像素小场景：月球/城堡/手柄/手机/火箭/
        骰子/项目卡/场记板），持续循环上升滚动；背景是一整版
        “印刷字符”纹理。文案为本人内容（The CHY Odyssey）。
     3) 头部折叠菜单（移动端）。
     全部 canvas 生成；尊重 prefers-reduced-motion（胶带停止滚动，
     传送门只画一帧）；滚出视口即暂停。
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

  /* ==================== 1) 像素传送门（封面） ==================== */
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

      var g = lctx.createRadialGradient(0, 0, 0, 0, 0, Math.hypot(lw, lh) * 0.55);
      g.addColorStop(0, 'rgba(255,255,255,0.10)');
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
      if (now - pT0 > 30) {
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

  /* ==================== 2) 作品胶片（Odyssey） ==================== */
  var track = document.getElementById('film-track');
  var textfield = document.getElementById('odyssey-textfield');

  if (track) {
    // —— 像素画框：26×15 网格的小场景，放大成像素画 ——
    var C = { k: '#050505', d: '#181818', g: '#454545', l: '#b5b5b5', w: '#f2f2f2', a: '#d9d9d9', b: '#9a9a9a' };

    function sceneCanvas(kind, label) {
      var gw = 26, gh = 15;
      var cv = document.createElement('canvas');
      cv.width = gw;
      cv.height = gh;
      var x = cv.getContext('2d');
      function R(px, py, w, h, color) { x.fillStyle = color; x.fillRect(px, py, w, h); }
      function P(px, py, color) { R(px, py, 1, 1, color); }
      function dot(cx2, cy2, r, color) { x.fillStyle = color; x.beginPath(); x.arc(cx2, cy2, r, 0, 7); x.fill(); }

      if (kind === 'slate') {
        R(0, 0, gw, gh, C.d);
        x.fillStyle = C.w;
        x.font = '8px ' + FONT;
        x.textAlign = 'center';
        x.fillText(label, gw / 2, gh / 2 + 3);
        return cv;
      }

      R(0, 0, gw, gh, C.k);

      if (kind === 'moon') {
        dot(13, 8, 5.6, C.l);
        dot(10.5, 6.5, 1.4, C.g);
        dot(15, 9.5, 1.1, C.g);
        dot(12.5, 10.5, 0.8, C.g);
        x.strokeStyle = C.g;
        x.lineWidth = 1.4;
        x.beginPath();
        x.arc(13, 8, 8.2, 0, 7);
        x.stroke();
        P(2, 2, C.w); P(23, 3, C.w); P(24, 12, C.w);
      } else if (kind === 'castle') {
        R(0, 12, gw, 3, C.d);
        R(5, 5, 6, 7, C.g);
        R(4, 4, 8, 1, C.g);
        P(5, 3, C.l); P(7, 3, C.l); P(9, 3, C.l); P(11, 3, C.l);
        R(7, 8, 2, 4, C.k);
        P(6, 6, C.w); P(10, 6, C.w);
        R(17, 7, 5, 5, C.g);
        R(16, 6, 7, 1, C.g);
        P(17, 5, C.l); P(19, 5, C.l); P(21, 5, C.l);
        R(19, 9, 1, 3, C.k);
        dot(24, 2.5, 1.6, C.l);
      } else if (kind === 'pad') {
        R(3, 5, 20, 5, C.g);
        R(4, 4, 18, 7, C.g);
        dot(8, 7.5, 2.2, C.d); dot(8, 7.5, 0.9, C.a);
        dot(18, 7.5, 2.2, C.d); dot(18, 7.5, 0.9, C.a);
        R(12, 6, 2, 1, C.d); R(12, 8, 2, 1, C.d); R(11, 7, 2, 1, C.d); R(13, 7, 2, 1, C.d);
        R(2, 10, 3, 1, C.g); R(21, 10, 3, 1, C.g);
      } else if (kind === 'phone') {
        R(9, 2, 8, 11, C.g);
        R(10, 3, 6, 8, C.d);
        R(10, 3, 6, 1, C.w);
        R(11, 6, 4, 1, C.g); R(11, 8, 3, 1, C.g); R(11, 10, 2, 1, C.g);
        P(13, 12.6, C.l);
        P(4, 5, C.a); P(5, 6, C.a); P(4, 7, C.a);
      } else if (kind === 'rocket') {
        R(12, 2, 2, 1, C.l);
        R(11, 3, 4, 1, C.l);
        R(10, 4, 6, 9, C.g);
        dot(13, 8, 1.6, C.b); dot(12.6, 7.6, 0.6, C.w);
        R(8, 10, 2, 3, C.g); R(16, 10, 2, 3, C.g);
        R(12, 13, 2, 2, C.a);
        P(4, 4, C.w); P(22, 3, C.w); P(21, 12, C.w);
      } else if (kind === 'dice') {
        R(8, 3, 10, 9, C.l);
        P(10, 5, C.k); P(16, 5, C.k);
        P(13, 7, C.k); P(13.24, 7, C.k);
        P(10, 10, C.k); P(16, 10, C.k);
        R(8, 12, 2, 1, C.g); R(16, 12, 2, 1, C.g);
      } else if (kind === 'card') {
        R(6, 3, 14, 9, C.d);
        R(6, 3, 14, 1, C.l);
        P(7, 4, C.a);
        R(8, 6, 6, 1, C.w);
        R(8, 8, 9, 1, C.g);
        R(8, 10, 7, 1, C.g);
      } else if (kind === 'ship') {
        // 小火箭船（作品发射）
        R(11, 5, 4, 6, C.g);
        R(12, 3, 2, 2, C.l);
        R(9, 11, 2, 1, C.a); R(15, 11, 2, 1, C.a);
        dot(13, 8, 1.2, C.b);
        P(3, 8, C.w); P(23, 7, C.w); P(5, 3, C.w);
        P(20, 4, C.w); P(22, 10, C.w);
      }
      return cv;
    }

    function buildFilm() {
      var seq = [
        ['moon'], ['slate', '2022'], ['castle'], ['pad'], ['phone'],
        ['slate', 'P.01'], ['rocket'], ['dice'], ['card'], ['slate', 'DEMO'], ['ship']
      ];
      var half = document.createDocumentFragment();
      seq.forEach(function (item) {
        var frame = document.createElement('div');
        frame.className = 'film-frame';
        frame.appendChild(sceneCanvas(item[0], item[1]));
        half.appendChild(frame);
      });
      // 再复制一份，实现无缝循环
      var copy = document.createDocumentFragment();
      seq.forEach(function (item) {
        var frame = document.createElement('div');
        frame.className = 'film-frame';
        frame.appendChild(sceneCanvas(item[0], item[1]));
        copy.appendChild(frame);
      });
      track.appendChild(half);
      track.appendChild(copy);
    }

    buildFilm();
  }

  // —— 背景“印刷字符”纹理（只画一次，静态零开销） ——
  if (textfield && textfield.getContext) {
    function buildTextField() {
      var rect = textfield.getBoundingClientRect();
      var W = Math.max(1, rect.width);
      var H = Math.max(1, rect.height);
      textfield.width = Math.round(W * DPR);
      textfield.height = Math.round(H * DPR);
      var x = textfield.getContext('2d');
      x.setTransform(DPR, 0, 0, DPR, 0, 0);
      x.fillStyle = '#000';
      x.fillRect(0, 0, W, H);
      var stepX = 7.2, stepY = 12;
      x.font = '9px ' + FONT;
      for (var row = 0, yy = 10; yy < H; row++, yy += stepY) {
        for (var col = 0, xx = 2; xx < W; col++, xx += stepX) {
          var n = row * 0.7 + col * 0.13 + (row + col) * 0.031;
          var base = 0.05 + 0.16 * (0.5 + 0.5 * Math.sin(n * 2.1));
          var tw = (row * 31 + col * 17) % 23;
          if (tw === 0) base *= 1.8;                 // 偶尔更亮，像“关键词”
          x.fillStyle = 'rgba(255,255,255,' + clamp(base, 0.02, 0.4).toFixed(3) + ')';
          x.fillText(randChar(), xx, yy);
        }
      }
    }
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(buildTextField).observe(textfield);
    } else {
      window.addEventListener('resize', buildTextField);
    }
    buildTextField();
  }

  /* ==================== 3) 星系：流程轨道补充 ==================== */

  // —— 程序化“月面岩石”纹理（参考图那种坑洼月面，非光滑圆球） ——
  function hash01(x, y) {
    var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function vnoise2(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash01(xi, yi), b = hash01(xi + 1, yi), c = hash01(xi, yi + 1), d = hash01(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm2(x, y, oct) {
    var v = 0, amp = 0.5, f = 1, norm = 0;
    for (var i = 0; i < oct; i++) {
      v += amp * vnoise2(x * f, y * f);
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return v / norm;
  }

  function moonTexture(seed) {
    var S = 112;
    var cv = document.createElement('canvas');
    cv.width = cv.height = S;
    var x = cv.getContext('2d');
    // 凹凸 + 光照 + 噪声边缘 —— 逐像素生成
    var img = x.createImageData(S, S);
    var d = img.data;
    var cx = S / 2, cy = S / 2, R = S * 0.46;
    for (var py = 0; py < S; py++) {
      for (var px = 0; px < S; px++) {
        var dx = (px - cx) / R, dy = (py - cy) / R;
        var rr = Math.sqrt(dx * dx + dy * dy);
        var ang = Math.atan2(dy, dx);
        var edge = 0.9 + (fbm2(Math.cos(ang) * 1.7 + seed, Math.sin(ang) * 1.7 + seed * 1.7, 3) - 0.5) * 0.3;
        var i4 = (py * S + px) * 4;
        if (rr >= edge) {
          d[i4] = d[i4 + 1] = d[i4 + 2] = 0;
          d[i4 + 3] = 0;
          continue;
        }
        // 高频褶皱 + 中频山脊
        var v = fbm2(px / 24 + seed, py / 24 - seed * 0.63, 4) * 0.58 +
                fbm2(px / 8 + seed * 2.1, py / 8 + seed, 3) * 0.42;
        // 定向光照（左上亮 / 右下暗）+ 边缘亮环
        var lit = clamp(0.5 + 0.85 * (-(dx * 0.6 + dy * 0.72)), 0, 1.25);
        var g = v * 0.85 * lit;
        if (rr > edge - 0.1) g += 0.32 * lit;          // 受光侧边缘高光
        g = clamp(g, 0, 1);
        g = Math.round(g * 5.5) / 5.5;                  // 轻度量化，像素质感
        var c = Math.round(g * 255);
        d[i4] = c; d[i4 + 1] = c; d[i4 + 2] = c;
        d[i4 + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    // 环形山：暗底 + 受光侧亮边（像参考图的陨石坑）
    for (var k = 0; k < 14; k++) {
      var crx = cx + (Math.random() - 0.5) * R * 1.4;
      var cry = cy + (Math.random() - 0.5) * R * 1.3;
      var crr = 4 + Math.random() * 12;
      if (Math.sqrt((crx - cx) * (crx - cx) + (cry - cy) * (cry - cy)) > R * 0.72) continue;
      x.fillStyle = 'rgba(0,0,0,0.34)';
      x.beginPath();
      x.arc(crx, cry, crr, 0, 7);
      x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.55)';
      x.lineWidth = 1.7;
      x.beginPath();
      x.arc(crx, cry, crr, Math.PI * 1.05, Math.PI * 1.95);
      x.stroke();
    }
    return cv.toDataURL();
  }

  var solarStage = document.querySelector('[data-solar-stage]');
  if (solarStage) {
    var ORDER = ['projects', 'skills', 'ops', 'story', 'lens', 'link'];
    document.querySelectorAll('[data-planet]').forEach(function (body) {
      if (body.dataset.planet === 'sun') return;
      // 统一到虚线大轨道上（行内 --dist 优先于样式表，需 JS 覆盖）
      body.style.setProperty('--dist', '262px');
      // 编号角标 01-06
      var idx = ORDER.indexOf(body.dataset.planet);
      if (idx < 0) return;
      var badge = document.createElement('span');
      badge.className = 'planet-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = '0' + (idx + 1);
      body.appendChild(badge);
      // 月面岩石纹理（每个星球的皱褶和环形山不一样）
      var core = body.querySelector('.planet-core');
      if (core) {
        var url = moonTexture(idx * 7.31 + 2.17);
        core.style.background = 'none';
        core.style.backgroundImage = 'url(' + url + ')';
        core.style.backgroundSize = '100% 100%';
        core.style.backgroundRepeat = 'no-repeat';
      }
    });
  }

  /* ==================== 4) 头部折叠菜单（移动端） ==================== */
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
