'use strict';
/* ================================================================
   雾港疑云 · 第一幕：抵达
   泰拉瑞亚式像素美术 · 分层预烘焙渲染（高性能）
   方向键移动 / E 调查 / 可跳过剧情
   ================================================================ */

const VW = 480, VH = 270;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const $ = id => document.getElementById(id);
const el = {
  hud: $('hud'), objective: $('objective'), truth: $('stat-truth'), trust: $('stat-trust'),
  location: $('location'), prompt: $('prompt'), ctrl: $('controls-hint'),
  letters: $('stat-letters'),
  eTitle: $('end-title'), eTeaser: $('end-teaser'), eHint: $('end-hint'),
  dialog: $('dialog'), dSp: $('dlg-speaker'), dTx: $('dlg-text'), dCh: $('dlg-choices'), dHint: $('dlg-hint'),
  letter: $('letter'), lTx: $('letter-text'),
  intro: $('intro'), iTitle: $('intro-title'), iSub: $('intro-sub'), iTx: $('intro-text'), iSkip: $('intro-skip'),
  ending: $('ending'), eStats: $('end-stats'), fade: $('fade')
};

/* ---------------- 调色板（泰拉瑞亚式饱和撞色） ---------------- */
const P = {
  sky0: '#0a0e1e', sky1: '#12203a', sky2: '#1d3644',
  sea: '#0e2233', seaHi: '#2a5566',
  hill: '#0d1a26', hillFar: '#0a1420',
  sil: '#070d16', tree: '#0a1210',
  stone: '#33302b', stoneTop: '#4a463c', stoneDk: '#232019', moss: '#4a5a3a',
  wood: '#4a3826', woodHi: '#5f4a33', woodDk: '#2e2318',
  brick: '#3a3640', brickMortar: '#221f28',
  warm: '#e8a850', lantern: '#d84a3a',
  neon: '#e060a0', red: '#a83a3a',
  fog: '143,163,184', silver: '#a8b8c8'
};

/* ---------------- 工具 ---------------- */
function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function srand(seed) {
  let a = seed | 0;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------------- 泰拉瑞亚式素材画法 ---------------- */
// 瓦片地面：顶面高光 + 砖缝 + 噪点 + 苔藓
function tileGround(c, x0, y0, w, h, o) {
  const T = 8, r = srand(o.seed || 1);
  R(c, x0, y0, w, h, o.base);
  for (let ty = y0 + T; ty < y0 + h; ty += T) R(c, x0, ty, w, 1, 'rgba(0,0,0,.28)');
  for (let tx = x0 + T; tx < x0 + w; tx += T) R(c, tx, y0, 1, h, 'rgba(0,0,0,.14)');
  for (let ty = y0; ty < y0 + h; ty += T)
    for (let tx = x0; tx < x0 + w; tx += T) {
      const v = r();
      if (v < 0.28) R(c, tx + 1 + (r() * 5 | 0), ty + 1 + (r() * 5 | 0), 2, 2, o.dark);
      else if (v > 0.9) R(c, tx + 2, ty + 3, 2, 1, o.speck);
    }
  R(c, x0, y0, w, 2, o.top);
  if (o.moss) for (let tx = x0; tx < x0 + w; tx += T)
    if (r() < 0.45) R(c, tx + 1, y0 + 2, 3, 2, o.moss);
}
// 砖墙：错缝砖 + 砂浆线
function brickWall(c, x, y, w, h, base, mortar, seed) {
  R(c, x, y, w, h, base);
  const r = srand(seed || 7);
  let row = 0;
  for (let ty = y + 5; ty < y + h; ty += 6) R(c, x, ty, w, 1, mortar);
  for (let ty = y; ty < y + h - 2; ty += 6, row++)
    for (let tx = x + (row % 2 ? 7 : 0); tx < x + w; tx += 14) R(c, tx, ty, 1, 5, mortar);
  for (let i = 0; i < w * h / 200; i++)
    R(c, x + r() * w, y + r() * h, 3, 1, 'rgba(255,255,255,.05)');
}
// 阶梯远山
function hillSteps(c, x, yBase, w, steps, col) {
  for (let i = 0; i < steps; i++) {
    const hh = (i + 1) * 7;
    R(c, x + i * 7, yBase - hh, w - i * 14, hh, col);
  }
}
// 枯树
function deadTree(c, x, y, s, col) {
  R(c, x - 2 * s, y - 16 * s, 4 * s, 16 * s, col);
  R(c, x - 7 * s, y - 14 * s, 5 * s, 2 * s, col);
  R(c, x + 2 * s, y - 12 * s, 6 * s, 2 * s, col);
  R(c, x - 6 * s, y - 19 * s, 2 * s, 6 * s, col);
  R(c, x + 5 * s, y - 17 * s, 2 * s, 5 * s, col);
  R(c, x - 1 * s, y - 23 * s, 2 * s, 8 * s, col);
  R(c, x + 1 * s, y - 21 * s, 3 * s, 2 * s, col);
}
// 灯塔塔身（静态部分；光束另绘）
function lighthouseBody(c, x, y, s) {
  R(c, x - 5 * s, y - 24 * s, 10 * s, 34 * s, '#b8bcc2');       // 塔身白
  R(c, x - 5 * s, y - 24 * s, 10 * s, 3 * s, '#d8dce2');       // 顶部高光
  R(c, x - 5.5 * s, y - 16 * s, 11 * s, 5 * s, P.red);         // 红环
  R(c, x - 5.5 * s, y - 6 * s, 11 * s, 5 * s, P.red);
  R(c, x - 2 * s, y - 2 * s, 4 * s, 6 * s, '#1a2028');         // 小门
  R(c, x - 6 * s, y - 31 * s, 12 * s, 7 * s, '#26313e');       // 灯室
  R(c, x - 7 * s, y - 33 * s, 14 * s, 2 * s, '#1a2028');       // 灯室檐
  R(c, x - 1 * s, y - 36 * s, 2 * s, 3 * s, '#26313e');        // 避雷针
  R(c, x - 5 * s, y - 24 * s, 2 * s, 34 * s, 'rgba(0,0,0,.22)'); // 背光面
}

/* ---------------- 预渲染共享素材（全程只画一次） ---------------- */
function mkCanvas(w, h) { const cv = document.createElement('canvas'); cv.width = Math.ceil(w); cv.height = Math.ceil(h); return cv; }
// 光束
const beamCv = (() => {
  const cv = mkCanvas(200, 30), c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 200, 0);
  g.addColorStop(0, 'rgba(230,242,255,.30)'); g.addColorStop(1, 'rgba(230,242,255,0)');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(0, 15); c.lineTo(200, 0); c.lineTo(200, 30); c.closePath(); c.fill();
  return cv;
})();
// 灯光晕
const lampGlowCv = (() => {
  const cv = mkCanvas(24, 24), c = cv.getContext('2d');
  const g = c.createRadialGradient(12, 12, 0, 12, 12, 12);
  g.addColorStop(0, 'rgba(235,210,150,.5)'); g.addColorStop(1, 'rgba(235,210,150,0)');
  c.fillStyle = g; c.fillRect(0, 0, 24, 24);
  return cv;
})();
// 路灯光锥
const coneCv = (() => {
  const cv = mkCanvas(48, 110), c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 110);
  g.addColorStop(0, 'rgba(216,190,130,.18)'); g.addColorStop(1, 'rgba(216,190,130,0)');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(20, 0); c.lineTo(28, 0); c.lineTo(48, 110); c.lineTo(0, 110); c.closePath(); c.fill();
  return cv;
})();
// 雾团 ×3
function mkPuff(rx, ry, a) {
  const cv = mkCanvas(rx * 2, ry * 2), c = cv.getContext('2d');
  const g = c.createRadialGradient(rx, ry, 0, rx, ry, rx);
  g.addColorStop(0, `rgba(${P.fog},${a})`); g.addColorStop(1, `rgba(${P.fog},0)`);
  c.fillStyle = g;
  c.save(); c.translate(rx, ry); c.scale(1, ry / rx); c.translate(-rx, -ry);
  c.beginPath(); c.arc(rx, ry, rx, 0, Math.PI * 2); c.fill(); c.restore();
  return cv;
}
const puffCv = [mkPuff(110, 30, .12), mkPuff(170, 40, .08), mkPuff(80, 24, .14)];
// 贴地雾带
const fogStripCv = (() => {
  const cv = mkCanvas(VW, 90), c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 90);
  g.addColorStop(0, 'rgba(70,88,106,0)'); g.addColorStop(1, 'rgba(70,88,106,.30)');
  c.fillStyle = g; c.fillRect(0, 0, VW, 90);
  return cv;
})();
// 块状云（泰拉瑞亚式）
const cloudCv = (() => {
  const cv = mkCanvas(150, 42), c = cv.getContext('2d');
  R(c, 20, 18, 110, 14, '#101a2c');
  R(c, 38, 10, 74, 10, '#142034');
  R(c, 56, 4, 40, 7, '#18263c');
  R(c, 24, 18, 104, 3, '#0b1322');
  return cv;
})();
// 角色阴影
const shadowCv = (() => {
  const cv = mkCanvas(26, 10), c = cv.getContext('2d');
  c.fillStyle = 'rgba(0,0,0,.4)';
  c.beginPath(); c.ellipse(13, 5, 12, 4, 0, 0, Math.PI * 2); c.fill();
  return cv;
})();

/* ---------------- 输入 ---------------- */
const keys = {};
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (!e.repeat) { keys[e.code] = true; onKey(e.code); }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function onKey(code) {
  initAudio();
  if (code === 'KeyM') { toggleMute(); return; }
  switch (G.mode) {
    case 'intro':
      if (code === 'Escape') startGame();
      else if (code === 'Space' || code === 'Enter' || code === 'KeyE') advanceIntro();
      break;
    case 'play':
      if (code === 'KeyE' || code === 'Space' || code === 'Enter') tryInteract();
      break;
    case 'dialog':
      if (performance.now() - DLG.openedAt < 180) break;
      if (DLG.choices) {
        if (code === 'ArrowUp' || code === 'KeyW') moveChoice(-1);
        else if (code === 'ArrowDown' || code === 'KeyS') moveChoice(1);
        else if (code === 'Space' || code === 'Enter' || code === 'KeyE') pickChoice();
      } else if (code === 'Space' || code === 'Enter' || code === 'KeyE') advanceDialog();
      break;
    case 'letter':
      if (performance.now() - letterAt < 300) break;
      if (code === 'Space' || code === 'Enter' || code === 'KeyE' || code === 'Escape') closeLetter();
      break;
    case 'end':
      if (code === 'KeyR') location.reload();
      else if ((code === 'Space' || code === 'Enter' || code === 'KeyE')) {
        if (G.endKind === 1) startAct2();
        else if (G.endKind === 2) startAct3();
      }
      break;
  }
}

/* ---------------- 环境音 ---------------- */
let AC = null, rainGain = null, muted = false;
function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const len = AC.sampleRate * 2;
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 750;
    const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
    rainGain = AC.createGain(); rainGain.gain.value = 0.035;
    src.connect(lp); lp.connect(hp); hp.connect(rainGain); rainGain.connect(AC.destination);
    src.start();
  } catch (err) { AC = null; }
}
function toggleMute() { muted = !muted; if (rainGain) rainGain.gain.value = muted ? 0 : 0.035; }
function hum() {
  if (!AC || muted) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.value = 52;
  g.gain.setValueAtTime(0, AC.currentTime);
  g.gain.linearRampToValueAtTime(0.14, AC.currentTime + 0.4);
  g.gain.linearRampToValueAtTime(0, AC.currentTime + 2.8);
  o.connect(g); g.connect(AC.destination);
  o.start(); o.stop(AC.currentTime + 3);
}

/* ---------------- 像素精灵（自动描边，泰拉瑞亚式轮廓） ---------------- */
const SPR = {
  down0: [
    "............",
    "...HHHHHH...",
    "..HHHHHHHH..",
    "..HSSSSSSH..",
    "..SESSSSES..",
    "..SSSSSSSS..",
    "...SSSSSS...",
    "..CCCCCCCC..",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    "..CCCCCCCC..",
    "..PPPPPPPP..",
    "..PPP..PPP..",
    "..PPP..PPP..",
    "..BBB..BBB.."
  ],
  down1: [
    "............",
    "...HHHHHH...",
    "..HHHHHHHH..",
    "..HSSSSSSH..",
    "..SESSSSES..",
    "..SSSSSSSS..",
    "...SSSSSS...",
    "..CCCCCCCC..",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    "..CCCCCCCC..",
    "..PPPPPPPP..",
    ".PPPP..PPP..",
    ".PPP....PPP.",
    ".BBB....BBB."
  ],
  up0: [
    "............",
    "...HHHHHH...",
    "..HHHHHHHH..",
    "..HHHHHHHH..",
    "..HHHHHHHH..",
    "..HHHHHHHH..",
    "...HHHHHH...",
    "..CCCCCCCC..",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    "..CCCCCCCC..",
    "..PPPPPPPP..",
    "..PPP..PPP..",
    "..PPP..PPP..",
    "..BBB..BBB.."
  ],
  up1: [
    "............",
    "...HHHHHH...",
    "..HHHHHHHH..",
    "..HHHHHHHH..",
    "..HHHHHHHH..",
    "..HHHHHHHH..",
    "...HHHHHH...",
    "..CCCCCCCC..",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    "..CCCCCCCC..",
    "..PPPPPPPP..",
    ".PPPP..PPP..",
    ".PPP....PPP.",
    ".BBB....BBB."
  ],
  side0: [
    "............",
    "....HHHHH...",
    "...HHHHHHH..",
    "..SSHHHHHH..",
    "..ESHHHHHH..",
    "..SSHHHHHH..",
    "...SHHHHHH..",
    "..CCCCCCCC..",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    "..CCCCCCCC..",
    "..PPPPPPPP..",
    "..PPP..PPP..",
    "..PPP..PPP..",
    "..BBB..BBB.."
  ],
  side1: [
    "............",
    "....HHHHH...",
    "...HHHHHHH..",
    "..SSHHHHHH..",
    "..ESHHHHHH..",
    "..SSHHHHHH..",
    "...SHHHHHH..",
    "..CCCCCCCC..",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    ".CCCCCCCCCC.",
    "..CCCCCCCC..",
    "..PPPPPPPP..",
    ".PPPP..PPP..",
    ".PPP....PPP.",
    ".BBB....BBB."
  ]
};
SPR.zhou = SPR.down0.map((r, i) =>
  (i >= 8 && i <= 10) ? ".CCAAAAACC.." : (i === 11 ? "..CAAAAAAC.." : r));
