(() => {
  const body = document.body;
  const menuButton = document.querySelector('.menu-button');
  const navLinks = document.querySelector('.nav-links');

  // 子页面补一个回主页场景的链接（主页自身已是单页场景流，不需要插入）
  if (navLinks && !navLinks.querySelector('[data-nav="home"]')) {
    const link = document.createElement('a');
    link.href = 'index.html';
    link.dataset.nav = 'home';
    link.textContent = '主界面';
    navLinks.insertBefore(link, navLinks.firstElementChild);
  }

  const closeMenu = () => {
    body.classList.remove('menu-open');
    if (menuButton) {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', '打开导航');
    }
  };

  if (menuButton && navLinks) {
    menuButton.addEventListener('click', () => {
      const isOpen = body.classList.toggle('menu-open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
      menuButton.setAttribute('aria-label', isOpen ? '关闭导航' : '打开导航');
    });

    navLinks.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  const currentPage = body.dataset.page;
  if (currentPage && currentPage !== 'home') {
    document.querySelectorAll('[data-nav]').forEach((link) => {
      if (link.dataset.nav === currentPage) link.setAttribute('aria-current', 'page');
    });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 鼠标视差：星空 + 星系舞台随指针轻微漂移 ---- */
  const parallaxLayers = [
    ...[...document.querySelectorAll('.starfield')].map((el) => ({ el, depth: 14 })),
    { el: document.querySelector('[data-solar-stage]'), depth: 26 },
    { el: document.querySelector('[data-planet-focus]'), depth: 10 }
  ].filter((layer) => layer.el);

  if (!reducedMotion && parallaxLayers.length && window.matchMedia('(pointer: fine)').matches) {
    let parallaxRaf = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const renderParallax = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      parallaxLayers.forEach((layer) => {
        layer.el.style.setProperty('--parallax-x', `${(-currentX * layer.depth).toFixed(2)}px`);
        layer.el.style.setProperty('--parallax-y', `${(-currentY * layer.depth).toFixed(2)}px`);
      });
      if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
        parallaxRaf = requestAnimationFrame(renderParallax);
      } else {
        parallaxRaf = null;
      }
    };

    window.addEventListener('pointermove', (event) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
      if (!parallaxRaf) parallaxRaf = requestAnimationFrame(renderParallax);
    }, { passive: true });
  }

  const revealItems = document.querySelectorAll('[data-reveal]');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('revealed'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // ============ Hero 打字机 + 继续了解按钮 ============
  const typeTargets = document.querySelectorAll('[data-type]');
  const typewrite = (el) => {
    const fullText = el.dataset.typeText ?? el.textContent;
    if (!fullText) return;
    el.dataset.typeText = fullText;
    const speed = Number(el.dataset.typeSpeed ?? 55);
    if (reducedMotion) return;
    el.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'type-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    el.appendChild(cursor);
    let i = 0;
    const tick = () => {
      if (i >= fullText.length) {
        window.setTimeout(() => cursor.remove(), 1800);
        return;
      }
      el.insertBefore(document.createTextNode(fullText[i]), cursor);
      i += 1;
      window.setTimeout(tick, speed + Math.random() * speed * 0.6);
    };
    window.setTimeout(tick, 200);
  };
  typeTargets.forEach(typewrite);

  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.goto);
      if (target) target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  // ============ Galaxy（星系交互：点击星球 → 左侧聚焦 + 右侧面板） ============
  const solar = document.querySelector('[data-solar]');
  if (solar) {
    const PLANETS = {
      sun: {
        code: 'STAR / 00',
        title: '关于我',
        colors: { hi: '#fff2cf', mid: '#e8c66a', lo: '#a87f2e', halo: 'rgba(232,198,106,0.45)' },
        html: () => `
          <div class="pb-profile">
            <img class="pb-photo img-color" src="assets/portfolio/profile.png" alt="陈黄勇证件照">
            <div>
              <p class="pb-lead">陈黄勇，游戏产品经理 / 运营策划 / 系统策划。学的是网络与新媒体，做的是游戏——所以我写的判断，最后都会做成能玩的东西。</p>
              <div class="pb-stats">
                <div><strong>06</strong><span>项目档案</span></div>
                <div><strong>05</strong><span>可运行 Demo</span></div>
              </div>
            </div>
          </div>
          <div class="pb-actions">
            <a href="assets/陈黄勇_游戏产品经理_系统策划_简历.pdf" download>下载简历 PDF</a>
            <a class="pb-ghost" href="mailto:2126431683@qq.com">发邮件</a>
            <a class="pb-ghost" href="tel:19279459077">打电话</a>
          </div>`
      },
      projects: {
        code: 'PLANET / 01',
        title: '项目终端',
        colors: { hi: '#d9c9a8', mid: '#8d7a58', lo: '#4a3d2a', halo: 'rgba(217,201,168,0.4)' },
        html: () => `
          <p class="pb-lead">六个项目，没一个是纸面功夫。定位、系统、数值、我干了什么、长什么样——都在这里，不用再翻页面。</p>
          <ul class="pb-list pb-cards">
            <li class="pb-card">
              <img class="pb-thumb" src="assets/portfolio/witch-city.png" alt="放开那个女巫截图">
              <div class="pb-card-body">
                <strong>放开那个女巫：灰堡黎明</strong>
                <span>Godot 4 · 卡牌回合 RPG —— 3 AP 速度行动战斗、角色收集养成、28 节点关卡。</span>
                <span class="pb-links"><a href="assets/docs/release-the-witch-prd.pdf" target="_blank" rel="noopener">PRD</a><a href="release-the-witch-game.html">试玩 →</a></span>
              </div>
            </li>
            <li class="pb-card">
              <img class="pb-thumb" src="assets/portfolio/mournraven-world.png" alt="暮鸦之墓截图">
              <div class="pb-card-body">
                <strong>暮鸦之墓</strong>
                <span>Godot 4.3 · 开放世界 ARPG —— 主城/野外/副本，任务、战斗、AI 与装备成长闭环。</span>
                <span class="pb-links"><a href="assets/docs/mournraven-gdd.pdf" target="_blank" rel="noopener">GDD</a></span>
              </div>
            </li>
            <li class="pb-card">
              <img class="pb-thumb" src="assets/portfolio/fog-harbor-tower.png" alt="雾港疑云截图">
              <div class="pb-card-body">
                <strong>雾港疑云</strong>
                <span>Web + Unity · 悬疑叙事 —— 真相度与信任双变量、信件收集、三幕四结局。</span>
              </div>
            </li>
            <li class="pb-card">
              <img class="pb-thumb" src="assets/portfolio/sango-gameplay.png" alt="三国塔防截图">
              <div class="pb-card-body">
                <strong>三国文字合成塔防</strong>
                <span>React + TS · 策略塔防 —— 8 条合成线、双经济、20 波战役。</span>
              </div>
            </li>
            <li class="pb-card">
              <img class="pb-thumb" src="assets/portfolio/hotpick.jpg" alt="HotPick Studio 截图">
              <div class="pb-card-body">
                <strong>HotPick Studio</strong>
                <span>React · Electron · AI 产品 —— 热点发现到数据复盘的五阶段工作台。</span>
                <span class="pb-links"><a href="assets/docs/hotpick-studio-prd.pdf" target="_blank" rel="noopener">PRD</a></span>
              </div>
            </li>
            <li class="pb-card">
              <img class="pb-thumb" src="assets/portfolio/emberfall-city.png" alt="余烬之城截图">
              <div class="pb-card-body">
                <strong>余烬之城 Emberfall</strong>
                <span>Godot 4.7 · 生存城建 SLG —— 熔炉供暖、资源调度、暴风雪压力的可玩切片。</span>
                <span class="pb-links"><a href="emberfall-game.html">试玩 →</a></span>
              </div>
            </li>
          </ul>`
      },
      skills: {
        code: 'PLANET / 02',
        title: '技能树',
        colors: { hi: '#a8c8d9', mid: '#5d7f8d', lo: '#2c3e42', halo: 'rgba(168,200,217,0.4)' },
        html: () => `
          <p class="pb-lead">我的路子很简单：先想清楚为什么做，再写清楚怎么跑，最后亲手做出能玩的原型。判断、系统、落地，一条线走完。</p>
          <ul class="pb-list">
            <li><strong>产品判断</strong><span>用户分层与竞品、MVP 范围与优先级、数据指标与埋点 —— 每个判断写进 PRD 并附验收标准。</span></li>
            <li><strong>系统策划</strong><span>战斗与数值、养成与关卡循环、经济与产出消耗 —— 系统是玩家行为互相咬合的齿轮组。</span></li>
            <li><strong>技术落地</strong><span>Godot / Unity / React、JSON 配置与存档、移动端适配验证 —— 策划稿要能跑才算被验证。</span></li>
          </ul>
          <div class="pb-actions">
            <a href="assets/陈黄勇_游戏产品经理_系统策划_简历.pdf" download>下载简历 PDF</a>
          </div>`
      },
      ops: {
        code: 'PLANET / 03',
        title: '运营策划',
        colors: { hi: '#d9a8a8', mid: '#8d5d5d', lo: '#422c2c', halo: 'rgba(217,168,168,0.4)' },
        html: () => `
          <p class="pb-lead">做内容就一句话：先让人看见，再把兴趣带回来。选题看受众，脚本能拍能剪，发出去盯数据，好的坏的都记下来，带进下一轮。</p>
          <div class="pb-stats">
            <div><strong>30%</strong><span>热搜命中率</span></div>
            <div><strong>#02</strong><span>最高热搜榜</span></div>
            <div><strong>300万</strong><span>单条最高播放</span></div>
          </div>
          <ul class="pb-list pb-cards">
            <li class="pb-card">
              <img class="pb-thumb" src="assets/portfolio/hotpick-flow.png" alt="HotPick 工作台">
              <div class="pb-card-body">
                <strong>HotPick Studio</strong>
                <span>把选题、评分、转化、生产、复盘的重复判断做成五阶段内容工作台。</span>
                <span class="pb-links"><a href="assets/docs/hotpick-studio-prd.pdf" target="_blank" rel="noopener">PRD</a></span>
              </div>
            </li>
          </ul>`
      },
      story: {
        code: 'PLANET / 04',
        title: '经历',
        colors: { hi: '#c9d9a8', mid: '#7f8d5d', lo: '#3e422c', halo: 'rgba(201,217,168,0.4)' },
        html: () => `
          <p class="pb-lead">The Player Log —— 从网络与新媒体出发，一路做过内容、运营、产品，最后把判断写成规则、数据、界面和能跑的 Demo。</p>
          <div class="pb-timeline">
            <article><p>2026.06-</p><div><h3>西安纬度网络科技</h3><span>AI 类目编导：三条内容赛道 + 两款 Godot 游戏全流程策划。</span></div></article>
            <article><p>2026.02-06</p><div><h3>Newegg 新蛋</h3><span>电商产品经理实习生：竞品调研、差异化方案与转化复盘。</span></div></article>
            <article><p>2023.06-09</p><div><h3>闻泰科技 · 荣耀平板</h3><span>产品运营实习生：知识库建设，自助查询率 +40%，咨询量 -20%。</span></div></article>
            <article><p>2022-2026</p><div><h3>西安欧亚学院</h3><span>网络与新媒体本科 · 影视编导方向。</span></div></article>
          </div>`
      },
      lens: {
        code: 'PLANET / 05',
        title: '游戏理解',
        colors: { hi: '#b8a8d9', mid: '#6d5d8d', lo: '#352c42', halo: 'rgba(184,168,217,0.4)' },
        html: () => `
          <p class="pb-lead">七组游戏体验，七份拆解。凭什么好玩、哪里会劝退、压力怎么给——每个类型我都写出了自己的一套看法。</p>
          <ul class="pb-list pb-cards">
            <li class="pb-card">
              <img class="pb-thumb" src="assets/games/sekiro.jpg" alt="">
              <div class="pb-card-body">
                <strong>动作</strong>
                <span>《只狼》《黑神话：悟空》—— 精确输入与节奏化的攻防交换。</span>
              </div>
            </li>
            <li class="pb-card">
              <img class="pb-thumb" src="assets/games/elden-ring.jpg" alt="">
              <div class="pb-card-body">
                <strong>开放世界</strong>
                <span>《艾尔登法环》《巫师 3》—— 目的由玩家自己长出来的探索结构。</span>
              </div>
            </li>
            <li class="pb-card">
              <img class="pb-thumb" src="assets/portfolio/fog-harbor-top.png" alt="">
              <div class="pb-card-body">
                <strong>叙事</strong>
                <span>《雾港疑云》同源方法 —— 双变量驱动的分支叙事。</span>
              </div>
            </li>
            <li class="pb-card">
              <img class="pb-thumb" src="assets/games/whiteout-survival.jpg" alt="">
              <div class="pb-card-body">
                <strong>策略 / SLG</strong>
                <span>《三国塔防》《白色荒野》—— 循环与压力的设计取舍。</span>
              </div>
            </li>
          </ul>`
      },
      link: {
        code: 'PLANET / 06',
        title: '联系',
        colors: { hi: '#d9d0a8', mid: '#8d845d', lo: '#42392c', halo: 'rgba(217,208,168,0.4)' },
        html: () => `
          <p class="pb-lead">下一套系统，想跟你一起做。邮件、电话都行；想先试手感，任意一个 Demo 都能直接玩。</p>
          <ul class="pb-list">
            <li><strong>2126431683@qq.com</strong><span>邮件</span></li>
            <li><strong>192 7945 9077</strong><span>电话</span></li>
          </ul>
          <div class="pb-actions">
            <a href="release-the-witch-game.html">放开那个女巫 · Play</a>
            <a class="pb-ghost" href="emberfall-game.html">余烬之城 · Play</a>
          </div>`
      }
    };

    const stage = solar.querySelector('[data-solar-stage]');
    const bodies = [...solar.querySelectorAll('[data-planet]')];
    const focus = solar.querySelector('[data-planet-focus]');
    const focusCore = focus.querySelector('.focus-core');
    const panel = solar.querySelector('[data-planet-panel]');
    const panelCode = panel.querySelector('[data-panel-code]');
    const panelTitle = panel.querySelector('[data-panel-title]');
    const panelBody = panel.querySelector('[data-panel-body]');
    let activePlanet = null;

    const openPlanet = (key) => {
      const data = PLANETS[key];
      if (!data) return;
      activePlanet = key;
      solar.classList.add('is-focused');
      bodies.forEach((b) => b.classList.toggle('is-active', b.dataset.planet === key));
      focusCore.style.setProperty('--hi', data.colors.hi);
      focusCore.style.setProperty('--mid', data.colors.mid);
      focusCore.style.setProperty('--lo', data.colors.lo);
      focusCore.style.setProperty('--halo', data.colors.halo);
      panelCode.textContent = data.code;
      panelTitle.textContent = data.title;
      panelBody.innerHTML = data.html();
      panel.hidden = false;
      // 面板内容入场动画重置
      panelBody.querySelectorAll('.panel-body > *');
    };

    const closePlanet = () => {
      activePlanet = null;
      solar.classList.remove('is-focused');
      bodies.forEach((b) => b.classList.remove('is-active'));
      panel.hidden = true;
    };

    bodies.forEach((body) => {
      body.addEventListener('click', () => {
        if (activePlanet === body.dataset.planet) {
          closePlanet();
        } else {
          openPlanet(body.dataset.planet);
        }
      });
    });

    solar.querySelector('[data-planet-close]').addEventListener('click', closePlanet);

    // Esc 关闭
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && activePlanet) closePlanet();
    });
  }

  const skillTree = document.querySelector('[data-skill-tree]');
  if (skillTree) {
    const SKILLS = {
      judgment: {
        code: 'Branch 01 / Product',
        title: '产品判断',
        lead: '动手之前先回答三个问题：给谁做、为什么做、做到哪里算够。',
        detail: '从用户分层和竞品差异里找切入点，用 MVP 边界控制首版成本，再给每个决定配上可验收的标准。判断可能出错，但推理过程必须能被复盘。',
        facts: ['HotPick Studio PRD · 25 条编号需求', '《放开那个女巫》PRD · MVP 边界定义', '《暮鸦之墓》GDD · P0-P2 优先级路线']
      },
      users: {
        code: 'Branch 01 / Product · 01',
        title: '用户分层与竞品',
        lead: '先分清"谁在玩、为什么玩、玩到哪一步会走"，再谈差异化。',
        detail: '用玩家旅程拆解核心用户与潜在用户，对竞品做体验层面的逐项对比，找到"同样的需求、没被满足好的那一层"，作为切入点写进 PRD 第一页。',
        facts: ['《明日方舟》体验拆解 · 4 类玩家画像', 'HotPick Studio · 3 款竞品对比分析', '游戏理解页 · 5 个类型的压力-吸引分析']
      },
      mvp: {
        code: 'Branch 01 / Product · 02',
        title: 'MVP 范围与优先级',
        lead: '首版只做能验证核心假设的那部分，其余全部延后。',
        detail: '把需求列表按"砍掉后假设是否仍成立"排序，P0 保核心循环，P1 保可感知的完整感，P2 全部进愿望清单。范围锁定后写清验收标准，避免开发中被"顺手加一点"侵蚀。',
        facts: ['《放开那个女巫》PRD · MVP 边界定义', '《暮鸦之墓》GDD · P0-P2 优先级路线', '25 条编号需求 · 逐条验收标准']
      },
      metrics: {
        code: 'Branch 01 / Product · 03',
        title: '数据指标与埋点',
        lead: '先想好用哪个数字证明"好"，再决定埋什么点。',
        detail: '核心循环的每一步定义一个可观测指标：进入率、完成率、留存拐点。埋点跟着指标走，不埋"以后可能用到"的点——查不到结论的数据只是成本。',
        facts: ['HotPick Studio · 核心行为埋点表', '《暮鸦之墓》· 首版验证指标设计', '运营策划 · 活动效果复盘框架']
      },
      system: {
        code: 'Branch 02 / System',
        title: '系统策划',
        lead: '系统不是功能清单，是玩家行为之间互相咬合的齿轮组。',
        detail: '先画循环：玩家做什么、得到什么、消耗什么、下一步被什么驱动。数值、产出、消耗在循环图上对齐，任何一环改动都能顺着图评估影响面。',
        facts: ['《暮鸦之墓》· 战斗-养成-经济三环循环', '《放开那个女巫》· 系统模块拆解', 'Achtung! Cthulhu · 规则系统移植']
      },
      combat: {
        code: 'Branch 02 / System · 01',
        title: '战斗与数值',
        lead: '数值是体验的骨架：成长感能被算出来，也能被算坏。',
        detail: '从公式层定义攻击、防御、成长曲线的量级关系，用数值表推演 20 级的战斗体验是否仍然成立。平衡先于内容——地基不稳时加得越多，噪音越大。',
        facts: ['《暮鸦之墓》· 战斗公式与数值表', '《放开那个女巫》· 养成曲线推演', 'FPS 竞技拆解 · 公平性优先原则']
      },
      progression: {
        code: 'Branch 02 / System · 02',
        lead: '关卡和养成是同一件事的两面：给目标、给路径、给节奏。',
        title: '养成与关卡循环',
        detail: '关卡投放压力，养成消化压力，两者节奏对不上就同时失效。用"压力-释放"曲线安排章节节奏，每个章节末尾留一次可感知的能力跃迁。',
        facts: ['《暮鸦之墓》· 5 章关卡节奏表', '《放开那个女巫》· 养成节点投放', '开放世界拆解 · 目标自生长设计']
      },
      economy: {
        code: 'Branch 02 / System · 03',
        title: '经济与产出消耗',
        lead: '通胀和枯竭都不是数值问题，是设计意图不清晰的问题。',
        detail: '先定每种货币的定位（硬通货/软通货/时间货币），再定产出和回收口。每个回收口都对应一个体验目标：加速、表达或扩展，不为回收而回收。',
        facts: ['《暮鸦之墓》· 三币种经济框架', '《放开那个女巫》· 产出消耗表', '运营策划 · 活动资源投放模型']
      },
      tech: {
        code: 'Branch 03 / Tech',
        title: '技术落地',
        lead: '策划稿要能跑，才算被验证过。',
        detail: '用可运行的 demo 代替"应该可行"：核心循环先做成灰盒，数值表直接驱动表现。写的每一份设计都对应一段能跑的代码或配置，交给程序前自己先玩过。',
        facts: ['《暮鸦之墓》Demo · Godot 完整实现', 'Achtung! Cthulhu · 战术 RPG 可玩原型', '个人作品集 · 本站前端独立开发']
      },
      engines: {
        code: 'Branch 03 / Tech · 01',
        title: 'Godot / Unity / React',
        lead: '引擎是工具箱，选型看团队和验证目标，不看流行度。',
        detail: 'Godot 快速出 2D 原型验证循环，Unity 覆盖移动端发布链路，React 负责数据工具和展示层。同一个数值表在引擎和 Web 两端复用，保证策划案和实际跑的一致。',
        facts: ['《暮鸦之墓》· Godot 4 全流程开发', '《放开那个女巫》· Unity 移动端框架', '本站 · React/原生 HTML 双实现']
      },
      config: {
        code: 'Branch 03 / Tech · 02',
        title: 'JSON 配置与存档',
        lead: '数据和逻辑分离，改数值不发版。',
        detail: '角色、关卡、掉落全部抽成结构化配置，运行时加载、编辑器直接改。存档用版本号做迁移，避免更新后老玩家数据报废。配置结构设计完，数值调优才能交给非程序同学。',
        facts: ['《暮鸦之墓》· 12 类 JSON 配置表', '数值-配置直连 · 热更新流程', '存档系统 · 版本迁移方案']
      },
      mobile: {
        code: 'Branch 03 / Tech · 03',
        title: '移动端适配验证',
        lead: '桌面上的"手感好"，到手机上常常只剩"够不着"。',
        detail: '触点尺寸、单手可达区、横竖屏切换是三条底线。每个 demo 在真机上过一遍核心循环，性能预算提前定帧率红线，UI 方案按最差屏幕先设计。',
        facts: ['《放开那个女巫》· 移动端操作方案', '《暮鸦之墓》· 真机帧率调优', '本站 · 多端自适应布局验证']
      }
    };

    const nodes = [...skillTree.querySelectorAll('[data-skill]')];
    const panel = skillTree.querySelector('.skill-panel');
    const panelCode = panel.querySelector('[data-skill-code]');
    const panelTitle = panel.querySelector('[data-skill-title]');
    const panelLead = panel.querySelector('[data-skill-lead]');
    const panelDetail = panel.querySelector('[data-skill-detail]');
    const panelFacts = panel.querySelector('[data-skill-facts]');

    const selectSkill = (node) => {
      const data = SKILLS[node.dataset.skill];
      if (!data) return;
      nodes.forEach((item) => {
        item.setAttribute('aria-selected', String(item === node));
        item.tabIndex = item === node ? 0 : -1;
      });
      panel.classList.add('is-switching');
      window.setTimeout(() => {
        panelCode.textContent = data.code;
        panelTitle.textContent = data.title;
        panelLead.textContent = data.lead;
        panelDetail.textContent = data.detail;
        panelFacts.replaceChildren(
          ...data.facts.map((fact) => {
            const li = document.createElement('li');
            li.textContent = fact;
            return li;
          })
        );
        panel.classList.remove('is-switching');
      }, reducedMotion ? 0 : 140);
    };

    nodes.forEach((node, index) => {
      node.tabIndex = index === 0 ? 0 : -1;
      node.addEventListener('click', () => selectSkill(node));
      node.addEventListener('keydown', (event) => {
        const keys = ['ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        let next;
        if (event.key === 'Home') next = nodes[0];
        else if (event.key === 'End') next = nodes[nodes.length - 1];
        else {
          const step = event.key === 'ArrowDown' ? 1 : -1;
          next = nodes[(nodes.indexOf(node) + step + nodes.length) % nodes.length];
        }
        if (next) {
          next.focus();
          selectSkill(next);
        }
      });
    });
  }

  const terminal = document.querySelector('[data-project-terminal]');
  if (terminal) {
    const tabs = [...terminal.querySelectorAll('.terminal-tab')];
    const media = terminal.querySelector('.terminal-media');
    const image = terminal.querySelector('[data-terminal-image]');
    const code = terminal.querySelector('[data-terminal-code]');
    const title = terminal.querySelector('[data-terminal-title]');
    const meta = terminal.querySelector('[data-terminal-meta]');
    const description = terminal.querySelector('[data-terminal-description]');
    const detailLink = terminal.querySelector('[data-terminal-detail]');
    const demoLink = terminal.querySelector('[data-terminal-demo]');

    const selectProject = (tab) => {
      tabs.forEach((item) => {
        item.setAttribute('aria-selected', String(item === tab));
        item.tabIndex = item === tab ? 0 : -1;
      });
      media.classList.add('is-changing');
      window.setTimeout(() => {
        image.src = tab.dataset.image;
        image.alt = tab.dataset.alt;
        code.textContent = tab.dataset.code;
        title.textContent = tab.dataset.title;
        meta.textContent = tab.dataset.meta;
        description.textContent = tab.dataset.description;
        detailLink.href = tab.dataset.detail;
        demoLink.href = tab.dataset.demo;
        media.classList.remove('is-changing');
      }, reducedMotion ? 0 : 150);
    };

    tabs.forEach((tab, index) => {
      tab.tabIndex = index === 0 ? 0 : -1;
      tab.addEventListener('click', () => selectProject(tab));
      tab.addEventListener('keydown', (event) => {
        const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        let next;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else {
          const delta = event.key === 'ArrowRight' ? 1 : -1;
          next = (index + delta + tabs.length) % tabs.length;
        }
        const target = tabs[next];
        selectProject(target);
        target.focus();
      });
    });
  }

  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    const image = lightbox.querySelector('img');
    const caption = lightbox.querySelector('.lightbox-caption');
    const closeButton = lightbox.querySelector('.lightbox-close');

    document.querySelectorAll('[data-lightbox]').forEach((button) => {
      button.addEventListener('click', () => {
        image.src = button.dataset.lightbox;
        image.alt = button.dataset.caption || '项目截图';
        caption.textContent = button.dataset.caption || '项目截图';
        lightbox.showModal();
      });
    });

    closeButton?.addEventListener('click', () => lightbox.close());
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) lightbox.close();
    });
  }

  const genreFilter = document.querySelector('[data-genre-filter]');
  if (genreFilter) {
    const filterButtons = [...genreFilter.querySelectorAll('[data-genre]')];
    const genrePanels = [...document.querySelectorAll('[data-genre-panel]')];
    const count = genreFilter.querySelector('[data-genre-count]');

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const selectedGenre = button.dataset.genre;
        let visibleCount = 0;

        filterButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        genrePanels.forEach((panel) => {
          const isVisible = selectedGenre === 'all' || panel.dataset.genrePanel === selectedGenre;
          panel.hidden = !isVisible;
          if (isVisible) visibleCount += 1;
        });
        if (count) count.textContent = `${visibleCount} 个类型拆解`;
      });
    });
  }

  document.querySelectorAll('[data-year]').forEach((item) => {
    item.textContent = String(new Date().getFullYear());
  });
})();
