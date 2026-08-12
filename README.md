# 陈黄勇 · 游戏产品经理 / 系统策划作品集

个人简历与项目作品集，部署于 GitHub Pages：

https://2126431683a-netizen.github.io/

## 内容结构

- `index.html`：以《放开那个女巫》实时官网开场的官方网站式首页
- `projects.html`：五个核心项目的独立入口与分类目录
- `game-analysis.html`：个人游戏体验、八类玩法拆解与重点出海市场本地化判断
- `game-*.html`：七款游戏各自的完整体验与系统拆解档案
- `project-*.html`：五个项目各自的系统拆解、决策说明与画面证据
- `about.html`：个人方法、经历、教育背景与联系方式
- `assets/site.css`：全站响应式视觉系统与赛博朋克动效
- `assets/site.js`：移动导航、项目终端、滚动揭示与图片灯箱
- `assets/docs/`：可公开查看的《放开那个女巫》PRD、HotPick Studio PRD 与《暮鸦之墓》GDD
- `release-the-witch-game.html`：《放开那个女巫》Web 试玩容器
- `release-the-witch-site.html`：《放开那个女巫》原项目展示页
- `game/release-the-witch/`：Godot Web 导出文件
- `projects/fog-harbor/`：《雾港疑云》双章节网页原型
- `projects/sango/`：《三国文字合成塔防》React / TypeScript 试玩版
- `projects/hotpick/`：HotPick Studio 产品 Demo
- `assets/portfolio/`：作品集使用的项目截图、视频与头像
- `assets/games/`：类型拆解页使用的商业游戏官方商店头图
- `assets/陈黄勇_游戏产品经理_系统策划_简历.pdf`：可下载 PDF 简历

## 重点项目

### 《放开那个女巫：灰堡黎明》

Godot 4 竖屏卡牌回合 RPG MVP。覆盖用户定位、MVP 范围、3 AP 速度行动战斗、角色收集养成、关卡循环、数值与移动端规范，并提供在线试玩与 8 页完整 PRD。

### 《暮鸦之墓》

Godot 4.3 单机开放世界 ARPG 垂直切片。覆盖世界区域规则、任务闭环、近战系统、敌人 AI、装备成长、副本与移动端触控交互。

### 《雾港疑云》

像素风悬疑叙事原型。网页版本提供两幕可玩流程；Unity 版本扩展为三幕、四结局、真相/信任双变量、信件收集与章节检查点。

### 《三国文字合成塔防》

React + TypeScript 实现的纯前端策略游戏原型。包含 8 条合成路线、金币/粮草双经济、农民生产、武将招募与 20 波关卡。

### HotPick Studio

从 0 到 1 设计的 AI 热点选题工作台。以 15 页 PRD 和两轮迭代定义五阶段工作流，并分别完成 React、Electron 与 Capacitor 形态验证。

## 设计方向

页面采用“个人官方网站 + 独立项目档案”的结构：首页首屏实时渲染《放开那个女巫》项目官网，通过项目终端快速切换作品；项目中心负责总览，每个项目页面再分别呈现系统拆解、产品判断、真实画面与可运行 Demo，避免把全部信息堆在一张超长页面里。

## 技术

- 纯静态 HTML / CSS / JavaScript
- 无构建依赖，可直接部署 GitHub Pages
- 980 / 760 / 380px 分层响应式布局，覆盖桌面、平板与窄屏手机
- 半透明实时项目首屏、粉色撞色文字阴影、状态脉冲与滚动进入动效
- 支持系统低动效偏好，移动端使用折叠导航与横向项目选择器
- 多图项目画廊、原生 `dialog` 大图预览、视频播放与锚点导航

## 本地预览

直接打开 `index.html`，或在目录中启动任意静态文件服务器。