SPR.wu = SPR.down0.map((r, i) => {
  if (i === 5) return "..SWWWWWWS..";
  if (i === 6) return "...WWWWWW...";
  return r;
});

// 自动描边：与实体像素相邻的透明像素 → 轮廓像素
function makeOutline(map) {
  const H = map.length, W = map[0].length, out = [];
  for (let r = 0; r < H; r++) {
    let row = '';
    for (let c = 0; c < W; c++) {
      if (map[r][c] !== '.') { row += '.'; continue; }
      let adj = false;
      for (let dr = -1; dr <= 1 && !adj; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < H && cc >= 0 && cc < W && map[rr][cc] !== '.') { adj = true; break; }
        }
      row += adj ? 'O' : '.';
    }
    out.push(row);
  }
  return out;
}
const SPR_OL = {};
for (const k in SPR) SPR_OL[k] = makeOutline(SPR[k]);

// 泰拉瑞亚式更鲜亮配色 + 描边色 O
const PAL = {
  yan:  { O: '#0b0d12', H: '#241a12', S: '#e0b080', E: '#101418', C: '#4a6a8a', P: '#2e3c50', B: '#161c26' },
  zhou: { O: '#0b0d12', H: '#54443a', S: '#e0b080', E: '#181410', C: '#7a5240', A: '#d8c8a8', P: '#3a3028', B: '#181410' },
  wu:   { O: '#0b0d12', H: '#8a867c', S: '#d0a070', E: '#14100c', C: '#4a4a42', P: '#2c2a24', B: '#12100c', W: '#d8d2c4' }
};

function drawSpr(c, map, ol, pal, x, y, s, flip) {
  const cols = 12, rows = 16;
  const ox = x - cols * s / 2, oy = y - rows * s;
  for (let pass = 0; pass < 2; pass++) {
    const m = pass === 0 ? ol : map;
    for (let r = 0; r < rows; r++) {
      const row = m[r];
      for (let i = 0; i < cols; i++) {
        const ch = row[flip ? cols - 1 - i : i];
        if (ch === '.') continue;
        c.fillStyle = pass === 0 ? pal.O : (pal[ch] || '#f0f');
        c.fillRect(Math.round(ox + i * s), Math.round(oy + r * s), Math.ceil(s), Math.ceil(s));
      }
    }
  }
}

/* ---------------- 雨与雾 ---------------- */
const RAIN = [];
for (let i = 0; i < 70; i++) RAIN.push({ x: rnd(0, VW), y: rnd(0, VH), v: rnd(190, 280), l: rnd(5, 10) });
function updRain(dt) {
  for (const d of RAIN) {
    d.y += d.v * dt; d.x -= d.v * 0.12 * dt;
    if (d.y > VH) { d.y = -10; d.x = rnd(-20, VW + 40); }
  }
}
function drawRain(c, heavy) {
  c.strokeStyle = 'rgba(165,190,210,.32)'; c.lineWidth = 1; c.beginPath();
  const n = heavy ? RAIN.length : RAIN.length * 0.65 | 0;
  for (let i = 0; i < n; i++) {
    const d = RAIN[i];
    c.moveTo(d.x, d.y); c.lineTo(d.x + d.l * 0.14, d.y - d.l);
  }
  c.stroke();
}
const FOGS = [];
for (let i = 0; i < 6; i++) FOGS.push({ x: rnd(-150, VW), y: rnd(50, VH - 20), sp: rnd(5, 15), img: i % 3 });
function updFog(dt) {
  for (const f of FOGS) {
    f.x += f.sp * dt;
    const w = puffCv[f.img].width;
    if (f.x - w > VW) f.x = -w;
  }
}
function drawFog(c, dense) {
  for (const f of FOGS) {
    const img = puffCv[f.img];
    if (dense) { c.globalAlpha = 1; } else { c.globalAlpha = 0.65; }
    c.drawImage(img, Math.round(f.x), Math.round(f.y));
  }
  c.globalAlpha = dense ? 1 : 0.7;
  c.drawImage(fogStripCv, 0, VH - 90);
  c.globalAlpha = 1;
}

/* ---------------- 动态光束/灯（每帧仅贴图） ---------------- */
function drawBeam(c, x, y, t, s, len) {
  const a = t * 0.42;
  c.save(); c.translate(x, y);
  for (const off of [0, Math.PI]) {
    c.save(); c.rotate(a + off); c.scale(len / 200, s);
    c.drawImage(beamCv, 0, -15);
    c.restore();
  }
  c.restore();
  // 灯室脉冲
  const fl = 0.5 + 0.5 * Math.max(0, Math.sin(t * 0.9));
  c.globalAlpha = 0.35 * fl;
  c.drawImage(lampGlowCv, x - 12 * s, y - 12 * s, 24 * s, 24 * s);
  c.globalAlpha = 1;
}

/* ---------------- 游戏全局状态 ---------------- */
const G = {
  mode: 'intro',
  scene: null, cam: 0, t: 0,
  truth: 0, trust: 20,
  flags: {}, visited: {},
  near: null, act: 1, endKind: 0
};
function flag(k) { return !!G.flags[k]; }
function setFlag(k) { G.flags[k] = true; }
function modTruth(n) { G.truth = clamp(G.truth + n, 0, 100); el.truth.textContent = '真相度 ' + G.truth; }
function modTrust(n) { G.trust = clamp(G.trust + n, 0, 100); el.trust.textContent = '镇民信任 ' + G.trust; }
function setObj(t) { el.objective.innerHTML = t.replace(/\n/g, '<br>'); }

const player = { x: 64, y: 230, dir: 'down', moving: false, ft: 0 };

/* ---------------- 对话系统 ---------------- */
const DLG = { q: [], idx: 0, ci: 0, typing: false, done: null, choices: null, sel: 0, openedAt: 0 };

function say(lines, done) {
  DLG.q = lines; DLG.idx = 0; DLG.done = done || null;
  DLG.choices = null; DLG.openedAt = performance.now();
  G.mode = 'dialog';
  el.dialog.classList.remove('hidden');
  el.prompt.classList.add('hidden');
  startLine();
}
function startLine() {
  const L = DLG.q[DLG.idx];
  el.dSp.textContent = L.sp || '';
  el.dSp.style.display = L.sp ? '' : 'none';
  DLG.ci = 0; DLG.typing = true;
  el.dCh.innerHTML = ''; DLG.choices = null;
  el.dHint.style.display = '';
}
function updDialog(dt) {
  if (!DLG.typing) return;
  const L = DLG.q[DLG.idx];
  DLG.ci += dt * 26;
  if (DLG.ci >= L.tx.length) { DLG.ci = L.tx.length; finishType(); }
  el.dTx.textContent = L.tx.slice(0, Math.floor(DLG.ci));
}
function finishType() {
  DLG.typing = false;
  const L = DLG.q[DLG.idx];
  el.dTx.textContent = L.tx;
  if (L.ch) {
    DLG.choices = L.ch; DLG.sel = 0;
    renderChoices();
    el.dHint.style.display = 'none';
  }
}
function renderChoices() {
  el.dCh.innerHTML = '';
  DLG.choices.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'choice' + (i === DLG.sel ? ' sel' : '');
    d.textContent = c.t;
    d.onclick = () => { DLG.sel = i; pickChoice(); };
    d.onmouseenter = () => { DLG.sel = i; renderChoices(); };
    el.dCh.appendChild(d);
  });
}
function moveChoice(d) {
  DLG.sel = (DLG.sel + d + DLG.choices.length) % DLG.choices.length;
  renderChoices();
}
function pickChoice() {
  const c = DLG.choices[DLG.sel];
  DLG.choices = null; el.dCh.innerHTML = '';
  if (c.fn) c.fn();
  if (c.then && c.then.length) say(c.then, DLG.done);
  else endDialog();
}
function advanceDialog() {
  if (DLG.typing) { DLG.ci = DLG.q[DLG.idx].tx.length; finishType(); return; }
  DLG.idx++;
  if (DLG.idx >= DLG.q.length) endDialog();
  else startLine();
}
function endDialog() {
  el.dialog.classList.add('hidden');
  G.mode = 'play';
  const cb = DLG.done; DLG.done = null;
  if (cb) cb();
}

/* ---------------- 信纸 ---------------- */
let letterAt = 0, letterCb = null;
function openLetter(text, cb) {
  G.mode = 'letter'; letterAt = performance.now(); letterCb = cb || null;
  el.lTx.textContent = text;
  el.letter.classList.remove('hidden');
  hum();
}
function closeLetter() {
  el.letter.classList.add('hidden');
  G.mode = 'play';
  const cb = letterCb; letterCb = null;
  if (cb) cb();
}

/* ---------------- 开场剧情 ---------------- */
const SLIDES = [
  "一九九六年冬，满月。\n渔船「灰鲸号」在灰礁外海沉没。\n官方记录：十一人，全部遇难。\n只有镇志的边角，留着一行被墨涂掉的字——\n「生还者由镇方安置于……」",
  "三个月前，你的哥哥沈墨——\n灰礁镇最后一任灯塔看守员——\n毫无征兆地断了音讯。\n房东却说，他的房间每天都被打扫得一尘不染。",
  "一周前，你收到他寄出的最后一封信。\n信纸上只有一行字：\n\n「别让灯塔在满月熄灯。」",
  "你打电话回镇上询问。\n杂货铺、卫生院、居委会——\n所有人的回答整齐得像排练过：\n「那座灯塔？二十年没亮过喽。」",
  "今晚，末班长途车穿过雨幕。\n你回到了这座终年被海雾笼罩的小镇。\n\n—— 距离下一个满月，还有七天。"
];
const INTRO = { slide: -1, ci: 0, typing: false, started: false };

function advanceIntro() {
  if (INTRO.typing) {
    INTRO.ci = SLIDES[INTRO.slide].length;
    el.iTx.textContent = SLIDES[INTRO.slide];
    INTRO.typing = false;
    return;
  }
  INTRO.slide++;
  if (INTRO.slide >= SLIDES.length) { startGame(); return; }
  if (INTRO.slide === 0) { el.iTitle.style.opacity = '.14'; el.iSub.style.opacity = '.14'; }
  INTRO.ci = 0; INTRO.typing = true;
  el.iTx.textContent = '';
}
function updIntro(dt) {
  if (!INTRO.typing) return;
  const s = SLIDES[INTRO.slide];
  INTRO.ci += dt * 22;
  if (INTRO.ci >= s.length) { INTRO.ci = s.length; INTRO.typing = false; }
  el.iTx.textContent = s.slice(0, Math.floor(INTRO.ci));
}
el.iSkip.addEventListener('click', () => { initAudio(); startGame(); });

function startGame() {
  if (INTRO.started) return;
  INTRO.started = true;
  G.mode = 'transition';
  fadeTo(() => {
    el.intro.classList.add('hidden');
    el.hud.classList.remove('hidden');
    el.ctrl.classList.remove('hidden');
    modTruth(0); modTrust(0);
    loadScene('station', 64, 230, 'right');
    if (G.mode === 'transition') G.mode = 'play';
  });
}

/* ---------------- 场景烘焙与转场 ---------------- */
function bakeLayer(w, painter, blur) {
  if (!painter) return null;
  const cv = mkCanvas(w, VH), c = cv.getContext('2d');
  painter(c, cv.width);
  if (!blur) return cv;
  const cv2 = mkCanvas(w, VH), c2 = cv2.getContext('2d');
  try { c2.filter = 'blur(2px)'; } catch (e) { }
  c2.drawImage(cv, 0, 0);
  return cv2;
}
function bakeScene(sc) {
  if (sc._baked) return;
  const span = Math.max(0, sc.w - VW);
  sc._far = bakeLayer(VW + span * 0.22, sc.bake.far, true);   // 远景烘焙时一次性虚化（景深）
  sc._mid = bakeLayer(VW + span * 0.55, sc.bake.mid, false);
  sc._back = bakeLayer(Math.max(sc.w, VW), sc.bake.back, false);
  sc._front = bakeLayer(VW + span * 1.18, sc.bake.front, false);
  sc._baked = true;
}
function fadeTo(cb) {
  el.fade.style.opacity = '1';
  setTimeout(() => { cb && cb(); el.fade.style.opacity = '0'; }, 820);
}
function showLocation(name) {
  el.location.textContent = name;
  el.location.classList.add('show');
  setTimeout(() => el.location.classList.remove('show'), 2600);
}
function loadScene(id, sx, sy, sdir) {
  const sc = SCENES[id];
  bakeScene(sc);
  G.scene = sc;
  player.x = sx; player.y = sy; player.dir = sdir || 'down'; player.moving = false;
  G.cam = clamp(player.x - VW / 2, 0, Math.max(0, sc.w - VW));
  showLocation(sc.name);
  if (!G.visited[id]) {
    G.visited[id] = true;
    if (sc.onEnter) sc.onEnter();
  }
}
function gotoScene(id, sx, sy, sdir) {
  G.mode = 'transition';
  fadeTo(() => { loadScene(id, sx, sy, sdir); if (G.mode === 'transition') G.mode = 'play'; });
}

/* ================================================================
   剧情对话内容
   ================================================================ */
function once(id, n) { if (!flag(id)) { setFlag(id); modTruth(n); } }

function checkObjective() {
  if (flag('metZhou') && flag('metWu') && !flag('objHome')) {
    setFlag('objHome');
    setObj('去哥哥生前的住处看看\n街道北侧，那扇蓝门老屋');
  }
}

