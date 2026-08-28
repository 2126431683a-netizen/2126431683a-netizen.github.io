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
        ['moon', null, 'CHY.GALAXY'],
        ['slate', '2022', ''],
        ['castle', null, '放开那个女巫'],
        ['pad', null, '暮鸦之墓'],
        ['phone', null, 'HotPick Studio'],
        ['slate', 'WITCH', ''],
        ['rocket', null, '余烬之城'],
        ['dice', null, '三国文字塔防'],
        ['card', null, '雾港疑云'],
        ['slate', 'PLAYABLE', ''],
        ['ship', null, '星尘与作品']
      ];
      function buildOne(item) {
        var frame = document.createElement('div');
        frame.className = 'film-frame';
        frame.appendChild(sceneCanvas(item[0], item[1]));
        if (item[2]) {
          var cap = document.createElement('span');
          cap.className = 'film-caption';
          cap.textContent = item[2];
          frame.appendChild(cap);
        }
        return frame;
      }
      var half = document.createDocumentFragment();
      seq.forEach(function (item) { half.appendChild(buildOne(item)); });
      // 再复制一份，实现无缝循环
      var copy = document.createDocumentFragment();
      seq.forEach(function (item) { copy.appendChild(buildOne(item)); });
      track.appendChild(half);
      track.appendChild(copy);
    }

    buildFilm();

    // —— 荧光小月亮（呼应月球手册，Bayer 抖动 + 陨石坑） ——
    var om = document.getElementById('odyssey-moon');
    if (om) {
      var OMR = 48;
      om.width = OMR;
      om.height = OMR;
      var ox = om.getContext('2d');
      var oimg = ox.createImageData(OMR, OMR);
      var od = oimg.data;
      var ocx = OMR / 2, ocy = OMR / 2, orad = OMR * 0.46;
      var OB = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      var ocrat = [[0.28, 0.22, 0.16], [-0.3, 0.36, 0.13], [0.38, -0.28, 0.12], [-0.12, -0.1, 0.09], [0.12, 0.42, 0.08]];
      for (var oy2 = 0; oy2 < OMR; oy2++) {
        for (var ox2 = 0; ox2 < OMR; ox2++) {
          var odx = (ox2 - ocx) / orad, ody = (oy2 - ocy) / orad;
          var orr = odx * odx + ody * ody;
          var oi4 = (oy2 * OMR + ox2) * 4;
          if (orr > 1) { od[oi4 + 3] = 0; continue; }
          var on = 0.5 + 0.5 * Math.sin(ox2 * 0.9 + Math.sin(oy2 * 0.7) * 2.1);
          var ob = 0.55 + 0.42 * on;
          for (var oc = 0; oc < ocrat.length; oc++) {
            var cdx = odx - ocrat[oc][0], cdy = ody - ocrat[oc][1];
            if (cdx * cdx + cdy * cdy < ocrat[oc][2]) ob *= 0.3;
          }
          var obayer = OB[oy2 % 4][ox2 % 4] / 16;
          var olv = ob * 6;
          var ol = Math.floor(olv);
          var og = Math.round((ol + (olv - ol > obayer ? 1 : 0)) / 6 * 255);
          od[oi4] = od[oi4 + 1] = od[oi4 + 2] = og;
          od[oi4 + 3] = 255;
        }
      }
      ox.putImageData(oimg, 0, 0);
    }

    // —— 鼠标视差：胶片 / 文案 / 文字墙 按不同深度跟随 ——
    if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
      var pTarget = { x: 0, y: 0 }, pCur = { x: 0, y: 0 }, pRaf = null, pRun = false;
      var stripEl = document.querySelector('.film-strip');
      var copyEl = document.querySelector('.odyssey-copy');
      var fieldEl = document.getElementById('odyssey-textfield');
      window.addEventListener('pointermove', function (e) {
        pTarget.x = e.clientX / window.innerWidth - 0.5;
        pTarget.y = e.clientY / window.innerHeight - 0.5;
      }, { passive: true });
      function pFrame() {
        if (!pRun) return;
        pCur.x += (pTarget.x - pCur.x) * 0.07;
        pCur.y += (pTarget.y - pCur.y) * 0.07;
        if (stripEl) stripEl.style.transform = 'translate(' + (-pCur.x * 14).toFixed(1) + 'px,' + (-pCur.y * 9).toFixed(1) + 'px)';
        if (copyEl) copyEl.style.transform = 'translate(' + (pCur.x * 7).toFixed(1) + 'px,' + (pCur.y * 5).toFixed(1) + 'px)';
        if (fieldEl) fieldEl.style.transform = 'translate(' + (-pCur.x * 22).toFixed(1) + 'px,' + (-pCur.y * 14).toFixed(1) + 'px)';
        pRaf = requestAnimationFrame(pFrame);
      }
      pRun = true;
      pRaf = requestAnimationFrame(pFrame);
    }
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
      // 关键词文字墙：把“小字”换成与本人相关的内容
      var WORDS = [
        'CHY.GALAXY', '陈黄勇', '产品经理', '系统策划', '运营策划', '内容编导', '影视编导',
        'Godot 4', 'Unity', 'React', 'Electron', 'PRD', 'GDD', '数值表', '埋点',
        '放开那个女巫', '灰堡黎明', '暮鸦之墓', '雾港疑云', '三国文字合成塔防',
        'HotPick Studio', '余烬之城', 'Emberfall', '可运行 Demo', '试玩',
        '用户分层', '战斗循环', '养成曲线', '经济模型', '移动端适配', '数据验证',
        'B 站热搜', '内容工作流', 'MVP 边界', 'P0 / P1 / P2', '月亮手册', '点击月相'
      ];
      var stepY = 12;
      x.font = '9px ' + FONT;
      var row = 0;
      for (var yy = 10; yy < H; yy += stepY, row++) {
        var xx = 2 + (row % 2) * 24;
        var wIdx = (row * 7 + 3) % WORDS.length;
        while (xx < W) {
          var word = WORDS[(wIdx++ + ((row * 13) | 0)) % WORDS.length];
          var n = row * 0.7 + xx * 0.02;
          var base = 0.05 + 0.15 * (0.5 + 0.5 * Math.sin(n * 2.1));
          if (word === 'CHY.GALAXY' || word === '陈黄勇') base *= 1.9;   // 名字更亮
          x.fillStyle = 'rgba(255,255,255,' + clamp(base, 0.02, 0.36).toFixed(3) + ')';
          x.fillText(word, xx, yy);
          xx += x.measureText(word).width + 26;
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

  /* ==================== 2.5) 深空星系团 ==================== */
  var deepCanvas = document.getElementById('space-deep');
  if (deepCanvas && deepCanvas.getContext) {
    var dctx = deepCanvas.getContext('2d');
    var dlow = document.createElement('canvas');
    var dlctx = dlow.getContext('2d');
    var dW = 0, dH = 0, dlw = 0, dlh = 0;

    function drawDeep() {
      dlctx.fillStyle = '#000';
      dlctx.fillRect(0, 0, dlw, dlh);
      var cx = dlw / 2, cy = dlh / 2;
      var minR = Math.min(dlw, dlh) * 0.26;   // 中心留给主星系
      var count = 11;
      for (var i = 0; i < count; i++) {
        var x = 0, y = 0, tries = 0;
        do {
          x = Math.random() * dlw;
          y = Math.random() * dlh;
          tries++;
        } while (Math.hypot(x - cx, y - cy) < minR && tries < 30);
        var size = 2.5 + Math.random() * 8.5;
        var a = 0.18 + Math.random() * 0.3;
        dlctx.globalAlpha = a;
        var type = i % 3;
        if (type === 0) {
          // 旋涡星系：两条旋臂的点阵
          var arms = 2, n = 80;
          for (var k = 0; k < n; k++) {
            var t = k / n;
            var ang = t * 5.6 + (k % arms) * Math.PI;
            var d = t * size;
            var px = x + Math.cos(ang) * d;
            var py = y + Math.sin(ang) * d;
            dlctx.fillStyle = 'rgba(255,255,255,' + ((1 - t) * 0.75).toFixed(3) + ')';
            dlctx.fillRect(px, py, 1, 1);
            if (k % 3 === 0) dlctx.fillRect(px + 1, py + 1, 1, 1);
          }
          dlctx.fillStyle = '#fff';
          dlctx.fillRect(x - 1, y - 1, 2, 2);
        } else if (type === 1) {
          // 椭圆星团：层层光晕 + 亮核
          for (var l = 3; l >= 1; l--) {
            dlctx.fillStyle = 'rgba(255,255,255,' + (0.05 * (4 - l)).toFixed(3) + ')';
            dlctx.beginPath();
            dlctx.arc(x, y, size * l / 3, 0, 7);
            dlctx.fill();
          }
          dlctx.fillStyle = '#fff';
          dlctx.fillRect(x - 1, y - 1, 2, 2);
          dlctx.fillStyle = 'rgba(200,200,200,0.5)';
          dlctx.fillRect(x - 3, y, 1, 1);
          dlctx.fillRect(x + 2, y + 1, 1, 1);
        } else {
          // 不规则星团：高斯散点
          for (var g = 0; g < 26; g++) {
            var gx = x + (Math.random() - 0.5) * size * 2.2;
            var gy = y + (Math.random() - 0.5) * size * 1.6;
            var fall = Math.max(0, 1 - (Math.hypot(gx - x, gy - y) / (size * 1.4)));
            dlctx.fillStyle = 'rgba(255,255,255,' + (fall * 0.6).toFixed(3) + ')';
            dlctx.fillRect(gx, gy, 1, 1);
          }
        }
        dlctx.globalAlpha = 1;
      }
      // 几颗孤星
      for (var s2 = 0; s2 < 14; s2++) {
        dlctx.fillStyle = 'rgba(255,255,255,' + (0.25 + Math.random() * 0.5).toFixed(3) + ')';
        dlctx.fillRect(Math.random() * dlw, Math.random() * dlh, 1, 1);
      }
      dctx.imageSmoothingEnabled = false;
      dctx.fillStyle = '#000';
      dctx.fillRect(0, 0, dW, dH);
      dctx.drawImage(dlow, 0, 0, dW, dH);
    }

    function deepResize() {
      var rect = deepCanvas.getBoundingClientRect();
      dW = Math.max(1, rect.width);
      dH = Math.max(1, rect.height);
      deepCanvas.width = Math.round(dW * DPR);
      deepCanvas.height = Math.round(dH * DPR);
      dctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      dlw = Math.max(30, Math.round(dW / 6));   // 低分辨率 → 像素感
      dlh = Math.max(18, Math.round(dH / 6));
      dlow.width = dlw;
      dlow.height = dlh;
      drawDeep();
    }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(deepResize).observe(deepCanvas);
    else window.addEventListener('resize', deepResize);
    deepResize();
  }


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
    // 锚点补偿：按钮中心（=球心）对齐舞台中心，轨道才与虚线圆环重合
    document.querySelectorAll('[data-planet]').forEach(function (body) {
      var w = body.offsetWidth || 56;
      var h = body.offsetHeight || 56;
      body.style.setProperty('--ox', (w / 2) + 'px');
      body.style.setProperty('--oy', (h / 2) + 'px');
    });
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

  /* ==================== 3.5) 星系 · GSAP 动效编排 ==================== */
  if (solarStage && typeof gsap !== 'undefined' && !reducedMotion) {
    gsap.registerPlugin(MotionPathPlugin);
    var stage = solarStage;
    var moons = [].slice.call(document.querySelectorAll('.planet'));
    var cores = [].slice.call(document.querySelectorAll('.planet-core'));

    // 彗星光点（真实元素，沿轨道 MotionPath 流动）
    var comet = document.createElement('span');
    comet.className = 'orbit-comet';
    comet.setAttribute('aria-hidden', 'true');
    stage.appendChild(comet);
    stage.classList.add('has-gsap');

    // 入场编排：轨道浮现 → 月球逐颗弹出 → 标签/彗星跟进
    gsap.set(cores, { scale: 0, opacity: 0, transformOrigin: '50% 50%' });
    gsap.set('.planet-label, .planet-badge', { opacity: 0 });
    gsap.set('.orbit-2', { opacity: 0 });
    gsap.set(comet, { opacity: 0 });

    var entered = false;
    var gio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting || entered) return;
        entered = true;
        gio.disconnect();
        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.to('.orbit-2', { opacity: 1, duration: 1.5 })
          .to(cores, { scale: 1, opacity: 1, duration: 1.05, ease: 'back.out(1.9)', stagger: 0.12 }, '-=1.0')
          .to('.planet-label, .planet-badge', { opacity: 1, duration: 0.5, stagger: 0.06 }, '-=0.5')
          .to(comet, { opacity: 1, duration: 0.6, ease: 'power2.in' }, '-=0.3');

        // 彗星沿圆轨道匀速流动（缓入缓出循环）
        var R = 262;
        var cw = stage.offsetWidth / 2;
        var chh = stage.offsetHeight / 2;
        var pts = [];
        for (var i = 0; i <= 128; i++) {
          var a = (i / 128) * Math.PI * 2;
          pts.push({ x: cw + Math.cos(a) * R, y: chh + Math.sin(a) * R });
        }
        gsap.set(comet, { xPercent: -50, yPercent: -50 });
        gsap.timeline({ repeat: -1, delay: 2.4 }).to(comet, {
          motionPath: { path: pts, curviness: 0 },
          duration: 34,
          ease: 'sine.inOut'
        });
      });
    }, { threshold: 0.16 });
    gio.observe(stage);

    // 悬停磁吸 & 点击脉冲
    moons.forEach(function (p) {
      var core = p.querySelector('.planet-core');
      if (!core) return;
      p.addEventListener('pointerenter', function () {
        gsap.to(core, { scale: 1.16, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
      });
      p.addEventListener('pointerleave', function () {
        gsap.to(core, { scale: 1, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
      });
      p.addEventListener('click', function () {
        gsap.fromTo(core, { scale: 1 }, { scale: 1.3, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: 'auto' });
      });
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

  /* ============================================================
     SV —— 整屏场景切换（字符波面转场，仿 Kimi 招聘页）
     1) 场景状态机 { currentScene, targetScene, direction, progress }
     2) 场景 absolute 覆盖视口，clip-path/opacity/transform 交接
     3) 固定全屏 Canvas：字符网格沿双正弦波面成片揭示/隐藏
     4) 常驻背景乱码 Canvas（10px×20px 网格，5%/几十 ms 更新）
     5) wheel / touch / 键盘方向键 / 站内锚点按钮 全部接入
     ============================================================ */
  var SV = (function () {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 场景 ---------- */
    var sceneIds = ['scene-hero', 'odyssey', 'scene-solar', 'scene-contact'];
    var scenes = sceneIds.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (scenes.length < 2) return null;

    document.body.classList.add('scene-mode');
    scenes.forEach(function (el) { el.classList.add('sv-scene'); });

    /* ---------- 状态机 ---------- */
    var state = { currentScene: 0, targetScene: 0, direction: 0, progress: 0 };
    var animating = false;
    var t0 = 0, lastSettle = 0, wheelAccum = 0;
    var DUR = 1150;                 // 转场时长 ms

    function applyVisibility() {
      scenes.forEach(function (el, i) {
        var isCurrent = i === state.currentScene;
        var isIncoming = animating && i === state.targetScene;
        el.classList.toggle('sv-current', isCurrent);
        el.classList.toggle('sv-incoming', isIncoming);
        el.classList.toggle('sv-hidden', !isCurrent && !isIncoming);
        el.style.clipPath = '';
        el.style.transform = '';
        el.style.opacity = '';
      });
    }

    function finish() {
      state.currentScene = state.targetScene;
      state.progress = 1;
      animating = false;
      state.targetScene = state.currentScene;
      state.direction = 0;
      applyVisibility();
      waveHide();
      lastSettle = performance.now();
      wheelAccum = 0;
    }

    function beginTransition(target, dir) {
      if (animating || target === state.currentScene || target < 0 || target >= scenes.length) return false;
      if (performance.now() - lastSettle < 320) return false;   // 滚轮锁：刚落幕再等 320ms
      animating = true;
      state.targetScene = target;
      state.direction = dir;
      state.progress = 0;
      t0 = performance.now();
      applyVisibility();
      if (reduced) { finish(); return true; }
      waveShow();
      rafWave = requestAnimationFrame(waveFrame);
      return true;
    }

    function go(dir) { return beginTransition(state.currentScene + dir, dir); }
    function goTo(i) { return beginTransition(i, i > state.currentScene ? 1 : -1); }

    /* ---------- 字符波面 Canvas ---------- */
    var wave = document.getElementById('sv-wave');
    var wctx = wave && wave.getContext('2d');
    var CELL = 12;
    var CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*'.split('');
    var gw = 0, gh = 0, cells = [];
    var W = 0, H = 0, WD = 0, WDpr = 1;
    var rafWave = null;
    var easeInOutCubic = function (x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    };
    function smoothstep(a, b, x) {
      var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }
    var randChar = function () { return CHARSET[(Math.random() * CHARSET.length) | 0]; };

    function waveResize() {
      if (!wave || !wctx) return;
      WDpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      wave.width = Math.round(W * WDpr);
      wave.height = Math.round(H * WDpr);
      wctx.setTransform(WDpr, 0, 0, WDpr, 0, 0);
      gw = Math.ceil(W / CELL);
      gh = Math.ceil(H / CELL);
      cells = new Array(gw * gh);
      for (var i = 0; i < cells.length; i++) {
        cells[i] = {
          ch: randChar(),                       // 随机字符
          gray: 70 + ((Math.random() * 180) | 0), // 随机灰度颜色
          thr: Math.random(),                   // 随机阈值
          edge: Math.random() * 2 - 1           // 随机边缘偏移量
        };
      }
      wctx.imageSmoothingEnabled = false;
    }

    // 波面：两条正弦叠加，让边界不规则起伏
    function waveYAt(x, baseY, now) {
      var fx = x / Math.max(1, gw - 1);
      return baseY +
        26 * Math.sin(fx * Math.PI * 1.7 + now * 0.0016) +
        15 * Math.sin(fx * Math.PI * 3.4 - now * 0.0011);
    }

    function drawWave(now, p, e) {
      var baseY = e * H;                        // waveY = ease(progress) * canvasHeight
      wctx.clearRect(0, 0, W, H);
      // 只遍历波面附近的有限行（性能）
      var y0 = Math.max(0, Math.floor((baseY - 6 * CELL) / CELL));
      var y1 = Math.min(gh - 1, Math.ceil((baseY + 1.5 * CELL) / CELL));
      if (y0 > y1) return;
      wctx.font = Math.round(CELL * 0.92) + 'px "Fusion Pixel 12px Mono zh_hans", Menlo, Consolas, monospace';
      for (var y = y0; y <= y1; y++) {
        var rowBase = y * gw;
        for (var x = 0; x < gw; x++) {
          var c = cells[rowBase + x];
          var cellTop = y * CELL;
          var wx = waveYAt(x, baseY, now) + c.edge * 4.5;   // 波面(含每格随机偏移)
          var d = wx - cellTop;                              // 到达的字符 = 波面之上
          var presence = smoothstep(0, CELL * 2.6, d);       // 距波面越远越实
          var lead = 0;
          if (presence === 0) {
            // 波面下方一点点的前锋微光
            lead = (1 - smoothstep(-CELL * 1.6, 0, d)) * 0.22;
            if (lead < 0.04) continue;
          }
          // 时间 + 随机阈值 → 噪声开关
          var nv = 0.5 + 0.5 * Math.sin(now * 0.004 + c.thr * 6.283 + (x * 7.3 + y * 3.1));
          var gate = nv > c.thr * 0.62 ? 1 : 0.16;
          var alpha = ((c.gray / 255) * (presence * 0.9 + lead * gate) * gate);
          if (alpha < 0.02) continue;
          wctx.fillStyle = 'rgba(' + c.gray + ',' + c.gray + ',' + c.gray + ',' + alpha.toFixed(3) + ')';
          wctx.fillText(c.ch, x * CELL, y * CELL + CELL * 0.82);
          // 少量随机替换字符与颜色 → 闪烁 / 乱码刷新感
          if (Math.random() < 0.045 * presence) {
            c.ch = randChar();
            c.gray = 60 + ((Math.random() * 190) | 0);
          }
        }
      }
    }

    function waveFrame(now) {
      if (!animating) return;
      var p = Math.max(0, Math.min(1, (now - t0) / DUR));
      state.progress = p;
      var e = easeInOutCubic(p);
      var oldEl = scenes[state.currentScene];
      var newEl = scenes[state.targetScene];
      // 新旧场景交接：旧场景被波面从上往下裁掉
      var clipY = e * H;
      oldEl.style.clipPath = 'inset(' + clipY.toFixed(1) + 'px 0 0 0)';
      if (state.direction >= 0) {
        oldEl.style.transform = 'translateY(' + (-e * 4).toFixed(2) + '%)';
        newEl.style.opacity = (0.35 + 0.65 * e).toFixed(3);
        newEl.style.transform = 'translateY(' + ((1 - e) * 5).toFixed(2) + '%) scale(' + (1 + (1 - e) * 0.02).toFixed(4) + ')';
      } else {
        oldEl.style.transform = 'translateY(' + (e * 4).toFixed(2) + '%)';
        newEl.style.opacity = (0.35 + 0.65 * e).toFixed(3);
        newEl.style.transform = 'translateY(' + (-(1 - e) * 5).toFixed(2) + '%) scale(' + (1 + (1 - e) * 0.02).toFixed(4) + ')';
      }
      if (p > 0.02 && p < 0.98) drawWave(now, p, e);   // 接近 0/1 时不绘制字符
      if (p >= 1) { finish(); return; }
      rafWave = requestAnimationFrame(waveFrame);
    }

    function waveShow() {
      wave.style.display = 'block';
    }
    function waveHide() {
      wave.style.display = 'none';
      if (wctx) wctx.clearRect(0, 0, W, H);
    }

    /* ---------- 输入：wheel / 键盘 / touch / 站内锚点 ---------- */
    function onWheel(e) {
      e.preventDefault();
      wheelAccum += e.deltaY;
      if (Math.abs(wheelAccum) < 48) return;
      var dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      if (go(dir)) {
        // 触发后短暂锁住，防惯性连跳
        setTimeout(function () { wheelAccum = 0; }, 120);
      }
    }

    function onKey(e) {
      var k = e.key;
      if (k === 'ArrowDown' || k === 'PageDown' || k === ' ') { e.preventDefault(); go(1); }
      else if (k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); go(-1); }
      else if (k === 'Home') { e.preventDefault(); goTo(0); }
      else if (k === 'End') { e.preventDefault(); goTo(scenes.length - 1); }
    }

    var touchY = 0, touchT = 0, touchActive = false;
    function onTouchStart(e) {
      touchActive = true;
      touchY = e.touches[0].clientY;
      touchT = performance.now();
    }
    function onTouchMove(e) {
      if (!touchActive) return;
      // 面板/列表等可滚动区域：允许原生滚动，不拦截、不触发换场景
      var tgt = e.target;
      if (tgt && tgt.closest && tgt.closest('.moon-panel-body, .moon-panel, .moon-icons, .planet-panel')) return;
      e.preventDefault();
      var dy = touchY - e.touches[0].clientY;
      var dt = performance.now() - touchT;
      var fast = Math.abs(dy) > 36 && dt < 220;
      if (Math.abs(dy) > 64 || fast) {
        go(dy > 0 ? 1 : -1);
        touchY = e.touches[0].clientY;
      }
    }
    function onTouchEnd() { touchActive = false; }

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    // “滑动开启探索 / 继续了解”按钮与 # 锚点 → 切场景
    var anchorMap = {};
    scenes.forEach(function (el, i) { anchorMap[el.id] = i; });
    document.querySelectorAll('[data-goto]').forEach(function (btn) {
      var idx = anchorMap[btn.dataset.goto];
      if (idx === undefined) return;
      btn.addEventListener('click', function (e) { e.preventDefault(); goTo(idx); });
    });
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var idx = anchorMap[a.getAttribute('href').slice(1)];
      if (idx === undefined) return;
      a.addEventListener('click', function (e) { e.preventDefault(); goTo(idx); });
    });

    /* ---------- 生命周期 ---------- */
    window.addEventListener('resize', function () {
      waveResize();
    });

    waveResize();
    applyVisibility();

    /* 调试/清理 API */
    var api = {
      state: state,
      go: go,
      goTo: goTo,
      isAnimating: function () { return animating; },
      cleanup: function () {
        if (rafWave) cancelAnimationFrame(rafWave);
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      }
    };
    window.__sv = api;
    return api;
  })();


  /* ============================================================
     MOONX —— 月亮相位切换页（Neo-retro 像素太空）
     8 月相（新月→残月）内容联动；Bayer 有序抖动模拟灰度；
     像素化 canvas；点击/悬停预览/方向键；字符洗牌；黑白灰。
     ============================================================ */
  var MOONX = (function () {
    var page = document.querySelector('.moon-page');
    if (!page) return null;

    var B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

    /* ---------- 8 月相 = 8 个类目；右侧即该类目的完整内容（无跳转） ---------- */
    function shots(el) {
      var imgs = [].join.call(arguments, '');
      return '<span class="pb-shot-row">' + imgs + '</span>';
    }
    var PHASES = [
      {
        code: 'PHASE 0 · NEW MOON', name: '着陆', en: 'NEW MOON', page: '',
        title: '月球手册',
        line: '点下面的小月亮切换内容。八个阶段，八段东西，全在这一个页面里。',
        body: function () {
          return '<ul class="pb-list">' +
            '<li><strong>06</strong><span>个项目档案，截图和要点都在下面</span></li>' +
            '<li><strong>05</strong><span>个可运行 Demo，点了就能玩</span></li>' +
            '<li><strong>30%</strong><span>内容上过热搜，单条最高 300 万播放</span></li>' +
            '<li><strong>08</strong><span>个月相 = 8 段内容，没有第二层页面</span></li>' +
            '</ul>';
        }
      },
      {
        code: 'PHASE 1 · WAXING CRESCENT', name: '关于我', en: 'WAXING CRESCENT', page: 'about.html',
        title: '关于我',
        line: '我叫陈黄勇。学网络与新媒体，做产品和编导。',
        body: function () {
          return '<div class="pb-profile"><img class="pb-photo img-color" src="assets/portfolio/profile.png" alt="陈黄勇">' +
            '<div class="pb-profile-text"><p>2022 年入学，2026 年毕业。编导、运营、产品都做过，现在做产品和编导。</p>' +
            '<p class="pb-profile-note">简历在这里，完整介绍在下面。</p></div></div>' +
            '<ul class="pb-list">' +
            '<li class="pb-card"><img class="pb-thumb" src="assets/portfolio/content-workflow.png" alt="内容工作流"><div class="pb-card-body"><strong>内容编导</strong><span>AI 类目编导：三条内容赛道，选题、脚本、分镜、排期、复盘一条线。影视编导出身，内容三成进过 B 站热搜。</span></div></li>' +
            '</ul>' +
            '<div class="pb-actions"><a href="assets/陈黄勇_产品经理_系统策划_编导_简历.pdf" download>下载简历 PDF</a>' +
            '<a class="pb-ghost" href="mailto:2126431683@qq.com">邮件</a><a class="pb-ghost" href="tel:19279459077">电话</a></div>';
        }
      },
      {
        code: 'PHASE 2 · FIRST QUARTER', name: '项目', en: 'FIRST QUARTER', page: 'projects.html',
        title: '做过的项目',
        line: '六个项目，点开就能看：女巫、暮鸦、雾港、塔防、HotPick、余烬。',
        body: function () {
          var P = [
            { n: '放开那个女巫：灰堡黎明', href: 'project-witch.html', d: 'Godot 4 · 卡牌回合 RPG', img: ['assets/portfolio/witch-city.png', 'assets/portfolio/witch-battle.png'],
              b: ['3 AP 速度行动战斗：移动/攻击/技能共享行动点', '角色收集与养成，28 节点关卡', '移动端布局与真机验证'],
              l: [['PRD', 'assets/docs/release-the-witch-prd.pdf'], ['试玩 →', 'release-the-witch-game.html']] },
            { n: '暮鸦之墓', href: 'project-raven.html', d: 'Godot 4.3 · 开放世界 ARPG', img: ['assets/portfolio/mournraven-world.png', 'assets/portfolio/mournraven-dungeon.png'],
              b: ['主城 / 野外 / 副本三类区域', '战斗、AI 与装备成长闭环', '12 类 JSON 配置表，数值可热更'],
              l: [['GDD', 'assets/docs/mournraven-gdd.pdf']] },
            { n: '雾港疑云', href: 'project-fog.html', d: 'Web + Unity · 悬疑叙事', img: ['assets/portfolio/fog-harbor-top.png', 'assets/portfolio/fog-harbor-gameplay.png'],
              b: ['真相度与信任双变量决策', '信件收集与线索网', '三幕四结局分支'],
              l: [] },
            { n: '三国文字合成塔防', href: 'project-sango.html', d: 'React + TS · 策略塔防', img: ['assets/portfolio/sango.jpg', 'assets/portfolio/sango-gameplay.png'],
              b: ['8 条合成线', '双经济（金币/粮草）', '20 波战役节奏'],
              l: [] },
            { n: 'HotPick Studio', href: 'project-hotpick.html', d: 'React · Electron · AI 产品', img: ['assets/portfolio/hotpick.jpg', 'assets/portfolio/hotpick-flow.png'],
              b: ['五阶段工作台：选题→评分→转化→生产→复盘', '热点数据接入与信号打分', 'PRD 25 条编号需求'],
              l: [['PRD', 'assets/docs/hotpick-studio-prd.pdf']] },
            { n: '余烬之城 Emberfall', href: 'project-emberfall.html', d: 'Godot 4.7 · 生存城建 SLG', img: ['assets/portfolio/emberfall-city.png', 'assets/portfolio/emberfall-map.png'],
              b: ['熔炉供暖驱动生存压力', '资源调度与暴风雪事件', '可玩切片：完整闭环'],
              l: [['试玩 →', 'emberfall-game.html']] }
          ];
          return '<ul class="pb-list">' + P.map(function (p) {
            var links = p.l.length ? '<span class="pb-links">' + p.l.map(function (x) {
              return '<a href="' + x[1] + '" target="' + (x[1].indexOf('.pdf') >= 0 ? '_blank' : '_self') + '" rel="noopener">' + x[0] + '</a>';
            }).join('') + '</span>' : '';
            var imgs = p.img.map(function (s2) {
              return '<img class="pb-shot" src="' + s2 + '" alt="' + p.n + '">';
            }).join('');
            var bl = p.b.map(function (x) { return '<li>' + x + '</li>'; }).join('');
            return '<li class="pb-rich"><a class="pb-card-open" href="' + p.href + '" aria-label="' + p.n + '"></a><strong>' + p.n + '</strong><span class="pb-rich-tag">' + p.d + '</span>' +
              '<span class="pb-shot-row">' + imgs + '</span>' +
              '<ul class="pb-bullets">' + bl + '</ul>' + links + '</li>';
          }).join('') + '</ul>';
        }
      },
      {
        code: 'PHASE 3 · WAXING GIBBOUS', name: '技能', en: 'WAXING GIBBOUS', page: 'about.html',
        title: '我会什么',
        line: '会写需求文档，会做系统，会写脚本，也会剪片子。',
        body: function () {
          return '<ul class="pb-list">' +
            '<li><strong>产品判断</strong><span>用户分层与竞品、MVP 范围与优先级、数据指标与埋点。</span></li>' +
            '<li><strong>系统策划</strong><span>战斗与数值、养成与关卡循环、经济与产出消耗。</span></li>' +
            '<li><strong>技术落地</strong><span>Godot / Unity / React、JSON 配置与存档、移动端验证。</span></li>' +
            '<li><strong>内容编导</strong><span>选题、脚本、分镜、排期、复盘。</span></li>' +
            '</ul>' +
            '<p class="moon-mini-head">干活顺序</p>' +
            '<ul class="pb-list pb-steps">' +
            '<li><strong>01 定位与范围</strong><span>明确用户、乐趣、约束，先守住 MVP。</span></li>' +
            '<li><strong>02 系统与数值</strong><span>拆状态、输入输出与依赖，定成长基线。</span></li>' +
            '<li><strong>03 文档与配置</strong><span>PRD/GDD、流程、容错、配表，能直接执行。</span></li>' +
            '<li><strong>04 验证与迭代</strong><span>引擎里跑完整链路，P0/P1/P2 给验收线。</span></li>' +
            '</ul>';
        }
      },
      {
        code: 'PHASE 4 · FULL MOON', name: '运营', en: 'FULL MOON', page: 'operations.html',
        title: '运营那些事',
        line: '做过内容运营：三条 AI 赛道，30% 上过热搜。',
        body: function () {
          return '<div class="pb-stats"><div><strong>30%</strong><span>热搜命中率</span></div>' +
            '<div><strong>#02</strong><span>最高热搜榜</span></div>' +
            '<div><strong>300万</strong><span>单条最高播放</span></div></div>' +
            '<ul class="pb-list">' +
            '<li><strong>三条内容赛道</strong><span>AI 科普 · 工具实操 · AIGC 创作，栏目、脚本、分镜、排期一条线。</span></li>' +
            '<li><strong>HotPick Studio</strong><span>把选题、评分、转化、生产、复盘的重复判断做成五阶段工作台。</span>' +
            '<span class="pb-links"><a href="assets/docs/hotpick-studio-prd.pdf" target="_blank" rel="noopener">PRD</a></span></li>' +
            '</ul>';
        }
      },
      {
        code: 'PHASE 5 · WANING GIBBOUS', name: '游戏理解', en: 'WANING GIBBOUS', page: 'game-analysis.html',
        title: '我怎么看游戏',
        line: '玩游戏比较多，拆过七个类型，每类都写了看法。',
        body: function () {
          var G = [
            ['assets/games/sekiro.jpg', '动作', '《只狼》《黑神话：悟空》—— 精确输入与节奏化的攻防交换。'],
            ['assets/games/elden-ring.jpg', '开放世界', '《艾尔登法环》《巫师 3》—— 目的由玩家自己长出来的探索结构。'],
            ['assets/games/forza-horizon.jpg', '竞速', '《极限竞速：地平线》—— 手感与自由探索边界的平衡。'],
            ['assets/portfolio/fog-harbor-top.png', '叙事', '《雾港疑云》同源方法 —— 双变量驱动的分支叙事。'],
            ['assets/games/plants-vs-zombies.jpg', '休闲', '《植物大战僵尸》—— 单关卡的资源节奏与决策压力。'],
            ['assets/games/horizon-zero-dawn.jpg', 'FPS', '《地平线：零之曙光》—— 武器学习曲线与公平性。'],
            ['assets/games/whiteout-survival.jpg', '策略 / SLG', '《三国塔防》《白色荒野》—— 循环与压力的设计取舍。']
          ];
          return '<ul class="pb-list">' + G.map(function (g) {
            return '<li class="pb-rich"><img class="pb-shot" src="' + g[0] + '" alt="">' +
              '<strong>' + g[1] + '</strong><span>' + g[2] + '</span></li>';
          }).join('') + '</ul>';
        }
      },
      {
        code: 'PHASE 6 · LAST QUARTER', name: '经历', en: 'LAST QUARTER', page: 'about.html',
        title: '走到今天',
        line: '2022 年进大学，2026 年毕业。读的是网络与新媒体。',
        body: function () {
          return '<div class="pb-timeline">' +
            '<article><p>2026.06-</p><div><h3>西安纬度网络科技</h3><span>AI 类目编导：三条内容赛道 + 两款 Godot 游戏全流程策划。</span></div></article>' +
            '<article><p>2026.02-06</p><div><h3>Newegg 新蛋</h3><span>电商产品经理实习生：竞品调研、差异化方案与转化复盘。</span></div></article>' +
            '<article><p>2023.06-09</p><div><h3>闻泰科技 · 荣耀平板</h3><span>产品运营实习生：知识库建设，自助查询率 +40%，咨询量 -20%。</span></div></article>' +
            '<article><p>2022-2026</p><div><h3>西安欧亚学院</h3><span>网络与新媒体本科 · 影视编导方向，获陕西省大学生广播电视公益广告创意剧本奖。</span></div></article>' +
            '</div>';
        }
      },
      {
        code: 'PHASE 7 · WANING CRESCENT', name: '联系', en: 'WANING CRESCENT', page: 'about.html#contact',
        title: '找到我',
        line: '邮件、电话都行，想玩 Demo 也可以。',
        body: function () {
          return '<ul class="pb-list">' +
            '<li><strong>2126431683@qq.com</strong><span>邮件</span></li>' +
            '<li><strong>192 7945 9077</strong><span>电话</span></li></ul>' +
            '<div class="pb-actions"><a href="release-the-witch-game.html">放开那个女巫 · Play</a>' +
            '<a class="pb-ghost" href="emberfall-game.html">余烬之城 · Play</a></div>';
        }
      }
    ];

    /* ---------- 大月亮 canvas（低分辨率像素化 + Bayer 抖动） ---------- */
    var canvasEl = document.getElementById('moon-canvas');
    var stage = document.getElementById('moon-stage');
    var ctx = canvasEl.getContext('2d');
    var mx = document.createElement('canvas');
    var mctx = mx.getContext('2d');
    var RES = 112;                    // 低分辨率像素网格
    mx.width = mx.height = RES;
    var CUR = { from: 0, to: 0, shown: 0 };
    var preview = null, lastT = performance.now();
    var moonV = document.createElement('canvas');
    moonV.width = moonV.height = RES;

    function hash01(x, y) {
      var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return s - Math.floor(s);
    }
    function vnoise(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = hash01(xi, yi), b = hash01(xi + 1, yi), c = hash01(xi, yi + 1), d = hash01(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function fbm(x, y, o) {
      var v = 0, amp = 0.5, f = 1, n = 0;
      for (var i = 0; i < o; i++) { v += amp * vnoise(x * f, y * f); n += amp; amp *= 0.5; f *= 2.03; }
      return v / n;
    }

    // 渲染一个月相到 mx 画布：p = 0(新月) .. 0.5(满) .. 1(残月)
    function renderMoon(p, t) {
      var img = mctx.createImageData(RES, RES);
      var d = img.data;
      var c0 = RES / 2, R = RES * 0.44;
      var ph = (((p / 8) % 1) + 1) % 1;   // p=月相索引0..7 → 归一化相位
      var sx = Math.sin(ph * Math.PI * 2);
      var k = -Math.cos(ph * Math.PI * 2);        // 新月=-1 满月=+1
      var wob = t * 0.00022;
      for (var y = 0; y < RES; y++) {
        for (var x = 0; x < RES; x++) {
          var dx = (x - c0) / R, dy = (y - c0) / R;
          var r2 = dx * dx + dy * dy;
          var g = 0, a0 = 0;
          if (r2 <= 1) {
            var n = fbm(x / 14 + wob, y / 14 - wob, 4) * 0.62 + fbm(x / 5 + 3.7, y / 5 + 1.2, 3) * 0.38;
            var z = Math.sqrt(1 - r2);
            var litDot = dx * sx + z * k;
            var lit = litDot > 0;
            // 亮面提亮、暗面压暗，明暗分明（预览相位形态清晰）
            var b = lit ? (0.58 + 0.42 * n) : (0.04 + 0.07 * n);
            // 受光边缘亮轮廓：明暗交界描一圈白，像图标一样干脆
            if (lit && litDot < 0.10) b = Math.max(b, 0.93);
            // Bayer 有序抖动（4x4）量化到灰阶
            var bayer = B4[y % 4][x % 4] / 16;
            var lv = b * 8;                        // 8 级灰度
            var lo = Math.floor(lv);
            var q = lo + (lv - lo > bayer ? 1 : 0);
            g = Math.min(255, Math.round((q / 8) * 255));
            a0 = 255;
          }
          var i4 = (y * RES + x) * 4;
          d[i4] = d[i4 + 1] = d[i4 + 2] = g;
          d[i4 + 3] = a0;
        }
      }
      mctx.putImageData(img, 0, 0);
      // 黑幕（事件视界）：纯黑大圆衬底
      var vctx = moonV.getContext('2d');
      vctx.clearRect(0, 0, RES, RES);
      vctx.drawImage(mx, 0, 0);
    }

    function compose(t) {
      var w = canvasEl.width, h = canvasEl.height;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(moonV, 0, 0, w, h);
      // 像素星点（画布边角区域，闪烁）
      ctx.fillStyle = '#fff';
      for (var i = 0; i < 22; i++) {
        var sxx = hash01(i, 7.3), syy = hash01(i, 13.7);
        var sx = 16 + sxx * (w - 32), sy = 16 + syy * (h - 32);
        var rad = Math.hypot(sx - w / 2, sy - h / 2);
        if (rad < w * 0.52) continue;               // 避开月亮区域
        var tw = (Math.sin(t * 0.002 + i * 2.1) + 1) / 2;
        ctx.globalAlpha = 0.25 + 0.6 * tw;
        var sz = 2 + (i % 2);
        ctx.fillRect(Math.round(sx), Math.round(sy), sz, sz);
        ctx.globalAlpha = 1;
      }
    }

    /* ---------- 月相图标 ---------- */
    var iconsBox = document.getElementById('moon-icons');
    var iconEls = [];
    for (var i = 0; i < 8; i++) {
      (function (idx) {
        var btn = document.createElement('button');
        btn.className = 'moon-icon';
        btn.type = 'button';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-label', PHASES[idx].name + ' ' + PHASES[idx].en);
        var ic = document.createElement('canvas');
        ic.width = 24;
        ic.height = 24;
        btn.appendChild(ic);
        iconsBox.appendChild(btn);
        iconEls.push(btn);
        drawIcon(ic, idx / 8, false);
        btn.addEventListener('click', function () { goPhase(idx); });
        btn.addEventListener('pointerenter', function () { preview = idx; drawIcon(ic, idx / 8, true); });
        btn.addEventListener('pointerleave', function () { preview = null; });
      })(i);
    }

    function drawIcon(cv, p, hover) {
      var x = cv.getContext('2d');
      x.clearRect(0, 0, 24, 24);
      var sx = Math.sin(p * Math.PI * 2), k = -Math.cos(p * Math.PI * 2);
      for (var yy = 0; yy < 24; yy++) {
        for (var xx = 0; xx < 24; xx++) {
          var dx = (xx - 11.5) / 10, dy = (yy - 11.5) / 10;
          var r2 = dx * dx + dy * dy;
          if (r2 > 1) continue;
          var z = Math.sqrt(1 - r2);
          var lit = dx * sx + z * k > 0;
          var bayer = B4[yy % 4][xx % 4] / 16;
          var v = lit ? 0.92 : 0.10;
          var out = v + (bayer - 0.5) * 0.14;
          var g = Math.max(0, Math.min(255, Math.round(out * 255)));
          x.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
          x.fillRect(xx, yy, 1, 1);
        }
      }
    }

    /* ---------- 左侧说明 + 右侧类目内容面板 ---------- */
    var caption = document.getElementById('moon-caption');
    var nameEl = document.getElementById('moon-phase-name');
    var lineEl = document.getElementById('moon-phase-line');
    var hintEl = document.getElementById('moon-open-hint');
    var panel = document.getElementById('moon-panel');
    var codeEl = document.getElementById('moon-panel-code');
    var titleEl = document.getElementById('moon-panel-title');
    var leadEl = document.getElementById('moon-panel-lead');
    var bodyEl = document.getElementById('moon-panel-body');
    var current = -1;
    var captionTimer = null;

    function applyPhase(idx, animate) {
      var ph = PHASES[idx];
      current = idx;
      iconEls.forEach(function (b, i2) { b.classList.toggle('is-active', i2 === idx); });
      if (captionTimer) clearTimeout(captionTimer);
      var commit = function () {
        nameEl.textContent = ph.code;
        lineEl.textContent = ph.line;
        codeEl.textContent = ph.code;
        titleEl.textContent = ph.title;
        leadEl.textContent = ph.line;
        bodyEl.innerHTML = ph.body();
        if (hintEl) hintEl.style.opacity = ph.page ? '1' : '0.25';
      };
      if (animate) {
        caption.classList.add('is-switching');
        panel.classList.add('is-switching');
        captionTimer = setTimeout(function () {
          commit();
          caption.classList.remove('is-switching');
          panel.classList.remove('is-switching');
        }, 240);
      } else {
        commit();
      }
    }

    /* ---------- 点击大月亮 → 展开当前相位内容（不跳转） ---------- */
    canvasEl.addEventListener('click', function () {
      var ph = PHASES[current];
      if (ph && ph.page) window.location.href = ph.page;
    });
    canvasEl.classList.add('moon-clickable');

    /* ---------- 渐漫过渡（cubic-bezier(0.16,1,0.3,1)） ---------- */
    var prevT = performance.now();
    function loop(t) {
      var dt = Math.min(50, t - prevT);
      prevT = t;
      var target = preview !== null ? preview : current;
      if (current < 0) target = 0;
      CUR.from = CUR.shown;
      CUR.to = target;
      CUR.shown += (CUR.to - CUR.shown) * 0.16;
      if (Math.abs(CUR.to - CUR.shown) < 0.002) CUR.shown = CUR.to;
      renderMoon(CUR.shown, t);
      compose(t);
      requestAnimationFrame(loop);
    }

    /* ---------- 交互 ---------- */
    function goPhase(idx) {
      if (idx === current) return;
      applyPhase(idx, true);
    }
    window.addEventListener('keydown', function (e) {
      if (window.__sv && window.__sv.state.currentScene !== 2) return;
      if (e.key === 'ArrowRight') goPhase((current + 1) % 8);
      else if (e.key === 'ArrowLeft') goPhase((current + 7) % 8);
    });

    function resize() {
      var rect = stage.getBoundingClientRect();
      var DPR2 = Math.min(window.devicePixelRatio || 1, 1.5);
      canvasEl.width = Math.max(2, Math.round(rect.width * DPR2));
      canvasEl.height = Math.max(2, Math.round(rect.height * DPR2));
    }
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);
    resize();

    applyPhase(0, false);
    requestAnimationFrame(loop);
    window.__moonx = {
      goPhase: goPhase,
      phases: PHASES,
      dbg: function () {
        return { current: current, preview: preview, shown: +CUR.shown.toFixed(3), to: +CUR.to.toFixed(3) };
      }
    };
    return window.__moonx;
  })();

})();
