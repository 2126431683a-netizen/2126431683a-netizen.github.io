(function () {
  'use strict';

  /* ============================================================
     hero-gl —— WebGL2 多通道 shader Hero（仿 Moonshot AI 官网首屏）
     13 层效果 + 鼠标联动（逐层 trackMouse / mouseMomentum 状态机）
     + 大字作为效果载体。PingPong FBO 链，requestAnimationFrame 驱动。
     仅 index 首页加载；scene 0 不在前台时自动挂起渲染。
     本页文案载体用 CHY.GALAXY（站点品牌），其余中文文案在 HTML 层。
     ============================================================ */

  var canvas = document.getElementById('hero-gl');
  if (!canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = 1.5;                                  // 性能目标：1.5x

  var gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance'
  });
  if (!gl) { canvas.classList.add('hero-gl-fallback'); return; }

  /* ---------------- 基础：全屏三角形 + VAO ---------------- */
  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.DEPTH_TEST);

  var VERT = '#version 300 es\n' +
    'layout(location=0) in vec2 aPos;\n' +
    'out vec2 vUv;\n' +
    'void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('shader error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function program(fragSrc) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('link error:', gl.getProgramInfoLog(p));
      return null;
    }
    var uni = {};
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var info = gl.getActiveUniform(p, i);
      uni[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name);
    }
    return { p: p, u: uni };
  }

  var NOISE_H = function () {
    return 'float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
      'float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);\n' +
      '  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }\n';
  }();

  /* ---------------- 13 层 shader（按渲染顺序） ---------------- */
  var gradH = '#version 300 es\nprecision highp float;\nout vec4 outColor;\n' +
    'uniform vec2 u_res; uniform float u_time;\n' +
    'void main(){ vec2 uv=gl_FragCoord.xy/u_res; vec2 c=uv-0.5; float r=length(c);\n' +
    ' vec3 dark=vec3(0.012,0.02,0.045); vec3 mid=vec3(0.05,0.08,0.16);\n' +
    ' vec3 col=mix(dark,mid,smoothstep(0.02,0.8,r));\n' +
    ' col+=vec3(0.04,0.08,0.22)*smoothstep(0.7,0.0,r)*0.8;\n' +
    ' col*=smoothstep(1.2,0.35,r);\n' +
    ' outColor=vec4(col,1.0); }';

  var fbmH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex; uniform float u_time;\n' + NOISE_H +
    'float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5;} return v; }\n' +
    'void main(){ vec3 base=texture(u_tex,vUv).rgb;\n' +
    ' float n=fbm(vUv*2.4 + vec2(u_time*0.05,u_time*0.03));\n' +
    ' base += pow(n,3.0)*vec3(0.10,0.16,0.30)*0.55;\n' +
    ' outColor=vec4(base,1.0); }';

  var replicateH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex; uniform float u_time;\n' +
    'void main(){ vec2 base=vUv;\n' +
    ' vec2 t1=fract(base*1.6 + vec2(0.0,-u_time*0.045));\n' +
    ' vec3 a=texture(u_tex,base).rgb; vec3 b=texture(u_tex,t1).rgb;\n' +
    ' outColor=vec4(mix(a,b,0.16),1.0); }';

  var voronoiH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex; uniform vec2 u_mouse; uniform float u_time;\n' + NOISE_H +
    'void main(){ vec2 base=vUv;\n' +
    ' vec2 p=base*5.0 + u_mouse*vec2(2.4) + vec2(0.0, u_time*0.06);\n' +
    ' vec2 ip=floor(p), fp=fract(p); float d1=8.0,d2=8.0; vec2 id1=ip;\n' +
    ' for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){\n' +
    '   vec2 g=vec2(float(x),float(y)); vec2 o=vec2(g);\n' +
    '   vec2 r=g + 0.5 + vec2(h21(ip+g)*0.62-0.31, h21(ip+g+vec2(37.0,17.0))*0.62-0.31) - fp;\n' +
    '   float dd=dot(r,r); if(dd<d1){ d2=d1; d1=dd; id1=ip+g; o=r; } else if(dd<d2){ d2=dd; } }\n' +
    ' float edge=sqrt(d2)-sqrt(d1);\n' +
    ' vec2 disp = (id1+0.5-p)*0.16 + (vec2(h21(id1),h21(id1+vec2(11.0,7.0)))-0.5)*0.10;\n' +
    ' vec3 col=texture(u_tex, base+disp*0.5+u_mouse*0.014).rgb;\n' +
    ' col += smoothstep(0.16,0.02,edge)*vec3(0.30,0.48,0.85)*0.10;\n' +
    ' outColor=vec4(col,1.0); }';

  var liquifyH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex; uniform vec2 u_mouse; uniform float u_time;\n' +
    'void main(){ vec2 q=vUv-(0.5+u_mouse*0.7); float r=length(q);\n' +
    ' float a=sin(r*24.0-u_time*1.9)*exp(-r*3.4)*0.055;\n' +
    ' vec2 off=normalize(vec2(-q.y,q.x)+vec2(1e-5))*a;\n' +
    ' vec3 col=texture(u_tex, vUv+off).rgb;\n' +
    ' col += max(0.0,a)*vec3(0.08,0.14,0.30);\n' +
    ' outColor=vec4(col,1.0); }';

  var godraysH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex; uniform vec2 u_res; uniform vec2 u_mouse; uniform float u_time;\n' +
    'void main(){ vec2 uv=gl_FragCoord.xy/u_res; vec2 c=0.5+u_mouse*0.55; vec2 d=uv-c;\n' +
    ' float ang=atan(d.y,d.x); float r=length(d);\n' +
    ' float rays=0.5+0.5*sin(ang*9.0+u_time*0.18);\n' +
    ' float inten=pow(max(0.0,rays*0.55+0.45),22.0);\n' +
    ' float mask=exp(-r*3.0);\n' +
    ' vec3 col=texture(u_tex,vUv).rgb;\n' +
    ' col += vec3(0.42,0.55,0.85)*inten*mask*0.30;\n' +
    ' outColor=vec4(col,1.0); }';

  var beamH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex; uniform vec2 u_mouse; uniform float u_time;\n' +
    'void main(){ vec2 uv=vUv; vec2 axis=normalize(vec2(0.82,0.42));\n' +
    ' vec2 p=uv-(0.62+u_mouse*0.25);\n' +
    ' float line=abs(dot(p,axis)); float b=exp(-line*6.0)*0.05;\n' +
    ' b += exp(-length(p)*2.6)*0.015*sin(u_time*0.7);\n' +
    ' vec3 col=texture(u_tex,uv).rgb + vec3(0.35,0.5,0.8)*b;\n' +
    ' outColor=vec4(col,1.0); }';

  var chromabH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex; uniform vec2 u_mouse;\n' +
    'void main(){ vec2 off=(vUv-0.5)*0.004 + (u_mouse-0.5)*0.014;\n' +
    ' float r=texture(u_tex,vUv+off).r, g=texture(u_tex,vUv).g, b=texture(u_tex,vUv-off).b;\n' +
    ' outColor=vec4(r,g,b,1.0); }';

  var blurH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex; uniform vec2 u_mouse;\n' +
    'void main(){ vec2 o=(vec2(0.0016,0.0010)+u_mouse*0.0011);\n' +
    ' vec3 c=texture(u_tex,vUv).rgb;\n' +
    ' c+=texture(u_tex,vUv+o).rgb+texture(u_tex,vUv-o).rgb;\n' +
    ' c+=texture(u_tex,vUv+vec2(o.x,-o.y)).rgb+texture(u_tex,vUv+vec2(-o.x,o.y)).rgb;\n' +
    ' outColor=vec4(c/5.0,1.0); }';

  var diffuseH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex;\n' +
    'void main(){ vec3 col=texture(u_tex,vUv).rgb;\n' +
    ' float lum=dot(col,vec3(0.299,0.587,0.114));\n' +
    ' col *= 0.88 + lum*0.22;\n' +
    ' col += pow(lum,3.0)*vec3(0.05,0.08,0.16);\n' +
    ' outColor=vec4(col,1.0); }';

  var retroH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex; uniform float u_time;\n' + NOISE_H +
    'void main(){ vec3 col=texture(u_tex,vUv).rgb;\n' +
    ' col *= 1.0-0.10*smoothstep(0.82,1.0,sin(vUv.y*220.0+u_time*1.6));\n' +
    ' col += (h21(vUv*vec2(913.0,719.0)+u_time*0.4)-0.5)*0.012;\n' +
    ' float vig=1.0-0.5*pow(length(vUv-0.5),2.2);\n' +
    ' outColor=vec4(col*vig,1.0); }';

  var rippleH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex; uniform float u_time;\n' +
    'void main(){ vec3 col=texture(u_tex,vUv).rgb;\n' +
    ' float w=sin(length((vUv-0.5)*7.0)-u_time*1.4);\n' +
    ' col += w*0.012;\n' +
    ' outColor=vec4(col,1.0); }';

  /* 最终合成：文字作为载体，被涟漪/抖动场切割扭曲 */
  var compositeH = '#version 300 es\nprecision highp float;\nin vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D u_tex; uniform sampler2D u_text; uniform vec2 u_mouse; uniform float u_time;\n' + NOISE_H +
    'void main(){ vec2 base=vUv;\n' +
    ' vec2 q=base-0.5; float r=length(q);\n' +
    ' vec2 swirl=normalize(vec2(-q.y,q.x)+vec2(1e-5))*sin(r*18.0-u_time*0.9)*0.010;\n' +
    ' vec2 jag=(vec2(h21(floor(base*14.0)),h21(floor(base*14.0)+vec2(31.0,17.0)))-0.5)*0.012;\n' +
    ' vec2 tv=base+swirl+jag+(u_mouse-0.5)*0.016;\n' +
    ' float m=texture(u_text,tv).r;\n' +
    ' vec3 bg=texture(u_tex,base).rgb;\n' +
    ' vec3 tcol=vec3(0.86,0.91,1.0);\n' +
    ' vec3 col=mix(bg,tcol,m*0.42);\n' +
    ' col += (h21(base*vec2(491.0,823.0))-0.5)*0.008;\n' +
    ' outColor=vec4(col,1.0); }';

  /* ---------------- 通道顺序（含自动速度；0.25 渐变 / fbm / ...） ---------------- */
  var PASSES = [
    { id: 'gradient', shader: gradH, auto: 0.25 },
    { id: 'fbm', shader: fbmH, auto: 0.0, tex: true },
    { id: 'replicate', shader: replicateH, auto: 0.04, tex: true },
    { id: 'shatter', shader: voronoiH, track: 0.8, momentum: 0.2, auto: 0.32, tex: true },
    { id: 'liquify', shader: liquifyH, track: 0.2, momentum: 1.0, auto: 0.21, tex: true },
    { id: 'god_rays', shader: godraysH, track: 0.61, momentum: 0.76, auto: 0.18, tex: true },
    { id: 'beam', shader: beamH, track: 0.06, momentum: 0.5, auto: 0.1, tex: true },
    { id: 'chromatic_abb', shader: chromabH, track: 0.25, momentum: 0.5, auto: 0.05, tex: true },
    { id: 'progressive_blur', shader: blurH, track: 0.03, momentum: 0.6, tex: true },
    { id: 'diffuse', shader: diffuseH, tex: true },
    { id: 'retro_screen', shader: retroH, auto: 0.37, tex: true },
    { id: 'ripple', shader: rippleH, auto: 0.5, tex: true }
  ];

  PASSES.forEach(function (ps) {
    // retro 用到的噪声不需要额外 uniform
    ps.prog = program(ps.shader);
    // 每层鼠标状态（动量插值）
    ps.mouse = { x: 0.5, y: 0.5 };
    ps.trackMouse = ps.track || 0;
    ps.mouseMomentum = ps.momentum !== undefined ? ps.momentum : 0.5;
  });
  var composite = program(compositeH);
  if (!composite) { canvas.classList.add('hero-gl-fallback'); return; }

  /* ---------------- 文字纹理：CHY.GALAXY（效果载体） ---------------- */
  var textTex = gl.createTexture();
  var textCanvas = document.createElement('canvas');
  function buildText() {
    var W = textCanvas.width, H = textCanvas.height;
    var c = textCanvas.getContext('2d');
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '400 ' + Math.round(H * 0.60) + 'px "Helvetica Neue", Helvetica, Arial, sans-serif';
    if ('letterSpacing' in c) c.letterSpacing = '-0.07em';
    c.fillText('CHY.GALAXY', W / 2, H / 2 + H * 0.02);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /* ---------------- PingPong FBO ---------------- */
  var W = 0, H = 0;
  var fbos = [null, null];
  function makeTarget() {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    return { fbo: fbo, tex: tex, ok: ok };
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(8, Math.round(rect.width * DPR));
    H = Math.max(8, Math.round(rect.height * DPR));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    if (fbos[0]) {
      [fbos[0], fbos[1]].forEach(function (t) { if (t) { gl.deleteFramebuffer(t.fbo); gl.deleteTexture(t.tex); } });
    }
    fbos[0] = makeTarget();
    fbos[1] = makeTarget();
    if (!fbos[0].ok || !fbos[1].ok) { canvas.classList.add('hero-gl-fallback'); }
    // 文字纹理也按比例放大
    textCanvas.width = 2048;
    textCanvas.height = 512;
    buildText();
  }

  /* ---------------- 鼠标追踪（逐层动量） ---------------- */
  var mouse = { x: 0.5, y: 0.5 };
  var MAXOFF = 0.10;
  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
  }, { passive: true });

  function stepMouse(layer) {
    var tx = mouse.x * layer.trackMouse * MAXOFF;
    var ty = mouse.y * layer.trackMouse * MAXOFF;
    // 目标 = 鼠标 * track * 最大偏移；当前 += (目标-当前)*(1-momentum)
    var k = 1 - layer.mouseMomentum;
    layer.mouse.x += (tx - layer.mouse.x) * k;
    layer.mouse.y += (ty - layer.mouse.y) * k;
    return layer.mouse;
  }

  /* ---------------- 渲染循环 ---------------- */
  var running = false, raf = null, startT = 0;
  var GLOBAL_TIME = function (now) { return (now - startT) * 0.001; };

  function bindPass(ps, tex, t) {
    gl.useProgram(ps.prog.p);
    gl.bindVertexArray(vao);
    if (ps.prog.u.u_tex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(ps.prog.u.u_tex, 0);
    }
    if (ps.prog.u.u_res) gl.uniform2f(ps.prog.u.u_res, W, H);
    if (ps.prog.u.u_time) gl.uniform1f(ps.prog.u.u_time, t * (ps.auto !== undefined && ps.auto > 0 ? ps.auto : (ps.auto === 0 ? 0.18 : 1)));
    if (ps.prog.u.u_mouse) {
      var m = stepMouse(ps);
      gl.uniform2f(ps.prog.u.u_mouse, m.x, m.y);
    }
  }

  function heroActive() {
    if (window.__sv) return window.__sv.state.currentScene === 0;
    return true;
  }

  function frame(now) {
    if (!running) return;
    if (document.hidden || !heroActive()) { raf = requestAnimationFrame(frame); return; }
    renderOnce(now);
    raf = requestAnimationFrame(frame);
  }

  function renderOnce(now) {
    var t = GLOBAL_TIME(now);

    var src = null, dst = 0;
    PASSES.forEach(function (ps, i) {
      var out = fbos[dst];
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.fbo);
      gl.viewport(0, 0, W, H);
      bindPass(ps, src, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      src = out.tex;
      dst = (dst + 1) % 2;
    });

    // 最终合成到屏幕
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(composite.p);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.uniform1i(composite.u.u_tex, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textTex);
    gl.uniform1i(composite.u.u_text, 1);
    if (composite.u.u_mouse) {
      var mm = { x: 0.5 + (mouse.x - 0.5) * 0.2, y: 0.5 + (mouse.y - 0.5) * 0.2 };
      // 轻微整体偏移给文字扰动
      composite.u._m = composite.u._m || { x: 0.5, y: 0.5 };
      composite.u._m.x += (mm.x - composite.u._m.x) * 0.08;
      composite.u._m.y += (mm.y - composite.u._m.y) * 0.08;
      gl.uniform2f(composite.u.u_mouse, composite.u._m.x, composite.u._m.y);
    }
    if (composite.u.u_time) gl.uniform1f(composite.u.u_time, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function start() { if (!running) { running = true; startT = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  resize();

  if (reduced) {
    renderOnce(0);            // 静态渲染一帧（无循环、无鼠标联动）
  } else {
    start();
  }
})();