function talkZhou() {
  if (G.act === 3) {
    say([{ sp: '周婶', tx: '（她提前关了店门，只在窗台留了一盏灯）\n今晚……别回头。' }]);
    return;
  }
  if (G.act === 2 && !flag('metZhou2')) {
    say([
      { sp: '周婶', tx: '（往门外瞅了瞅，压低声音）\n卫生院那丫头是外乡人，心是好的……你去找她，没错。' },
      { sp: '周婶', tx: '档案室的事——老婆子我可什么都没说。\n（她把一包烟丝塞进你口袋，像打发一个常客）' },
      { sp: '沈砚', tx: '（她什么都知道。她只是选择了不说。）' }
    ], () => { setFlag('metZhou2'); modTruth(5); });
    return;
  }
  if (G.act === 2) { say([{ sp: '周婶', tx: '雾要涨了。\n满月前，早点回屋。' }]); return; }
  say([
    { sp: '周婶', tx: '哟——这不是沈家二小子嘛！啥时候回来的？' },
    { sp: '沈砚', tx: '周婶。我哥……最近来店里过吗？' },
    { sp: '周婶', tx: '你哥啊……早搬走啦，去大城市享福咯。' },
    { sp: '沈砚', tx: '他三个月没跟家里联系了。' },
    {
      sp: '周婶', tx: '（擦手的动作停了一下，声音压低）\n……你，没收到他最后一封信？', ch: [
        {
          t: '「什么信？」—— 追问下去', fn: () => modTruth(15), then: [
            { sp: '周婶', tx: '没、没什么！老婆子我老糊涂喽……\n（她转身去擦一个已经很干净的柜台）' },
            { sp: '沈砚', tx: '（她在撒谎。这个镇上，每个人都在撒谎。）' },
            { sp: '周婶', tx: '走吧走吧，要打烊了。\n……满月前，别去海岬那边。' }
          ]
        },
        {
          t: '「可能他只是忙。」—— 装作不在意', fn: () => modTrust(15), then: [
            { sp: '周婶', tx: '（叹了口气，往你手里塞了把旧伞）\n夜里雾大，当心病气。你哥……是个好人。' },
            { sp: '沈砚', tx: '（她的眼神躲开了。\n这把伞——是哥哥留在店里的。）' }
          ]
        }
      ]
    }
  ], () => { setFlag('metZhou'); checkObjective(); });
}

function talkWu() {
  if (G.act === 3) {
    say([{ sp: '老吴', tx: '（他今晚一滴酒没沾，直直地看着你）\n满月了。……替我向你哥，敬一杯。' }]);
    return;
  }
  if (G.act === 2 && !flag('metWu2')) {
    say([
      { sp: '老吴', tx: '（难得没喝酒）海岬那条路，封了二十年。\n……总得有人上去看看。' },
      { sp: '老吴', tx: '二十年前那个晚上，我也在船上。\n别以为喝醉了，就能忘掉。' },
      { sp: '沈砚', tx: '（他的手动了一下，\n像是想去摸那枚铜哨。）' }
    ], () => { setFlag('metWu2'); modTruth(5); });
    return;
  }
  const L = [
    { sp: '老吴', tx: '（酒气）……灯塔？那玩意儿早死了。二十年前就死透了。' },
    { sp: '沈砚', tx: '那海岬上偶尔亮的光，是什么？' },
    { sp: '老吴', tx: '（酒醒了一半）你看错了。雾大，看什么都像光。' }
  ];
  if (G.trust >= 35) {
    L.push(
      { sp: '老吴', tx: '（他盯着海看了很久很久）\n……你哥啊。他夜里常往那边走。鞋上全是泥，第二天还笑呵呵的。' },
      { sp: '沈砚', tx: '（他夜里去灯塔……做什么？）' }
    );
  } else {
    L.push({ sp: '老吴', tx: '回去吧，城里娃。这镇子，不欢迎刨根问底的人。' });
  }
  say(L, () => {
    if (G.trust >= 35) modTruth(10);
    setFlag('metWu'); checkObjective();
  });
}

const LETTER_TEXT =
  "砚：\n\n若你读到这封信，说明我没能回来。\n\n别怪镇上的人。他们只是怕。\n\n记住——满月那天，无论听到什么、看到什么，\n都别让灯塔熄灯。\n\n光在，他们在外；光灭，他们回家。\n\n　　　　　　　　　　　　墨";

function endAct1() {
  fadeTo(() => {
    G.mode = 'end'; G.endKind = 1;
    el.hud.classList.add('hidden');
    el.ctrl.classList.add('hidden');
    el.eTitle.textContent = '第一幕 · 抵达 —— 完';
    el.eStats.innerHTML =
      `真相度 ${G.truth} ／ 镇民信任 ${G.trust}<br>` +
      (G.trust >= 35 ? '镇民们，似乎愿意对你多说一句。' : '镇民们对你，仍心存戒备。');
    el.eTeaser.innerHTML = '「距离满月，还有七天。」<br>第二幕 · 潮水 —— 等待着你';
    el.eHint.textContent = '空格 进入第二幕 ｜ R 重新开始';
    el.ending.classList.remove('hidden');
  });
}

function startAct2() {
  G.act = 2; G.endKind = 0;
  // 重置场景入场标记，让各场景以第二幕状态刷新
  G.visited = {};
  setFlag('gotLetter1');
  G.mode = 'transition';
  fadeTo(() => {
    el.ending.classList.add('hidden');
    el.hud.classList.remove('hidden');
    el.ctrl.classList.remove('hidden');
    loadScene('street', 810, 218, 'down');
    if (G.mode === 'transition') G.mode = 'play';
  });
}

/* ================================================================
   场景定义（bake = 静态烘焙层，dyn = 每帧动态层）
   ================================================================ */
function txt(c, s, x, y, col, size, align) {
  c.fillStyle = col; c.font = (size || 8) + 'px monospace';
  c.textAlign = align || 'left'; c.textBaseline = 'top';
  c.fillText(s, Math.round(x), Math.round(y));
}
function skyBake(c, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, P.sky0); g.addColorStop(0.55, P.sky1); g.addColorStop(1, P.sky2);
  c.fillStyle = g; c.fillRect(0, 0, c.canvas.width, h);
  // 星
  const r = srand(42);
  for (let i = 0; i < 40; i++) {
    const sx = r() * c.canvas.width, sy = r() * h * 0.55;
    R(c, sx, sy, 1, 1, `rgba(200,215,235,${0.2 + r() * 0.4})`);
  }
}
function cloudsDyn(c, t) {
  for (const [bx, by, sp] of [[60, 26, 4], [300, 48, 6], [520, 18, 3]]) {
    const cx = ((bx - t * sp) % (VW + 200) + VW + 200) % (VW + 200) - 160;
    c.globalAlpha = 0.85; c.drawImage(cloudCv, Math.round(cx), by);
  }
  c.globalAlpha = 1;
}
function shimmer(c, t, y0, rows) {
  for (let i = 0; i < rows; i++) {
    const wy = y0 + i * 9;
    const off = (t * (6 + i * 2) + i * 60) % 200;
    R(c, off - 100, wy, 34, 1, 'rgba(120,160,185,.2)');
    R(c, off + 120, wy + 3, 22, 1, 'rgba(120,160,185,.13)');
  }
}

const SCENES = {

  /* ---------- 汽车站 · 雨夜 ---------- */
  station: {
    name: '灰礁镇 · 汽车站', w: 960, band: [200, 238], rain: true,
    blocks: [
      { x: 338, y: 198, w: 30, h: 10 },
      { x: 94, y: 198, w: 8, h: 24 }, { x: 256, y: 198, w: 8, h: 24 },
      { x: 148, y: 192, w: 74, h: 8 }
    ],
    exits: [
      { x: 938, y: 200, w: 22, h: 38, to: 'street', sx: 36, sy: 222, sdir: 'right' }
    ],
    items: [
      {
        id: 'poster', x: 353, y: 208, r: 26, label: '告示牌', act() {
          once('poster', 5);
          say([{ tx: '褪色的寻人启事层层叠叠。最新的一张写着：\n「灰鲸号海难 · 二十周年祭」。' },
          { sp: '沈砚', tx: '（二十周年……下个满月，就是祭日了。）' }]);
        }
      },
      {
        id: 'neon', x: 170, y: 208, r: 42, label: '霓虹招牌', act() {
          say([{ tx: '霓虹灯管缺了笔画，「灰礁客运站」只剩半边字，\n在雨里明明灭灭。' },
          { sp: '沈砚', tx: '（和记忆里一模一样。\n这个镇子，好像被时间忘在了原地。）' }]);
        }
      },
      {
        id: 'bench', x: 185, y: 208, r: 24, label: '长椅', act() {
          say([{ tx: '湿漉漉的长椅，椅背上落着一只躲雨的蛾。\n你没什么心情坐下。' }]);
        }
      }
    ],
    npcs: [],
    onEnter() {
      if (G.act !== 1) return;
      setObj('雨夜 · 抵达灰礁镇\n沿公路往东走，进镇 →');
      say([
        { sp: '沈砚', tx: '（雨，比记忆里更冷了。）' },
        { sp: '沈砚', tx: '（二十年了，车站的霓虹还是缺着笔画……）' },
        { sp: '沈砚', tx: '（海岬上……刚才那一闪而过的，是光吗？）' },
        { tx: '—— 沿公路往东走，先进镇吧。' }
      ]);
    },
    bake: {
      far(c, W) {
        skyBake(c, 150);
        R(c, 0, 118, W, 34, P.sea);
        R(c, 0, 118, W, 1, P.seaHi);
        hillSteps(c, -30, 118, 200, 4, P.hillFar);
        hillSteps(c, 90, 118, 160, 3, P.hillFar);
        // 海岬 + 灯塔
        hillSteps(c, 368, 140, 120, 3, '#0a1220');
        lighthouseBody(c, 428, 138, 0.9);
        for (let i = 0; i < 5; i++) R(c, 150 + i * 26, 112, 2, 2, 'rgba(232,168,80,.45)');
      },
      mid(c, W) {
        const roofs = [[40, 60, 40], [130, 80, 52], [240, 56, 36], [330, 90, 48], [460, 64, 40], [560, 84, 50]];
        for (const [x, w, h] of roofs) {
          brickWall(c, x, 186 - h, w, h, '#131c28', '#0a111c', x);
          R(c, x - 4, 186 - h - 6, w + 8, 6, '#0c1420');
          R(c, x - 4, 186 - h - 6, w + 8, 2, '#16202e');
        }
        deadTree(c, 640, 186, 1, P.tree);
        deadTree(c, 24, 186, 0.8, P.tree);
        for (const x of [90, 420, 700]) {
          R(c, x, 130, 3, 56, '#0c1320');
          R(c, x - 8, 134, 19, 2, '#0c1320');
        }
      },
      back(c, W) {
        tileGround(c, 0, 192, W, 78, { base: P.stone, top: P.stoneTop, dark: P.stoneDk, speck: '#565043', moss: P.moss, seed: 11 });
        R(c, 0, 196, W, 2, '#3d3a30');
        // 雨棚（高架屋顶 + 长柱，避免读成桌子）
        R(c, 80, 148, 200, 8, '#1c1712');
        R(c, 80, 148, 200, 2, '#3d3022');
        R(c, 76, 146, 208, 3, '#2c2218');
        R(c, 94, 156, 8, 50, '#241c14');
        R(c, 94, 156, 2, 50, '#4a3a28');
        R(c, 256, 156, 8, 50, '#241c14');
        R(c, 256, 156, 2, 50, '#4a3a28');
        R(c, 94, 176, 170, 3, '#2c2218'); // 横梁
        // 长椅
        R(c, 148, 188, 74, 6, P.wood);
        R(c, 148, 188, 74, 2, P.woodHi);
        R(c, 152, 194, 4, 10, P.woodDk);
        R(c, 214, 194, 4, 10, P.woodDk);
        // 霓虹光晕（烘焙一次，不再每帧 shadowBlur）
        c.save();
        c.shadowColor = P.neon; c.shadowBlur = 12; c.globalAlpha = 0.8;
        txt(c, '灰 辶 客 辶', 106, 158, P.neon, 9);
        c.restore();
        // 告示牌
        R(c, 336, 166, 34, 38, '#2c3644');
        R(c, 336, 166, 34, 3, '#3d4858');
        R(c, 340, 171, 11, 13, '#a39c88');
        R(c, 354, 172, 9, 11, '#8f887a');
        R(c, 341, 187, 20, 12, '#b0a892');
        R(c, 341, 187, 20, 2, '#c4bca4');
        R(c, 340, 204, 26, 4, P.woodDk);
        // 积水（静态）
        for (const [px, py, pw] of [[420, 246, 46], [700, 248, 60], [200, 252, 38], [880, 244, 42]]) {
          c.fillStyle = 'rgba(120,150,175,.18)';
          c.beginPath(); c.ellipse(px, py, pw, 4, 0, 0, Math.PI * 2); c.fill();
          R(c, px - pw * 0.3, py - 1, pw * 0.3, 1, 'rgba(190,210,228,.2)');
        }
      },
      front(c, W) {
        for (const [x, h] of [[30, 14], [120, 10], [520, 12], [700, 9], [860, 15]]) {
          R(c, x, VH - h, 4, h, '#05090f');
          R(c, x + 5, VH - h + 4, 4, h - 4, '#05090f');
          R(c, x - 5, VH - h + 6, 4, h - 6, '#05090f');
        }
      }
    },
    dyn: {
      far(c, pc, t) {
        drawBeam(c, 428 - pc, 138 - 29 * 0.9, t, 0.9, 170);
        shimmer(c, t, 124, 3);
        cloudsDyn(c, t);
      },
      mid(c, pc, t) {
        if (Math.sin(t * 3) > -0.6) R(c, 150 - pc, 152, 4, 5, 'rgba(232,168,80,.75)');
        if (Math.sin(t * 2.3 + 2) > -0.2) R(c, 356 - pc, 158, 4, 5, 'rgba(232,168,80,.6)');
      },
      back(c, pc, t) {
        const fl = Math.random() > 0.05 ? (0.7 + 0.3 * Math.sin(t * 7)) : 0.15;
        c.globalAlpha = fl;
        txt(c, '灰 辶 客 辶', 106 - pc, 158, '#f088c0', 9);
        c.globalAlpha = 1;
      }
    }
  },

  /* ---------- 老街 ---------- */
  street: {
    name: '灰礁镇 · 老街', w: 1240, band: [198, 238], rain: true,
    blocks: [
      { x: 684, y: 194, w: 32, h: 8 },
      { x: 218, y: 194, w: 6, h: 8 }, { x: 698, y: 194, w: 6, h: 8 }, { x: 1048, y: 194, w: 6, h: 8 }
    ],
    exits: [
      { x: 0, y: 198, w: 12, h: 40, to: 'station', sx: 924, sy: 222, sdir: 'left' },
      { x: 1226, y: 198, w: 14, h: 40, to: 'pier', sx: 40, sy: 222, sdir: 'right' },
      { x: 792, y: 190, w: 34, h: 12, to: 'home', sx: 240, sy: 238, sdir: 'up' }
    ],
    items: [
      { id: 'zhou', x: 442, y: 212, r: 30, label: '与周婶交谈', act: talkZhou },
      {
        id: 'board', x: 700, y: 208, r: 26, label: '公告栏', act() {
          if (G.act === 2 && !flag('letter4')) {
            say([{ tx: '公告栏的木板松了。\n后面贴着什么东西——一个被雾水浸软的信封。' }],
              () => gainLetter('letter4', LETTER4));
            return;
          }
          once('board', 5);
          say([{ tx: '停水通知、禁渔期通告……最底下压着一张手写的纸：\n「满月期间，夜间请勿靠近海岬。」' },
          { sp: '沈砚', tx: '（为什么，偏偏是满月？）' }]);
        }
      },
      {
        id: 'archive', x: 590, y: 208, r: 28, label: '钉死的木门', act() {
          if (G.act < 2) {
            once('archive', 5);
            say([{ tx: '镇档案室的门被木板钉死了。\n木板上有一行粉笔字：「一九九六，勿问。」' },
            { sp: '沈砚', tx: '（里面锁着的，恐怕不止是旧报纸。）' }]);
            return;
          }
          if (!flag('hasKey')) {
            say([{ sp: '沈砚', tx: '（木板已经被起掉了，但门还锁着。\n需要一把钥匙——也许阿岚知道些什么。）' }]);
            return;
          }
          gotoScene('archiveIn', 120, 236, 'right');
        }
      },
      {
        id: 'clinicDoor', x: 992, y: 208, r: 26, label: '卫生院大门', act() {
          if (G.act < 2) {
            say([{ tx: '镇卫生院。百叶窗放了下来，夜里不开诊。\n窗玻璃上贴着一张手写的作息表。' }]);
            return;
          }
          gotoScene('clinic', 120, 238, 'right');
        }
      }
    ],
    npcs: [
      { x: 442, y: 214, map: 'zhou', pal: 'zhou' }
    ],
    onEnter() {
      if (G.act === 3) setObj('第三幕 · 满月\n去海岬，登上灯塔');
      else if (G.act === 2) setObj('第二幕 · 潮水\n去卫生院找护士阿岚（老街东段 · 白十字）');
      else setObj('打听哥哥的下落\n杂货铺的周婶 · 码头的老吴');
    },
    bake: {
      far(c, W) {
        skyBake(c, 150);
        R(c, 0, 122, W, 30, P.sea);
        R(c, 0, 122, W, 1, P.seaHi);
        hillSteps(c, 200, 122, 190, 4, P.hillFar);
        hillSteps(c, 620, 122, 160, 3, P.hillFar);
        hillSteps(c, 1080, 132, 110, 3, '#0a1220');
        lighthouseBody(c, 1130, 130, 0.55);
      },
      mid(c, W) {
        const row = [[60, 90, 46], [200, 70, 56], [560, 100, 42], [760, 80, 54], [900, 90, 44], [1100, 70, 50]];
        for (const [x, w, h] of row) {
          brickWall(c, x, 182 - h, w, h, '#101825', '#080e18', x * 3);
          R(c, x - 3, 182 - h - 5, w + 6, 5, '#0c1320');
        }
        deadTree(c, 480, 182, 1.1, P.tree);
        deadTree(c, 1020, 182, 0.9, P.tree);
      },
      back(c, W) {
        tileGround(c, 0, 190, W, 80, { base: '#2e3038', top: '#454854', dark: '#1f2129', speck: '#565a66', moss: '#3d4a3a', seed: 23 });
        // ---- 周记杂货 ----
        brickWall(c, 300, 116, 170, 78, '#3d3a44', '#262430', 101);
        R(c, 296, 110, 178, 8, P.woodDk);
        R(c, 296, 110, 178, 2, P.woodHi);
        // 橱窗框 + 货架剪影
        R(c, 312, 138, 60, 44, '#120e0a');
        R(c, 314, 140, 56, 40, 'rgba(60,42,22,.9)');
        R(c, 316, 152, 20, 8, '#2a1f12'); R(c, 344, 150, 22, 10, '#2a1f12');
        R(c, 318, 166, 24, 8, '#241a10'); R(c, 348, 164, 18, 10, '#241a10');
        R(c, 312, 138, 60, 3, '#0a0806'); R(c, 312, 158, 60, 2, '#0a0806');
        R(c, 340, 138, 2, 44, '#0a0806');
        // 店门
        R(c, 424, 140, 34, 54, '#1a1410');
        R(c, 426, 142, 30, 50, '#241a12');
        R(c, 440, 166, 4, 4, P.warm);
        // 招牌（烘焙光晕）
        R(c, 316, 120, 120, 14, '#17110c');
        R(c, 316, 120, 120, 2, '#2c221a');
        c.save(); c.shadowColor = P.warm; c.shadowBlur = 10; c.globalAlpha = 0.9;
        txt(c, '周 记 杂 货', 328, 123, '#f0c080', 9); c.restore();
        // 红灯笼
        for (const lx of [306, 464]) {
          c.save(); c.shadowColor = P.lantern; c.shadowBlur = 12;
          R(c, lx - 3, 137, 6, 9, P.lantern); c.restore();
          R(c, lx - 1, 135, 2, 2, '#7a2a20');
          R(c, lx - 3, 139, 6, 1, '#f08060');
        }
        // ---- 档案室 ----
        brickWall(c, 520, 124, 140, 70, '#34323c', '#201e28', 202);
        R(c, 516, 118, 148, 7, '#14121a');
        R(c, 576, 146, 30, 48, '#1c1812');
        for (let i = 0; i < 3; i++) {
          R(c, 572, 152 + i * 13, 38, 5, P.wood);
          R(c, 572, 152 + i * 13, 38, 1, P.woodHi);
        }
        R(c, 530, 134, 34, 22, '#0e0c12');
        R(c, 530, 134, 34, 2, '#1c1a22');
        // ---- 沈家老宅 ----
        brickWall(c, 760, 122, 110, 72, '#3c4048', '#262a32', 303);
        R(c, 756, 116, 118, 7, '#181c24');
        R(c, 792, 152, 34, 42, '#2e5a8a');
        R(c, 792, 152, 34, 3, '#4a7aae');
        R(c, 794, 156, 30, 2, '#244a72');
        R(c, 818, 170, 3, 3, P.warm);
        R(c, 838, 132, 20, 18, '#0d1119');
        R(c, 838, 132, 20, 2, '#1a2029');
        // ---- 卫生院（白十字） ----
        brickWall(c, 930, 126, 110, 68, '#484c54', '#323640', 404);
        R(c, 926, 120, 118, 7, '#2a2e36');
        R(c, 976, 152, 32, 42, '#3a3e46');
        R(c, 976, 152, 32, 3, '#565c66');
        R(c, 990, 166, 4, 4, P.warm);
        // 红十字灯箱
        c.save(); c.shadowColor = '#e05050'; c.shadowBlur = 10;
        R(c, 986, 132, 12, 4, '#e05050'); R(c, 990, 128, 4, 12, '#e05050');
        c.restore();
        R(c, 944, 134, 22, 18, '#131c26');
        R(c, 944, 134, 22, 2, '#24313f');
        // ---- 公告栏 ----
        R(c, 684, 150, 32, 46, '#2c3644');
        R(c, 684, 150, 32, 3, '#3d4858');
        R(c, 687, 155, 11, 14, '#a39c88');
        R(c, 701, 156, 10, 12, '#b0a892');
        R(c, 688, 172, 24, 20, '#8f887a');
        R(c, 688, 172, 24, 2, '#a39c88');
        // ---- 路灯（静态杆） ----
        for (const lx of [220, 700, 1050]) {
          R(c, lx - 1, 128, 4, 66, '#141c26');
          R(c, lx - 5, 124, 12, 5, '#1c2836');
          R(c, lx - 5, 124, 12, 1, '#2c3c50');
        }
        // 积水
        for (const [px, py, pw] of [[160, 246, 40], [540, 250, 52], [960, 246, 44]]) {
          c.fillStyle = 'rgba(120,150,175,.16)';
          c.beginPath(); c.ellipse(px, py, pw, 4, 0, 0, Math.PI * 2); c.fill();
        }
      },
      front(c, W) {
        // 近景屋檐（超视差）
        R(c, W - 90, 0, 90, 26, '#05090f');
        R(c, W - 90, 26, 70, 6, '#05090f');
        R(c, 40, VH - 16, 5, 16, '#05090f');
        R(c, 47, VH - 10, 4, 10, '#05090f');
      }
    },
    dyn: {
      far(c, pc, t) {
        drawBeam(c, 1130 - pc, 130 - 29 * 0.55, t, 0.55, 130);
        cloudsDyn(c, t);
      },
      mid(c, pc, t) {
        for (const [x, o] of [[240, 0], [920, 2]]) {
          for (let i = 0; i < 3; i++) {
            const yy = 120 - i * 10 - ((t * 8 + o * 7) % 10);
            c.fillStyle = `rgba(120,135,150,${0.14 - i * 0.04})`;
            c.beginPath(); c.arc(x - pc + Math.sin(t + i) * 3, yy, 3 + i * 1.5, 0, Math.PI * 2); c.fill();
          }
        }
      },
      back(c, pc, t) {
        // 橱窗暖光呼吸
        const glow = 0.55 + 0.3 * Math.sin(t * 5);
        R(c, 315 - pc, 141, 54, 38, `rgba(232,168,80,${0.35 * glow})`);
        // 路灯光
        for (const lx of [220, 700, 1050]) {
          const on = lx === 700 ? (Math.random() > 0.04) : true;
          if (!on) continue;
          const a = 0.6 + 0.3 * Math.sin(t * 6 + lx);
          c.globalAlpha = a;
          c.drawImage(coneCv, lx - 24 - pc, 132);
          c.drawImage(lampGlowCv, lx - 12 - pc, 118, 24, 24);
          c.globalAlpha = 1;
          R(c, lx - 3 - pc, 129, 8, 3, `rgba(240,220,160,${a})`);
        }
        // 灯笼光晕
        for (const lx of [306, 464]) {
          c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4 + lx);
          c.drawImage(lampGlowCv, lx - 11 - pc, 130, 22, 22);
          c.globalAlpha = 1;
        }
      }
    }
  },

  /* ---------- 码头 ---------- */
  pier: {
    name: '灰礁镇 · 码头', w: 1100, band: [200, 240], rain: true,
    blocks: [
      { x: 598, y: 198, w: 66, h: 14 },
      { x: 196, y: 194, w: 8, h: 10 },
      { x: 1040, y: 198, w: 60, h: 24, gone: 'archiveDone' },
      { x: 742, y: 200, w: 18, h: 10 }
    ],
    exits: [
      { x: 0, y: 200, w: 12, h: 40, to: 'street', sx: 1196, sy: 222, sdir: 'left' },
      { x: 1076, y: 200, w: 24, h: 40, to: 'cape', sx: 60, sy: 222, sdir: 'right', need: 'archiveDone' }
    ],
    items: [
      { id: 'wu', x: 750, y: 216, r: 30, label: '与老吴交谈', act: talkWu },
      {
        id: 'boat', x: 330, y: 216, r: 38, label: '旧渔船', act() {
          once('boat', 5);
          say([{ tx: '「灰鲸号」沉没之后，镇里的渔船都改了名。\n这条船船头的漆字，被人用砂纸磨掉了。' },
          { sp: '沈砚', tx: '（改名，就能当作什么都没发生过吗？）' }]);
        }
      },
      {
        id: 'whistle', x: 120, y: 216, r: 24, label: '系缆桩', act() {
          once('whistle', 5);
          say([{ tx: '缆绳上缠着一枚旧铜哨——\n是守灯人向海面传信号用的东西。' },
          { sp: '沈砚', tx: '（守灯人的哨子……为什么会缠在这里？）' }]);
        }
      }
    ],
    npcs: [
      { x: 750, y: 220, map: 'wu', pal: 'wu', sit: true }
    ],
    bake: {
      far(c, W) {
        skyBake(c, 150);
        R(c, 0, 100, W, 52, P.sea);
        R(c, 0, 100, W, 1, P.seaHi);
        hillSteps(c, 468, 140, 130, 3, '#0a1220');
        lighthouseBody(c, 520, 118, 1.25);
        hillSteps(c, 60, 100, 140, 3, P.hillFar);
      },
      mid(c, W) {
        // 远处港灯
        for (const x of [180, 620, 900]) R(c, x, 148, 2, 2, 'rgba(232,168,80,.4)');
      },
      back(c, W) {
        // 木栈道（泰拉瑞亚式木板）
        tileGround(c, 0, 194, W, 76, { base: '#4a3a28', top: '#6a5638', dark: '#33281a', speck: '#7a6444', seed: 37 });
        for (let x = 0; x < W; x += 24) R(c, x, 194, 2, 76, 'rgba(0,0,0,.3)');
        R(c, 0, 194, W, 2, '#7a6444');
        // 桩木
        for (const x of [60, 240, 460, 700, 940]) {
          R(c, x, 236, 8, 26, P.woodDk);
          R(c, x - 1, 234, 10, 3, '#1a130c');
          R(c, x, 236, 2, 26, P.woodHi);
        }
        // 系缆桩 + 铜哨
        R(c, 114, 206, 12, 10, P.woodDk);
        R(c, 112, 204, 16, 3, '#1a130c');
        R(c, 118, 200, 3, 4, '#b09a4a');
        // 码头灯杆
        R(c, 196, 128, 5, 68, '#141c26');
        R(c, 191, 124, 15, 5, '#1c2836');
        // 货箱堆（描边方块）
        const crate = (x, y, s) => {
          R(c, x, y, s, s, '#5f4a33');
          R(c, x, y, s, 2, '#7a6444');
          R(c, x, y, 2, s, '#7a6444');
          R(c, x + s - 2, y, 2, s, '#33281a');
          R(c, x, y + s - 2, s, 2, '#33281a');
          R(c, x + 3, y + 3, s - 6, 2, '#33281a');
        };
        crate(598, 176, 22); crate(622, 176, 22); crate(610, 154, 22); crate(646, 182, 16);
        // 酒瓶
        R(c, 762, 210, 3, 7, '#3a6a4a');
        R(c, 762, 208, 3, 2, '#2a4a34');
        // 海鸥栖桩
        R(c, 420, 190, 2, 12, P.woodDk);
      },
      front(c, W) {
        R(c, W - 60, 0, 4, 60, '#0a0805');
        R(c, W - 64, 56, 12, 6, '#0a0805');
        R(c, 30, 0, 3, 40, '#0a0805');
      }
    },
    dyn: {
      far(c, pc, t) {
        drawBeam(c, 520 - pc, 118 - 29 * 1.25, t, 1.25, 210);
        shimmer(c, t, 108, 4);
        cloudsDyn(c, t);
      },
      mid(c, pc, t) {
        // 泊船（随波起伏 + 方块感）
        for (const [bx, by, ph] of [[300, 166, 0], [520, 158, 2]]) {
          const bob = Math.round(Math.sin(t * 1.2 + ph) * 1.5);
          R(c, bx - 34 - pc, by + bob, 68, 10, '#0c1420');
          R(c, bx - 34 - pc, by + bob, 68, 2, '#16202e');
          R(c, bx - 28 - pc, by - 4 + bob, 56, 5, '#0c1420');
          R(c, bx - 1 - pc, by - 34 + bob, 2, 32, '#0a121c');
          R(c, bx - 1 - pc, by - 30 + bob, 14, 8, '#101a28');
          if (Math.sin(t * 2 + ph) > 0) R(c, bx - 20 - pc, by - 2 + bob, 4, 3, 'rgba(232,168,80,.7)');
        }
      },
      back(c, pc, t) {
        // 码头尽头：缆绳障碍（档案室剪报拼合后被剪开）
        if (!flag('archiveDone')) {
          R(c, 1040 - pc, 188, 60, 8, '#5a4a30');
          R(c, 1040 - pc, 188, 60, 2, '#6a5838');
          R(c, 1040 - pc, 186, 4, 22, '#2e2318');
          R(c, 1096 - pc, 186, 4, 22, '#2e2318');
        } else {
          R(c, 1052 - pc, 214, 18, 3, '#5a4a30'); // 断绳散落在地
          R(c, 1080 - pc, 218, 12, 2, '#5a4a30');
        }
        const a = 0.6 + 0.3 * Math.sin(t * 6);
        c.globalAlpha = a;
        c.drawImage(coneCv, 198 - 24 - pc, 132);
        c.drawImage(lampGlowCv, 198 - 12 - pc, 118, 24, 24);
        c.globalAlpha = 1;
        R(c, 194 - pc, 129, 9, 3, `rgba(240,220,160,${a})`);
        // 海鸥
        const flap = Math.sin(t * 6) > 0.7;
        const gy = 186 + Math.round(Math.sin(t * 3));
        R(c, 416 - pc, gy, 10, 5, '#d8dde2');
        R(c, 416 - pc, gy, 10, 1, '#f0f2f4');
        R(c, 425 - pc, gy + 1, 3, 2, '#e8b23a');
        if (flap) R(c, 414 - pc, gy - 4, 4, 4, '#d8dde2');
      },
      front(c, pc, t) {
        for (const x of [60, 240, 460, 700, 940]) {
          const sp = Math.max(0, Math.sin(t * 1.6 + x));
          if (sp > 0.6) {
            R(c, x - 4 - pc * 1.18, 250, 3, 2, `rgba(190,215,230,${(sp - 0.6) * 1.4})`);
            R(c, x + 8 - pc * 1.18, 254, 2, 2, `rgba(190,215,230,${(sp - 0.6) * 1.2})`);
          }
        }
      }
    }
  },

  /* ---------- 哥哥的房间 ---------- */
  home: {
    name: '沈墨的房间', w: 480, band: [206, 246], rain: false, interior: true,
    blocks: [
      { x: 36, y: 196, w: 114, h: 16 },
      { x: 200, y: 190, w: 80, h: 12 },
      { x: 420, y: 192, w: 54, h: 14 }
    ],
    exits: [
      { x: 430, y: 240, w: 46, h: 8, to: 'street', sx: 810, sy: 216, sdir: 'down' }
    ],
    items: [
      {
        id: 'diary', x: 242, y: 214, r: 26, label: '黑皮日记', act() {
          if (G.act >= 3) {
            say([{ tx: '日记的锁已经锈死了。\n（哥哥真正想说的话——都写在信里了。）' }]);
            return;
          }
          say([{ tx: '一本黑皮日记，上了锁。\n钥匙不知被哥哥藏去了哪里。' },
          { sp: '沈砚', tx: '（也许镇上有人知道钥匙的事……）' },
          { tx: '【日记将在第三幕开启】' }]);
        }
      },
      {
        id: 'shell', x: 348, y: 214, r: 26, label: '窗台贝壳', act() {
          once('shell', 5);
          say([{ tx: '窗台上放着一枚贝壳，湿漉漉的。\n——可这里是二楼，离海足足有两公里。' },
          { sp: '沈砚', tx: '（是谁，把它从海边带到了这里？）' }]);
        }
      },
      {
        id: 'tide', x: 170, y: 214, r: 26, label: '潮汐表', act() {
          once('tide', 5);
          say([{ tx: '墙上贴着今年的潮汐表。\n满月那三天被红笔圈了又圈，旁边一行小字：\n「光在，他们在外。」' },
          { sp: '沈砚', tx: '（和那封信上，一模一样的话……）' }]);
        }
      },
      {
        id: 'pillow', x: 96, y: 220, r: 26, label: '枕头', act() {
          if (flag('gotLetter1')) {
            say([{ tx: '枕头下已经空了。\n那封信，现在就揣在你的口袋里。' }]);
            return;
          }
          if (!flag('metZhou') || !flag('metWu')) {
            say([{ sp: '沈砚', tx: '（先别急着翻这里……\n去镇上打听一下哥哥的下落吧。）' }]);
            return;
          }
          say([{ sp: '沈砚', tx: '（枕头下面……压着一封信。\n信封上没有邮票，只写了一个「砚」字。）' }],
            () => openLetter(LETTER_TEXT, endAct1));
        }
      }
    ],
    npcs: [],
    onEnter() {
      if (G.act !== 1) return;
      setObj('看看哥哥留下了什么\n（房间里有四处可以调查）');
    },
    bake: {
      far(c, W) { // 室内：深色底
        R(c, 0, 0, W, VH, '#0c0a10');
      },
      mid(c, W) { },
      back(c, W) {
        // 木墙板 + 木地板（泰拉瑞亚式）
        tileGround(c, 0, 0, W, 196, { base: '#2c2630', top: '#3c3440', dark: '#1e1a22', speck: '#484050', seed: 51 });
        for (let ty = 8; ty < 196; ty += 24) R(c, 0, ty, W, 2, 'rgba(0,0,0,.25)');
        R(c, 0, 150, W, 3, '#1c1620');
        tileGround(c, 0, 196, W, 74, { base: '#4a3a28', top: '#6a5638', dark: '#33281a', speck: '#7a6444', seed: 67 });
        for (let ty = 204; ty < VH; ty += 12) R(c, 0, ty, W, 2, 'rgba(0,0,0,.22)');
        // ---- 窗 ----
        R(c, 292, 46, 108, 86, '#1a1410');
        R(c, 296, 50, 100, 78, '#0a1420');
        R(c, 296, 50, 100, 3, '#0e1c2c');
        R(c, 344, 50, 4, 78, '#1a1410');
        R(c, 296, 88, 100, 4, '#1a1410');
        R(c, 292, 46, 108, 4, '#3d2f20');
        R(c, 288, 128, 116, 8, P.wood);
        R(c, 288, 128, 116, 2, P.woodHi);
        // 贝壳
        R(c, 344, 122, 8, 6, '#d8c0b0');
        R(c, 346, 120, 4, 3, '#ecdcc8');
        R(c, 344, 126, 8, 2, '#a89080');
        // ---- 潮汐表 ----
        R(c, 148, 56, 44, 56, '#c4b896');
        R(c, 148, 56, 44, 3, '#d8cca8');
        R(c, 152, 62, 36, 5, '#4a4438');
        for (let i = 0; i < 4; i++) R(c, 153, 74 + i * 9, 34, 1, '#6a6250');
        c.strokeStyle = '#a83a3a'; c.lineWidth = 1;
        c.beginPath(); c.arc(174, 88, 7, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.arc(178, 90, 8, 0, Math.PI * 2); c.stroke();
        // ---- 床 ----
        R(c, 36, 186, 114, 10, P.woodDk);
        R(c, 36, 186, 114, 3, P.wood);
        R(c, 36, 196, 114, 16, '#4a5663');
        R(c, 36, 196, 114, 4, '#5a6876');
        R(c, 40, 212, 6, 8, P.woodDk);
        R(c, 140, 212, 6, 8, P.woodDk);
        R(c, 44, 190, 26, 10, '#d8d0be');
        R(c, 44, 190, 26, 3, '#e8e0ce');
        R(c, 76, 196, 74, 16, '#5a4a52');
        R(c, 76, 196, 74, 3, '#6a5a62');
        // ---- 书桌 ----
        R(c, 200, 188, 80, 6, P.wood);
        R(c, 200, 188, 80, 2, P.woodHi);
        R(c, 204, 194, 6, 20, P.woodDk);
        R(c, 270, 194, 6, 20, P.woodDk);
        R(c, 232, 180, 16, 8, '#14100c'); // 日记
        R(c, 232, 180, 16, 2, '#2c241c');
        R(c, 234, 184, 12, 1, '#3d3430');
        R(c, 254, 176, 5, 12, '#8a8578'); // 油灯
        R(c, 250, 188, 13, 3, '#6a6250');
        // ---- 书架 ----
        R(c, 420, 116, 54, 80, P.woodDk);
        R(c, 420, 116, 54, 3, P.wood);
        R(c, 424, 122, 46, 22, '#14100c');
        R(c, 424, 150, 46, 22, '#14100c');
        const bc = ['#6a4a4a', '#4a6a6a', '#6a6a4a', '#4a4a6a', '#6a5a3a'];
        for (let i = 0; i < 6; i++) { R(c, 426 + i * 7, 124, 5, 18, bc[i % 5]); R(c, 426 + i * 7, 124, 5, 2, 'rgba(255,255,255,.12)'); }
        for (let i = 0; i < 5; i++) { R(c, 428 + i * 8, 152, 5, 18, bc[(i + 2) % 5]); R(c, 428 + i * 8, 152, 5, 2, 'rgba(255,255,255,.12)'); }
        // ---- 门垫 ----
        R(c, 432, 242, 42, 6, '#5a4a3a');
        R(c, 432, 242, 42, 2, '#6a5a48');
        // 地板微反光（一尘不染）
        R(c, 160, 252, 160, 2, 'rgba(200,190,170,.08)');
      },
      front(c, W) { }
    },
    dyn: {
      back(c, pc, t) {
        // 窗玻璃雨痕
        c.strokeStyle = 'rgba(150,175,195,.3)'; c.lineWidth = 1; c.beginPath();
        for (let i = 0; i < 10; i++) {
          const rx = 300 + ((i * 37 + t * 26) % 86);
          const ry = 54 + ((i * 53 + t * 60) % 66);
          c.moveTo(rx, ry); c.lineTo(rx + 1, ry + 7);
        }
        c.stroke();
        // 窗外远处的灯
        if (Math.sin(t * 0.9) > 0.3) {
          c.globalAlpha = 0.7;
          c.drawImage(lampGlowCv, 362, 60, 20, 20);
          c.globalAlpha = 1;
        }
        // 灯塔扫光透窗，落在地板
        const sweep = Math.max(0, Math.sin(t * 0.42));
        if (sweep > 0.15) {
          const g = c.createLinearGradient(300, 130, 220, 250);
          g.addColorStop(0, `rgba(220,235,250,${0.10 * sweep})`);
          g.addColorStop(1, 'rgba(220,235,250,0)');
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(310, 130); c.lineTo(392, 130);
          c.lineTo(320, 250); c.lineTo(200, 250);
          c.closePath(); c.fill();
        }
      }
    }
  }
};

/* ================================================================
   交互与移动
   ================================================================ */
function tryInteract() {
  if (G.near) { const it = G.near; G.near = null; el.prompt.classList.add('hidden'); it.act(); }
}
function scanInteract() {
  const sc = G.scene;
  let best = null, bd = 1e9;
  for (const it of sc.items) {
    if (it.avail && !it.avail()) continue; // 条件交互点（如低真相才现身的看灯人）
    const dx = it.x - player.x, dy = (it.y - player.y) * 1.6;
    const d = Math.hypot(dx, dy);
    if (d < it.r && d < bd) { bd = d; best = it; }
  }
  G.near = best;
  if (best && G.mode === 'play') {
    el.prompt.textContent = 'E · ' + best.label;
    el.prompt.classList.remove('hidden');
  } else {
    el.prompt.classList.add('hidden');
  }
}
function hitBlock(nx, ny) {
  for (const b of G.scene.blocks) {
    if (b.gone && flag(b.gone)) continue; // 障碍已被剧情移除（如码头缆绳）
    if (nx + 4 > b.x && nx - 4 < b.x + b.w && ny > b.y && ny - 4 < b.y + b.h) return true;
  }
  return false;
}
function updPlayer(dt) {
  const sc = G.scene;
  let dx = 0, dy = 0;
  if (keys.ArrowLeft || keys.KeyA) dx -= 1;
  if (keys.ArrowRight || keys.KeyD) dx += 1;
  if (keys.ArrowUp || keys.KeyW) dy -= 1;
  if (keys.ArrowDown || keys.KeyS) dy += 1;
  player.moving = !!(dx || dy);
  if (player.moving) {
    const sp = 84;
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    const nx = player.x + dx * sp * dt;
    const ny = player.y + dy * sp * 0.55 * dt;
    if (!hitBlock(nx, player.y)) player.x = clamp(nx, 10, sc.w - 10);
    if (!hitBlock(player.x, ny)) player.y = clamp(ny, sc.band[0], sc.band[1]);
    player.ft += dt;
    if (Math.abs(dx) > Math.abs(dy)) player.dir = dx < 0 ? 'left' : 'right';
    else player.dir = dy < 0 ? 'up' : 'down';
  }
  G.cam += (clamp(player.x - VW / 2, 0, Math.max(0, sc.w - VW)) - G.cam) * Math.min(1, dt * 7);
  if (Math.abs(G.cam - Math.round(G.cam)) < 0.3) G.cam = Math.round(G.cam);
  for (const ex of sc.exits) {
    if (ex.need && !flag(ex.need)) continue; // 出口需满足剧情条件
    if (player.x > ex.x && player.x < ex.x + ex.w && player.y > ex.y && player.y < ex.y + ex.h) {
      gotoScene(ex.to, ex.sx, ex.sy, ex.sdir);
      break;
    }
  }
  scanInteract();
}

/* ================================================================
   渲染（每帧仅贴图 + 少量动态元素）
   ================================================================ */
function drawPlayer(c) {
  const band = G.scene.band;
  const k = clamp((player.y - band[0]) / (band[1] - band[0]), 0, 1);
  const s = 1.7 + 0.6 * k;
  const x = player.x - G.cam;
  c.drawImage(shadowCv, Math.round(x - 11), Math.round(player.y - 3), 22, 8);
  let key, flip = false;
  const fr = player.moving ? (Math.floor(player.ft * 7) % 2) : 0;
  if (player.dir === 'up') key = fr ? 'up1' : 'up0';
  else if (player.dir === 'left') key = fr ? 'side1' : 'side0';
  else if (player.dir === 'right') { key = fr ? 'side1' : 'side0'; flip = true; }
  else key = fr ? 'down1' : 'down0';
  const bob = player.moving ? Math.abs(Math.sin(player.ft * 14)) * -1 : 0;
  drawSpr(c, SPR[key], SPR_OL[key], PAL.yan, x, player.y + bob, s, flip);
}
function drawNPC(c, n, t) {
  const x = n.x - G.cam;
  if (x < -30 || x > VW + 30) return;
  const s = n.sit ? 1.7 : 1.9;
  const bob = n.sit ? 3 : Math.round(Math.sin(t * 2 + n.x) * 0.6);
  c.drawImage(shadowCv, Math.round(x - 10), Math.round(n.y - 2), 20, 7);
  drawSpr(c, SPR[n.map], SPR_OL[n.map], PAL[n.pal], x, n.y + bob, s, false);
}
function renderScene() {
  const sc = G.scene, t = G.t;
  const dyn = sc.dyn || {};
  if (sc._far) ctx.drawImage(sc._far, -Math.round(G.cam * 0.22), 0);
  if (dyn.far) dyn.far(ctx, G.cam * 0.22, t);
  if (sc._mid) ctx.drawImage(sc._mid, -Math.round(G.cam * 0.55), 0);
  if (dyn.mid) dyn.mid(ctx, G.cam * 0.55, t);
  if (sc._back) ctx.drawImage(sc._back, -Math.round(G.cam), 0);
  // 实体按 y 排序
  const ents = sc.npcs.slice().sort((a, b) => a.y - b.y);
  let drawnP = false;
  for (const n of ents) {
    if (!drawnP && player.y < n.y) { drawPlayer(ctx); drawnP = true; }
    drawNPC(ctx, n, t);
  }
  if (!drawnP) drawPlayer(ctx);
  if (dyn.back) dyn.back(ctx, G.cam, t);
  if (sc._front) ctx.drawImage(sc._front, -Math.round(G.cam * 1.18), 0);
  if (dyn.front) dyn.front(ctx, G.cam, t);
  if (sc.rain) drawRain(ctx, false);
  drawFog(ctx, !sc.interior);
}

/* ---------------- 开场背景（同样预烘焙） ---------------- */
let introFar = null;
function bakeIntro() {
  introFar = bakeLayer(VW, (c, W) => {
    skyBake(c, VH);
    R(c, 0, 150, W, VH - 150, P.sea);
    R(c, 0, 150, W, 1, P.seaHi);
    hillSteps(c, 330, 168, 130, 3, '#0a1220');
    lighthouseBody(c, 392, 168, 1.5);
    hillSteps(c, -20, 158, 150, 3, P.hillFar);
  }, true);
}
function renderIntroBG() {
  const t = G.t;
  if (!introFar) bakeIntro();
  ctx.drawImage(introFar, 0, 0);
  drawBeam(ctx, 392, 168 - 29 * 1.5, t, 1.5, 190);
  shimmer(ctx, t, 158, 4);
  cloudsDyn(ctx, t);
  drawRain(ctx, true);
  drawFog(ctx, true);
  ctx.fillStyle = 'rgba(4,7,13,.45)';
  ctx.fillRect(0, 0, VW, VH);
}

/* ================================================================
   主循环
   ================================================================ */
let lastTs = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  G.t += dt;
  updRain(dt); updFog(dt);
  switch (G.mode) {
    case 'intro': updIntro(dt); renderIntroBG(); break;
    case 'play': updPlayer(dt); renderScene(); break;
    case 'dialog': updDialog(dt); renderScene(); break;
    case 'letter':
    case 'transition':
      if (G.scene) renderScene(); else renderIntroBG();
      break;
    case 'end': renderIntroBG(); break;
  }
  requestAnimationFrame(loop);
}

el.dialog.addEventListener('click', () => {
  if (G.mode !== 'dialog' || DLG.choices) return;
  if (performance.now() - DLG.openedAt < 180) return;
  advanceDialog();
});
el.intro.addEventListener('click', e => {
  if (e.target === el.iSkip) return;
  initAudio(); advanceIntro();
});
el.letter.addEventListener('click', () => {
  if (G.mode === 'letter' && performance.now() - letterAt > 300) closeLetter();
});

requestAnimationFrame(loop);
setTimeout(() => { el.fade.style.opacity = '0'; }, 200);

/* ================================================================
   触屏适配（虚拟方向键 + E 键）
   ================================================================ */
(function touchSetup() {
  const isTouch = ('ontouchstart' in window) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  if (!isTouch || typeof document === 'undefined' || !document.body) return;
  document.body.classList.add('touch');
  const ui = $('touch-ui');
  if (ui) ui.classList.remove('hidden');
  if (el.ctrl) el.ctrl.textContent = '左侧方向键移动 · 右侧 E 调查';

  const press = (btn, code) => {
    const down = e => {
      e.preventDefault(); initAudio();
      keys[code] = true; btn.classList.add('on'); onKey(code);
    };
    const up = e => {
      e.preventDefault();
      keys[code] = false; btn.classList.remove('on');
    };
    btn.addEventListener('touchstart', down, { passive: false });
    btn.addEventListener('touchend', up, { passive: false });
    btn.addEventListener('touchcancel', up, { passive: false });
    // 鼠标也可点（桌面调试触屏 UI 时）
    btn.addEventListener('mousedown', down);
    btn.addEventListener('mouseup', up);
  };
  document.querySelectorAll('#dpad .tk').forEach(b => press(b, b.dataset.k));
  const act = $('btn-act');
  if (act) press(act, 'KeyE');

  // 幕尾：触屏点击重开
  el.ending && el.ending.addEventListener('click', () => { if (G.mode === 'end') location.reload(); });

  // 首触初始化音频；禁止下拉刷新与双击缩放
  document.addEventListener('touchstart', () => initAudio(), { passive: true });
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());
  let lastTap = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap < 320 && e.target.tagName !== 'BUTTON') e.preventDefault();
    lastTap = now;
  }, { passive: false });
})();

/* ================================================================
   第二幕 · 潮水 —— 信件收集 / 新场景 / 新剧情
   ================================================================ */
PAL.lan = { O: '#0b0d12', H: '#1c1410', S: '#e0b080', E: '#181410', C: '#d8d4c8', A: '#e8e4da', P: '#3a4048', B: '#181410' };

function letterCount() { return 1 + ['letter2', 'letter3', 'letter4', 'letter5'].filter(k => flag(k)).length; }
function refreshLetters() { el.letters.textContent = `信件 ${letterCount()}/5`; }
function gainLetter(id, text, after) {
  openLetter(text, () => { setFlag(id); refreshLetters(); after && after(); });
}

const LETTER2 = "砚：\n\n别信镇志。\n十一人里，没有一个死在海里。\n\n退潮的滩涂上，我见过他们站着，\n朝灯塔看。\n\n　　　　　　　　墨";
const LETTER3 = "砚：\n\n今晚替老周值了一班灯。\n原来灯不是给船看的。\n\n光扫过海面的时候，水下有东西在躲。\n我数了——十一个影子。\n\n　　　　　　　　墨";
const LETTER4 = "砚：\n\n镇上说灯塔二十年没亮过，是谎话。\n每个满月都有人上去点灯，\n只是没人承认。\n\n轮值表刻在塔里的墙上。\n我去看过了。\n\n　　　　　　　　墨";
const LETTER5 = "砚：\n\n油快没了。人，也是。\n\n下一班，轮到我了。\n\n别怕——\n光在，他们在外。\n\n　　　　　　　　墨";

const NEWS_TEXT =
  "【灰礁镇志 · 剪报拼合】\n\n一九九六年十一月十四日，满月。\n渔船「灰鲸号」于外海触礁沉没。\n船上十一人。\n官方结论：全部遇难。\n\n但边栏有一行被墨涂掉的补充——\n「生还者由镇方安置于▇▇▇▇，永不▇▇」\n\n墨迹很新。\n有人在这几年里，又涂过一次。";

function fragCount() { return ['frag1', 'frag2', 'frag3', 'frag4', 'frag5', 'frag6'].filter(k => flag(k)).length; }

function talkLan() {
  if (!flag('metLan')) {
    say([
      { sp: '阿岚', tx: '你就是沈墨的弟弟吧？\n他来做体检的时候，提起过你。' },
      { sp: '沈砚', tx: '我哥……他来过卫生院？' },
      { sp: '阿岚', tx: '三次。长期失眠，耳膜有异常的内陷——\n像是常年贴着某种很低、很低的声音睡觉。' },
      { sp: '阿岚', tx: '（她拉开抽屉，取出一串钥匙和一个信封）\n这些是他落在这儿的。档案室的钥匙……\n他说：「迟早有人会用得上。」' },
      { sp: '沈砚', tx: '（钥匙很新。\n——他是早就配好了，等一个人来。）' },
      { sp: '阿岚', tx: '还有，满月前后，夜里别出门。\n最近走错夜路的人都在发烧说胡话。\n他们喊的，不是亲人的名字。' }
    ], () => {
      setFlag('metLan'); setFlag('hasKey'); modTruth(10);
      setObj('用钥匙打开档案室\n（老街中段 · 钉死的木门）');
      gainLetter('letter2', LETTER2);
    });
    return;
  }
  say([{ sp: '阿岚', tx: '档案室在老街中段。\n看到被涂掉的字，别声张——\n有人不想让纸说话。' }]);
}

function endAct2() {
  fadeTo(() => {
    G.mode = 'end'; G.endKind = 2;
    el.hud.classList.add('hidden');
    el.ctrl.classList.add('hidden');
    el.eTitle.textContent = '第二幕 · 潮水 —— 完';
    el.eStats.innerHTML =
      `真相度 ${G.truth} ／ 镇民信任 ${G.trust} ／ 信件 ${letterCount()}/5<br>` +
      (letterCount() >= 5 ? '五封信拼在一起，隐约是一句话。' : '还有信，散落在镇子的角落里。');
    el.eTeaser.innerHTML = '【满月倒计时：3 天】<br>雾更浓了。海浪声里，隐约有呼唤名字的声音。<br>第三幕 · 满月 —— 空格进入';
    el.eHint.textContent = '空格 进入第三幕 ｜ R 重新开始';
    el.ending.classList.remove('hidden');
    hum();
  });
}

/* ---------------- 第二幕新场景 ---------------- */
Object.assign(SCENES, {

  /* ---------- 卫生院（室内） ---------- */
  clinic: {
    name: '灰礁镇 · 卫生院', w: 560, band: [206, 246], rain: false, interior: true,
    blocks: [
      { x: 60, y: 196, w: 90, h: 14 },
      { x: 190, y: 190, w: 80, h: 12 },
      { x: 430, y: 192, w: 60, h: 14 }
    ],
    exits: [
      { x: 500, y: 240, w: 48, h: 8, to: 'street', sx: 992, sy: 216, sdir: 'down' }
    ],
    items: [
      { id: 'lan', x: 340, y: 218, r: 30, label: '与阿岚交谈', act: talkLan },
      {
        id: 'records', x: 230, y: 212, r: 26, label: '体检记录', act() {
          once('records', 10);
          say([{ tx: '沈墨的体检记录：\n【长期失眠】【神经性耳鸣】【耳膜异常内陷】\n医生批注：「患者自述夜里能听见海在叫人。」' },
          { sp: '沈砚', tx: '（海在叫人……\n哥，你最后那几个月，到底听见了什么？）' }]);
        }
      },
      {
        id: 'cabinet', x: 460, y: 214, r: 24, label: '药柜', act() {
          say([{ tx: '玻璃药柜里，退烧药那一格空了一大半。\n最近镇上说胡话的病人，太多了。' }]);
        }
      }
    ],
    npcs: [
      { x: 340, y: 220, map: 'zhou', pal: 'lan' }
    ],
    bake: {
      far(c, W) { R(c, 0, 0, W, VH, '#0e0d12'); },
      mid(c, W) { },
      back(c, W) {
        // 白墙瓷砖 + 浅色地板（卫生院比民居亮）
        tileGround(c, 0, 0, W, 196, { base: '#41454e', top: '#565b64', dark: '#2e323a', speck: '#60656e', seed: 71 });
        R(c, 0, 150, W, 3, '#2c3038');
        tileGround(c, 0, 196, W, 74, { base: '#4a4e57', top: '#62676f', dark: '#34383f', speck: '#6e737c', seed: 83 });
        // 病床 ×2（白床单）
        for (const bx of [60, 130]) { }
        R(c, 60, 186, 90, 10, '#5a4632');
        R(c, 60, 186, 90, 3, '#6e5940');
        R(c, 64, 196, 82, 14, '#d8d8d0');
        R(c, 64, 196, 82, 3, '#ecece4');
        R(c, 70, 190, 22, 8, '#f0f0e8');
        R(c, 64, 210, 5, 6, '#3a2f22');
        R(c, 141, 210, 5, 6, '#3a2f22');
        // 问诊桌
        R(c, 190, 188, 80, 6, '#5a4632');
        R(c, 190, 188, 80, 2, '#6e5940');
        R(c, 194, 194, 6, 20, '#3a2f22');
        R(c, 260, 194, 6, 20, '#3a2f22');
        R(c, 210, 180, 20, 8, '#c4b896'); // 体检记录
        R(c, 212, 182, 16, 2, '#8f887a');
        // 药柜
        R(c, 430, 120, 60, 76, '#4e525a');
        R(c, 430, 120, 60, 3, '#646a74');
        R(c, 434, 126, 52, 30, 'rgba(150,180,200,.16)');
        R(c, 434, 160, 52, 30, 'rgba(150,180,200,.10)');
        R(c, 436, 130, 8, 12, '#8a4a4a'); R(c, 448, 130, 8, 12, '#4a6a8a');
        R(c, 460, 130, 8, 12, '#6a8a4a'); R(c, 472, 130, 8, 12, '#8a4a4a');
        // 红十字
        R(c, 452, 104, 16, 5, '#d84a4a'); R(c, 457, 99, 6, 15, '#d84a4a');
        // 窗 + 百叶
        R(c, 300, 52, 90, 70, '#101318');
        R(c, 304, 56, 82, 62, '#0a1420');
        for (let i = 0; i < 5; i++) R(c, 304, 60 + i * 12, 82, 4, '#2c3038');
        // 日光灯管
        R(c, 220, 8, 120, 5, '#d8dee6');
        R(c, 214, 6, 132, 2, '#3a3f47');
        // 卫生宣传画
        R(c, 500, 60, 34, 44, '#c4b896');
        R(c, 504, 66, 26, 4, '#4a4438');
        R(c, 504, 76, 26, 1, '#6a6250'); R(c, 504, 82, 20, 1, '#6a6250'); R(c, 504, 88, 24, 1, '#6a6250');
        // 出口门垫
        R(c, 504, 242, 42, 6, '#5a6a5a');
      },
      front(c, W) { }
    },
    dyn: {
      back(c, pc, t) {
        // 日光灯偶尔闪烁
        if (Math.random() < 0.02) {
          R(c, 0, 0, VW, VH, 'rgba(10,10,16,.18)');
        }
        // 窗外雨痕
        c.strokeStyle = 'rgba(150,175,195,.25)'; c.lineWidth = 1; c.beginPath();
        for (let i = 0; i < 6; i++) {
          const rx = 308 + ((i * 41 + t * 30) % 74);
          const ry = 58 + ((i * 47 + t * 55) % 54);
          c.moveTo(rx, ry); c.lineTo(rx + 1, ry + 6);
        }
        c.stroke();
      }
    }
  },

  /* ---------- 档案室（室内 · 拼报解谜） ---------- */
  archiveIn: {
    name: '灰礁镇 · 档案室', w: 720, band: [206, 246], rain: false, interior: true,
    blocks: [
      { x: 300, y: 196, w: 120, h: 14 },
      { x: 560, y: 192, w: 70, h: 14 },
      { x: 60, y: 192, w: 90, h: 12 }
    ],
    exits: [
      { x: 660, y: 240, w: 48, h: 8, to: 'street', sx: 590, sy: 216, sdir: 'down' }
    ],
    items: [
      { id: 'frag1', x: 180, y: 230, r: 20, label: '报纸碎片', act: pickFrag },
      { id: 'frag2', x: 250, y: 212, r: 20, label: '报纸碎片', act: pickFrag },
      { id: 'frag3', x: 350, y: 238, r: 20, label: '报纸碎片', act: pickFrag },
      { id: 'frag4', x: 470, y: 214, r: 20, label: '报纸碎片', act: pickFrag },
      { id: 'frag5', x: 540, y: 238, r: 20, label: '报纸碎片', act: pickFrag },
      { id: 'frag6', x: 640, y: 220, r: 20, label: '报纸碎片', act: pickFrag },
      {
        id: 'longtable', x: 360, y: 224, r: 38, label: '长桌', act() {
          const n = fragCount();
          if (flag('archiveDone')) {
            say([{ tx: '拼好的剪报静静躺在桌上。\n被涂掉的那行字，你已经看过了。' }]);
            return;
          }
          if (n < 6) {
            say([{ tx: `长桌上摊着镇志的残页。\n报纸碎片还不够（${n}/6）——再找找。` }]);
            return;
          }
          say([{ tx: '你把六张碎片铺在长桌上，按年月对齐……\n一幅不该存在的全貌，慢慢显形。' }],
            () => openLetter(NEWS_TEXT, () => {
              setFlag('archiveDone'); modTruth(15);
              setObj('从码头尽头去海岬灯塔\n（挡路的缆绳，可以剪开了）');
            }));
        }
      },
      {
        id: 'drawer', x: 596, y: 214, r: 26, label: '铁皮抽屉', act() {
          if (flag('letter3')) { say([{ tx: '抽屉空了。' }]); return; }
          say([{ tx: '铁皮抽屉没锁。最底层压着一摞旧档案——\n和一个没有寄出的信封。' }], () => gainLetter('letter3', LETTER3));
        }
      }
    ],
    npcs: [],
    onEnter() {
      if (!flag('archiveDone') && fragCount() < 6) setObj('在档案室里找到 6 张报纸碎片');
    },
    bake: {
      far(c, W) { R(c, 0, 0, W, VH, '#0c0a0e'); },
      mid(c, W) { },
      back(c, W) {
        tileGround(c, 0, 0, W, 196, { base: '#2a2420', top: '#3c342c', dark: '#1c1815', speck: '#463c30', seed: 91 });
        R(c, 0, 150, W, 3, '#1a1512');
        tileGround(c, 0, 196, W, 74, { base: '#3a2f24', top: '#524334', dark: '#282018', speck: '#5f4e3c', seed: 97 });
        // 档案架（左）
        R(c, 60, 60, 90, 136, '#241c14');
        for (let r = 0; r < 4; r++) {
          R(c, 64, 66 + r * 32, 82, 26, '#14100c');
          for (let i = 0; i < 5; i++) R(c, 67 + i * 16, 68 + r * 32, 12, 22, ['#4a3f30', '#3f3628', '#524534'][(i + r) % 3]);
        }
        // 档案架（右后）
        R(c, 470, 52, 200, 60, '#241c14');
        for (let i = 0; i < 11; i++) R(c, 474 + i * 17, 56, 13, 50, ['#4a3f30', '#3f3628'][i % 2]);
        // 钉死的窗
        R(c, 220, 60, 70, 56, '#101318');
        R(c, 214, 62, 82, 8, '#4a3a28'); R(c, 214, 96, 82, 8, '#4a3a28');
        R(c, 248, 56, 8, 66, '#4a3a28');
        // 长桌
        R(c, 300, 186, 120, 10, '#4a3826');
        R(c, 300, 186, 120, 3, '#5f4a33');
        R(c, 306, 196, 8, 18, '#2e2318');
        R(c, 406, 196, 8, 18, '#2e2318');
        // 铁皮抽屉
        R(c, 560, 130, 70, 66, '#3f434c');
        R(c, 560, 130, 70, 3, '#565b64');
        for (let i = 0; i < 3; i++) { R(c, 566, 138 + i * 20, 58, 14, '#33363e'); R(c, 590, 144 + i * 20, 10, 2, '#62676f'); }
        // 蛛网
        c.strokeStyle = 'rgba(180,185,195,.25)'; c.lineWidth = 1; c.beginPath();
        c.moveTo(160, 40); c.lineTo(190, 70); c.moveTo(190, 40); c.lineTo(160, 70);
        c.moveTo(175, 40); c.lineTo(175, 70); c.moveTo(160, 55); c.lineTo(190, 55);
        c.stroke();
        // 吊灯
        R(c, 355, 0, 2, 20, '#1a1512');
        R(c, 348, 20, 16, 6, '#3a3025');
        // 出口门垫
        R(c, 664, 242, 42, 6, '#4a3f30');
      },
      front(c, W) { }
    },
    dyn: {
      back(c, pc, t) {
        // 未拾取的碎片（发黄纸片）
        for (const fr of SCENES.archiveIn.items) {
          if (!fr.id.startsWith('frag') || flag(fr.id)) continue;
          R(c, fr.x - 3 - pc, fr.y - 12, 7, 9, '#c4b896');
          R(c, fr.x - 3 - pc, fr.y - 12, 7, 2, '#d8cca8');
        }
        // 吊灯昏光
        const a = 0.5 + 0.2 * Math.sin(t * 3);
        c.globalAlpha = a * 0.7;
        c.drawImage(coneCv, 356 - 24 - pc, 26, 48, 90);
        c.globalAlpha = 1;
        // 浮尘
        for (let i = 0; i < 8; i++) {
          const dx = (i * 97 + t * 6) % VW;
          const dy = 60 + ((i * 53 + t * 3) % 160);
          R(c, dx, dy, 1, 1, 'rgba(200,190,170,.25)');
        }
      }
    }
  },

  /* ---------- 海岬（灯塔外景） ---------- */
  cape: {
    name: '灰礁镇 · 海岬', w: 900, band: [200, 240], rain: true,
    blocks: [
      { x: 668, y: 190, w: 64, h: 20 },
      { x: 200, y: 196, w: 40, h: 12 },
      { x: 480, y: 196, w: 30, h: 10 }
    ],
    exits: [
      { x: 0, y: 200, w: 12, h: 40, to: 'pier', sx: 1052, sy: 222, sdir: 'left' }
    ],
    items: [
      {
        id: 'capeSign', x: 250, y: 212, r: 26, label: '警示牌', act() {
          say([{ tx: '「海岬危险 · 满月期间禁止靠近」\n落款不是镇政府，是一只按上去的黑色手印。' },
          { sp: '沈砚', tx: '（手印很小。像是孩子的。）' }]);
        }
      },
      {
        id: 'letter5', x: 640, y: 226, r: 24, label: '石缝里的信封', act() {
          if (flag('letter5')) { say([{ tx: '石缝里只剩潮湿的风。' }]); return; }
          say([{ tx: '塔基的石缝里塞着一个信封，\n被一块小石头仔细压着，没被雨打湿。' }], () => gainLetter('letter5', LETTER5));
        }
      },
      {
        id: 'towerDoor', x: 700, y: 214, r: 30, label: '灯塔大门', act() {
          say([{ tx: '铁门虚掩着，门轴上的锈被人新近磨掉过。\n——最近，有人经常进出这里。' }], () => gotoScene('tower', 240, 238, 'up'));
        }
      }
    ],
    npcs: [],
    onEnter() {
      if (G.act === 3) setObj('塔顶 · 满月\n（灯室里，油灯将尽）');
      else setObj('登上灯塔看看\n（门虚掩着）');
    },
    bake: {
      far(c, W) {
        skyBake(c, 150);
        R(c, 0, 108, W, 44, P.sea);
        R(c, 0, 108, W, 1, P.seaHi);
        hillSteps(c, -40, 108, 180, 4, P.hillFar);
      },
      mid(c, W) {
        deadTree(c, 140, 190, 1.2, P.tree);
        deadTree(c, 420, 190, 1, P.tree);
        hillSteps(c, 560, 192, 200, 4, '#0c1420');
      },
      back(c, W) {
        tileGround(c, 0, 190, W, 80, { base: '#2f3236', top: '#464a50', dark: '#202328', speck: '#54585e', moss: P.moss, seed: 57 });
        // 礁石
        R(c, 190, 186, 60, 20, '#26292e'); R(c, 196, 182, 40, 8, '#31353a');
        R(c, 470, 188, 50, 16, '#26292e'); R(c, 478, 184, 30, 6, '#31353a');
        // 灯塔（近景大塔）
        lighthouseBody(c, 700, 210, 2.6);
        R(c, 660, 206, 80, 8, '#26292e');
        R(c, 668, 198, 64, 10, '#31353a');
        // 铁门（虚掩）
        R(c, 692, 190, 16, 22, '#1a2028');
        R(c, 696, 192, 10, 20, '#0a0e14');
        // 警示牌
        R(c, 246, 176, 6, 30, '#3a2f22');
        R(c, 232, 162, 36, 18, '#4a4438');
        R(c, 234, 165, 32, 3, '#a83a3a');
        R(c, 234, 171, 26, 2, '#c4b896');
        // 栅栏残段
        for (const fx of [100, 130, 340, 370]) R(c, fx, 186, 4, 18, '#2c241c');
        R(c, 96, 190, 42, 3, '#2c241c');
        R(c, 336, 190, 42, 3, '#2c241c');
        // 草簇
        const r = srand(77);
        for (let i = 0; i < 26; i++) {
          const gx = r() * W, gy = 196 + r() * 40;
          R(c, gx, gy, 2, 4 + r() * 4, '#3d4a3a');
        }
      },
      front(c, W) {
        R(c, W - 40, VH - 20, 5, 20, '#05090f');
        R(c, 60, VH - 14, 4, 14, '#05090f');
      }
    },
    dyn: {
      far(c, pc, t) {
        if (G.act === 3) drawMoonFar(c, t);
        shimmer(c, t, 114, 3);
        cloudsDyn(c, t * 1.6);
      },
      back(c, pc, t) {
        // 头顶扫过的强光束（离光源很近）
        drawBeam(c, 700 - pc, 210 - 29 * 2.6, t, 2.2, 320);
        // 满月夜，崖边立着一道身影
        if (G.act === 3 && G.truth < TRUTH_HIGH) drawWatcher(c, 830 - pc, 200, t);
        // 崖底浪
        for (const x of [40, 560]) {
          const sp = Math.max(0, Math.sin(t * 1.8 + x));
          if (sp > 0.55) {
            R(c, x - pc, 236, 4, 3, `rgba(190,215,230,${(sp - 0.55) * 1.6})`);
            R(c, x + 10 - pc, 242, 3, 2, `rgba(190,215,230,${(sp - 0.55) * 1.3})`);
          }
        }
      }
    }
  },

  /* ---------- 灯塔内部（轮值表） ---------- */
  tower: {
    name: '灯塔 · 塔内', w: 480, band: [206, 246], rain: false, interior: true,
    blocks: [
      { x: 330, y: 196, w: 90, h: 16 },
      { x: 40, y: 196, w: 60, h: 12 }
    ],
    exits: [
      { x: 214, y: 240, w: 52, h: 8, to: 'cape', sx: 700, sy: 228, sdir: 'down' }
    ],
    items: [
      {
        id: 'roster', x: 250, y: 214, r: 34, label: '墙上的刻痕', act() {
          if (flag('rosterRead')) { say([{ tx: '「沈墨 —— 永久」。\n那四个字，你看了一遍又一遍。' }]); return; }
          say([
            { tx: '石墙上的刻痕层层叠叠——\n是守灯人的轮值表：\n「1963 周阿福」「1971 周阿福」「1981 吴守义」……' },
            { tx: '最新的一栏，刻痕还很新，\n连石粉都没来得及落尽：\n\n「沈墨 —— 永久」' },
            { sp: '沈砚', tx: '（永久。\n原来哥哥不是失踪了。\n——他是去值班了。）' }
          ], () => { setFlag('rosterRead'); modTruth(10); endAct2(); });
        }
      },
      {
        id: 'stairs', x: 376, y: 218, r: 28, label: '旋梯', act() {
          if (G.act >= 3) { gotoScene('top', 100, 238, 'right'); return; }
          say([{ tx: '旋梯向上，没入漆黑。\n潮湿的空气里有一股很淡的灯油味。' },
          { sp: '沈砚', tx: '（上面还亮着吗……\n满月那天，答案自然会来。）' },
          { tx: '【塔顶将在第三幕开启】' }]);
        }
      }
    ],
    npcs: [],
    bake: {
      far(c, W) { R(c, 0, 0, W, VH, '#08070c'); },
      mid(c, W) { },
      back(c, W) {
        // 弧形石墙（深色砖 + 两侧收黑暗示圆筒）
        tileGround(c, 0, 0, W, 196, { base: '#241f28', top: '#342c38', dark: '#171319', speck: '#3e3642', seed: 113 });
        R(c, 0, 0, 60, VH, 'rgba(0,0,0,.4)');
        R(c, W - 60, 0, 60, VH, 'rgba(0,0,0,.4)');
        tileGround(c, 0, 196, W, 74, { base: '#2c2730', top: '#403844', dark: '#1c181f', speck: '#484050', seed: 127 });
        // 旋梯（向右上升入黑暗）
        for (let i = 0; i < 7; i++) {
          R(c, 330 + i * 12, 190 - i * 16, 26, 8, '#342c38');
          R(c, 330 + i * 12, 190 - i * 16, 26, 2, '#4a4050');
        }
        R(c, 380, 40, 100, 80, 'rgba(0,0,0,.55)');
        // 刻痕墙（轮值表）
        R(c, 150, 60, 200, 110, '#2c2730');
        R(c, 150, 60, 200, 3, '#3e3642');
        const names = ['1955 陈', '1963 周阿福', '1971 周阿福', '1981 吴守义', '1989 吴守义', '1997 ——'];
        names.forEach((n, i) => {
          txt(c, n, 164, 72 + i * 13, '#6a6258', 8);
          R(c, 158, 74 + i * 13, 3, 3, '#565048');
        });
        txt(c, '沈墨 —— 永久', 164, 72 + 6 * 13, '#c05050', 9);
        R(c, 158, 74 + 6 * 13, 3, 3, '#c05050');
        // 空油灯
        R(c, 60, 186, 20, 10, '#4a4438');
        R(c, 66, 176, 8, 12, '#8a8578');
        R(c, 60, 186, 20, 2, '#6a6250');
        // 门垫
        R(c, 218, 242, 44, 6, '#3a3240');
      },
      front(c, W) { }
    },
    dyn: {
      back(c, pc, t) {
        // 顶部漏下的一线天光，随塔顶光束明灭
        const sweep = Math.max(0, Math.sin(t * 0.42));
        if (sweep > 0.3) {
          R(c, 396, 40, 10, 150, `rgba(220,235,250,${0.05 * sweep})`);
        }
        // 浮尘
        for (let i = 0; i < 6; i++) {
          const dx = (i * 131 + t * 5) % VW;
          const dy = 50 + ((i * 67 + t * 4) % 170);
          R(c, dx, dy, 1, 1, 'rgba(190,185,200,.22)');
        }
      }
    }
  }
});

function pickFrag() {
  if (flag(this.id)) return;
  setFlag(this.id); modTruth(2);
  const n = fragCount();
  say([{ tx: `（捡起一张发黄的报纸碎片。${n}/6）\n纸边有烧过的痕迹。` }]);
  if (n >= 6) setObj('去长桌上拼合剪报');
}

/* ================================================================
   第三幕 · 满月 —— 终局抉择与四结局
   ================================================================ */
const TRUTH_HIGH = 80; // 真相度阈值：低于此值，「看灯人」会现身

function startAct3() {
  G.act = 3; G.endKind = 0;
  G.visited = {};
  G.mode = 'transition';
  fadeTo(() => {
    el.ending.classList.add('hidden');
    el.hud.classList.remove('hidden');
    el.ctrl.classList.remove('hidden');
    loadScene('street', 810, 218, 'down');
    if (G.mode === 'transition') G.mode = 'play';
    say([
      { sp: '沈砚', tx: '（雾浓得化不开。\n满月挂在海岬上方，大得反常。）' },
      { sp: '沈砚', tx: '（海浪声里，那个呼唤名字的声音……\n越来越清晰了。）' },
      { tx: '今晚，一切都会有个了断。' }
    ]);
  });
}

// 满月（远景）
function drawMoonFar(c, t) {
  const g = c.createRadialGradient(380, 42, 8, 380, 42, 62);
  g.addColorStop(0, 'rgba(232,228,212,.30)'); g.addColorStop(1, 'rgba(232,228,212,0)');
  c.fillStyle = g; c.fillRect(318, 0, 124, 110);
  c.fillStyle = '#e8e4d4';
  c.beginPath(); c.arc(380, 42, 18, 0, Math.PI * 2); c.fill();
  R(c, 372, 36, 4, 3, '#d0ccbc'); R(c, 382, 46, 5, 4, '#d0ccbc'); R(c, 376, 50, 3, 2, '#d8d4c4');
}
// 看灯人（半透明身影）
function drawWatcher(c, x, y, t) {
  const a = 0.45 + 0.16 * Math.sin(t * 1.3);
  c.globalAlpha = a;
  R(c, x - 4, y - 26, 8, 26, '#0a0d14');
  R(c, x - 5, y - 14, 10, 4, '#0a0d14');
  R(c, x - 3, y - 32, 6, 7, '#0a0d14');
  R(c, x - 2, y - 30, 4, 4, '#d4d8e0');
  c.globalAlpha = Math.max(0, a - 0.1);
  R(c, x - 1, y - 29, 1, 1, '#f0f4fa'); R(c, x + 1, y - 29, 1, 1, '#f0f4fa');
  c.globalAlpha = 1;
}

/* ---------------- 结局 ---------------- */
const ENDINGS = {
  A: {
    title: '结局 A ·《守灯人》',
    text: '你添满了油。光柱刺破雾墙，海面重新安静下来。<br>镇子继续做着它安宁的梦——而你，再没离开灰礁。<br>多年后，轮值表上会多一行新的刻痕：<br>「沈砚 —— 永久」'
  },
  B: {
    title: '结局 B ·《退潮》',
    text: '你拧熄了灯。黑暗里，潮水退得很远、很远。<br>第二天清晨，滩涂上摆满了遗物：<br>十一双鞋，和一只铜哨。<br>镇子不得不开口，说出真相。<br>你带着哥哥的故事，离开了灰礁。'
  },
  C: {
    title: '结局 C ·《看灯人》',
    text: '你走向那道身影。雾，散开一条缝——<br>是哥哥的脸。又，不再是。<br>「别怕。」他说，「光里很暖和。」<br>从此，每个满月，塔上都有两盏灯。'
  },
  D: {
    title: '隐藏结局 D ·《灰礁》',
    text: '五封信，在灯油里浸透。<br>你把它们，连同二十年的谎言，一起点燃。<br>火光里，海与镇，各自安息。<br>从此，地图上再也没有灰礁镇。'
  }
};
function endGame(kind) {
  const E = ENDINGS[kind];
  fadeTo(() => {
    G.mode = 'end'; G.endKind = 3;
    el.hud.classList.add('hidden');
    el.ctrl.classList.add('hidden');
    el.eTitle.textContent = E.title;
    el.eStats.innerHTML = `真相度 ${G.truth} ／ 镇民信任 ${G.trust} ／ 信件 ${letterCount()}/5`;
    el.eTeaser.innerHTML = E.text + '<br><br>—— 全剧终 ——';
    el.eHint.textContent = '按 R 重新开始';
    el.ending.classList.remove('hidden');
    hum();
  });
}

function finalChoice() {
  const chs = [
    {
      t: '添满灯油 —— 继续守灯', fn: () => { G.pendingEnd = 'A'; }, then: [
        { tx: '你提起油壶，手很稳。\n火苗窜起的那一刻，光柱刺破雾墙。\n海面，重新安静下来。' }
      ]
    },
    {
      t: '拧熄它 —— 让真相上岸', fn: () => { G.pendingEnd = 'B'; }, then: [
        { tx: '你拧动灯阀。\n火苗挣扎了一下，熄了。\n黑暗里，潮水开始退——退得很远、很远。' }
      ]
    }
  ];
  if (letterCount() >= 5) chs.push({
    t: '把五封信浸进灯油 —— 一起烧了', fn: () => { G.pendingEnd = 'D'; }, then: [
      { tx: '五封信，在灯油里浸透。\n你把它们，连同二十年的谎言，一起点燃。\n火光，比灯塔亮得多。' }
    ]
  });
  say([
    { tx: '油灯将尽，灯芯噼啪作响。\n窗外，满月把海面照成一面银镜。' },
    { sp: '沈砚', tx: '（光在，他们在外。光灭，他们回家。\n哥——这一次，换我来选。）', ch: chs }
  ], () => endGame(G.pendingEnd || 'A'));
}

/* ---------------- 灯塔顶层 · 灯室 ---------------- */
Object.assign(SCENES, {
  top: {
    name: '灯塔 · 顶层灯室', w: 480, band: [206, 246], rain: false, interior: true,
    blocks: [
      { x: 210, y: 190, w: 60, h: 16 },
      { x: 36, y: 196, w: 70, h: 12 }
    ],
    exits: [
      { x: 52, y: 240, w: 44, h: 8, to: 'tower', sx: 240, sy: 232, sdir: 'down' }
    ],
    items: [
      { id: 'lamp', x: 240, y: 214, r: 38, label: '油灯', act: finalChoice },
      {
        id: 'window', x: 120, y: 212, r: 26, label: '瞭望窗', act() {
          say([{ tx: '玻璃上结着盐霜。\n海面在满月下泛着不自然的银光——\n像是水下，也有一个月亮。' }]);
        }
      },
      {
        id: 'watcherTop', x: 352, y: 212, r: 32, label: '那道身影',
        avail() { return G.truth < TRUTH_HIGH; },
        act() {
          say([
            { tx: '你站在光与雾的交界。\n那道身影也在看你——隔着一层玻璃。' },
            { sp: '???', tx: '「……砚。」' },
            { sp: '沈砚', tx: '（这个声音。\n这个声音，我找了整整三个月。）' }
          ], () => endGame('C'));
        }
      }
    ],
    npcs: [],
    onEnter() {
      say([
        { tx: '满月悬在海平线上方，\n把整个世界照成一张黑白的照片。' },
        { sp: '沈砚', tx: '（油灯快熄了。\n今晚，必须有人做出决定。）' }
      ]);
    },
    bake: {
      far(c, W) { R(c, 0, 0, W, VH, '#06070c'); },
      mid(c, W) { },
      back(c, W) {
        // 环形玻璃幕墙：夜空 + 满月 + 银色海面
        const g = c.createLinearGradient(0, 40, 0, 150);
        g.addColorStop(0, '#0a0e1e'); g.addColorStop(0.7, '#16283a'); g.addColorStop(1, '#1d3644');
        c.fillStyle = g; c.fillRect(0, 40, W, 110);
        // 满月 + 光晕（烘焙）
        const mg = c.createRadialGradient(340, 78, 6, 340, 78, 54);
        mg.addColorStop(0, 'rgba(240,236,220,.5)'); mg.addColorStop(1, 'rgba(240,236,220,0)');
        c.fillStyle = mg; c.fillRect(280, 20, 120, 116);
        c.fillStyle = '#ece8d8';
        c.beginPath(); c.arc(340, 78, 16, 0, Math.PI * 2); c.fill();
        R(c, 334, 73, 3, 2, '#d4d0c0'); R(c, 343, 81, 4, 3, '#d4d0c0');
        // 银色海面
        R(c, 0, 118, W, 32, '#16283a');
        R(c, 0, 118, W, 1, '#8a9aaa');
        for (let i = 0; i < 8; i++) R(c, 320 + (i % 3) * 12 - 8, 124 + i * 3, 26 - i * 2, 1, 'rgba(220,228,238,.35)');
        // 窗框立柱
        for (let x = 0; x <= W; x += 40) { R(c, x, 40, 4, 110, '#1a1512'); R(c, x, 40, 1, 110, '#3d3022'); }
        R(c, 0, 40, W, 6, '#241c14'); R(c, 0, 144, W, 6, '#241c14');
        R(c, 0, 40, W, 2, '#4a3a28'); R(c, 0, 144, W, 2, '#4a3a28');
        // 石墙（上下收边）
        tileGround(c, 0, 0, W, 40, { base: '#241f28', top: '#342c38', dark: '#171319', speck: '#3e3642', seed: 131 });
        tileGround(c, 0, 150, W, 46, { base: '#241f28', top: '#342c38', dark: '#171319', speck: '#3e3642', seed: 137 });
        // 金属地板
        tileGround(c, 0, 196, W, 74, { base: '#2c3038', top: '#454a54', dark: '#1e2126', speck: '#50565f', seed: 139 });
        for (let x = 0; x < W; x += 32) R(c, x, 196, 2, 74, 'rgba(0,0,0,.25)');
        // 中央灯座
        R(c, 216, 182, 48, 16, '#3a2f22');
        R(c, 216, 182, 48, 3, '#524334');
        R(c, 226, 158, 28, 26, '#6a5a30');       // 黄铜灯身
        R(c, 226, 158, 28, 3, '#8a7640');
        R(c, 232, 146, 16, 14, 'rgba(200,215,225,.25)'); // 玻璃灯罩
        R(c, 230, 144, 20, 3, '#524334');
        // 旋梯口（左下黑洞）
        R(c, 36, 190, 70, 12, '#0a080c');
        R(c, 36, 190, 70, 2, '#342c38');
        R(c, 40, 178, 4, 14, '#3a3240');
        R(c, 100, 178, 4, 14, '#3a3240');
        R(c, 40, 178, 64, 3, '#4a4050');
        // 门垫
        R(c, 56, 242, 40, 6, '#3a3240');
      },
      front(c, W) { }
    },
    dyn: {
      back(c, pc, t) {
        // 将尽的火苗
        const fl = Math.sin(t * 9) * 0.5 + Math.sin(t * 23) * 0.5;
        R(c, 238, 140 + (fl > 0 ? -1 : 0), 4, 6, `rgba(232,150,60,${0.75 + fl * 0.2})`);
        R(c, 239, 138, 2, 3, `rgba(248,220,150,${0.8 + fl * 0.2})`);
        c.globalAlpha = 0.25 + fl * 0.08;
        c.drawImage(lampGlowCv, 228, 128, 24, 24);
        c.globalAlpha = 1;
        // 月光洒在地板上的银斑（缓缓移动）
        const sway = Math.sin(t * 0.3) * 8;
        R(c, 300 + sway, 210, 60, 3, 'rgba(200,214,228,.10)');
        R(c, 320 + sway, 222, 40, 2, 'rgba(200,214,228,.08)');
        // 低真相：玻璃外的看灯人
        if (G.truth < TRUTH_HIGH) drawWatcher(c, 352, 146, t);
      }
    }
  }
});
