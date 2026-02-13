# BaoXiangGao Tools

一个基于 **GitHub Pages** 的个人多工具网站仓库，使用原生 `HTML/CSS/JavaScript` 实现，无需构建流程，开箱即用。

- 仓库地址: [baoxianggao/baoxianggao.github.io](https://github.com/baoxianggao/baoxianggao.github.io)
- 站点定位: 个人效率 + 日程管理 + 开发实用工具
- 核心特点: 多页面工具集、统一视觉风格、浏览器本地存储、跨工具数据联动

---

## 功能总览

### 1. 首页（工具中枢）
文件: `index.html`

提供统一入口与信息摘要：
- 工具导航矩阵（可直达全部工具页面）
- 天气模块（Open-Meteo，支持定位和城市查询）
- 迷你日历模块（当月概览）
- 近期日程模块（未来 72 小时事件）
- 快捷操作（新建 TODO / 打开编辑器 / 启动倒计时）
- 状态统计（待办总数、今日截止、进行中）

### 2. 全屏日历
文件: `tools/calendar.html`

- 支持月/周视图（FullCalendar）
- 支持中国农历显示（`lunar-javascript`）
- 支持中国法定节假日与调休标注
- 支持“同步节假日”并缓存到本地
- 与 TODO 联动：日历单元格显示任务数量，点击日期可查看当日任务详情

### 3. 全屏时钟
文件: `tools/clock.html`

- 毫秒级动态时钟显示
- 时间同步机制：优先 `worldtimeapi` 校准偏移，失败时回退本地时间
- 倒计时功能：
  - 目标时间启动
  - 预设 5/15/30/60 分钟
  - 暂停/继续/重置
  - 到时提醒（支持静音）
- 倒计时状态持久化（刷新页面可恢复）

### 4. 文本编辑器
文件: `tools/editor.html`

- Markdown 双栏编辑预览
- 文本/代码编辑
- 支持拖拽图片并转为 base64 Markdown 图片插入
- 多文档草稿本地保存
- 导出功能：`MD` / `TXT` / `HTML`

### 5. TODO List
文件: `tools/todo.html`

- 任务字段：标题、备注、截止时间、重复规则、优先级、标签
- 重复规则：`none` / `hourly` / `daily` / `weekly` / `monthly`
- 过滤视图：今天、未来 24h、本周、本月、已完成、已过期、全部
- 状态流转：`todo -> doing -> done`，支持归档与删除
- 重复任务采用“展示层派生”，避免无限复制原始数据

### 6. Markdown 转 PDF
文件: `tools/markdown-pdf.html`

- Markdown 输入
- 实时预览
- 一键导出 PDF（`html2pdf.js`）

### 7. JSON 工具箱
文件: `tools/json-toolbox.html`

- JSON 格式化
- JSON 压缩
- JSON 合法性校验（错误提示）
- JSON ↔ YAML 转换（`js-yaml`）

### 8. 颜色实验室
文件: `tools/color-lab.html`

- 基础色选择
- 自动调色板生成
- 前景/背景对比度计算（AA/AAA 提示）
- CSS Variables 片段生成与复制

---

## 跨工具联动与数据存储

所有数据存储在浏览器 `localStorage`，不依赖后端服务。

统一存储键（`v1`）：
- `bxg.tools.v1.settings`
- `bxg.tools.v1.todos`
- `bxg.tools.v1.events`
- `bxg.tools.v1.editor_docs`
- `bxg.tools.v1.clock`
- `bxg.tools.v1.holiday_cache`

联动规则：
- TODO 变更会同步影响首页“近期日程/状态统计”和日历任务标记
- 日历展示根据 TODO 数据动态派生
- 时钟倒计时状态可跨刷新恢复

---

## 技术栈与依赖

### 基础技术
- 原生 `HTML5`
- 原生 `CSS3`（设计 token + 组件化样式）
- 原生 `JavaScript ES Modules`

### 外部库（CDN 按页加载）
- [FullCalendar](https://fullcalendar.io/)：日历 UI
- [lunar-javascript](https://github.com/6tail/lunar-javascript)：中国农历
- [marked](https://github.com/markedjs/marked)：Markdown 解析
- [html2pdf.js](https://github.com/eKoopmans/html2pdf.js)：PDF 导出
- [js-yaml](https://github.com/nodeca/js-yaml)：JSON/YAML 转换

### 外部数据与接口
- 天气: [Open-Meteo](https://open-meteo.com/)
- 时间同步: [WorldTimeAPI](http://worldtimeapi.org/)
- 节假日同步源: `lanceliao/china-holiday-calender` 公共数据

---

## 节假日数据说明

内置文件目录：`assets/data/holidays/`
- `cn-2025.json`
- `cn-2026.json`
- `cn-2027.json`

说明：
- 2025/2026 已内置数据
- 2027 预留为空数组（后续可通过同步或补充数据）
- 日历页支持在线同步后写入 `holiday_cache`

---

## 目录结构

```text
.
├── index.html
├── readme.md
├── assets
│   ├── css
│   │   ├── tokens.css
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   └── pages/
│   ├── js
│   │   ├── core/
│   │   └── pages/
│   └── data
│       └── holidays/
└── tools
    ├── calendar.html
    ├── clock.html
    ├── editor.html
    ├── todo.html
    ├── markdown-pdf.html
    ├── json-toolbox.html
    └── color-lab.html
```

---

## 本地运行方式

无需安装依赖，直接启动静态服务即可。

示例：

```bash
python3 -m http.server 4173
```

然后访问：
- `http://127.0.0.1:4173/`

---

## 响应式与兼容性

- 断点策略：
  - `<=768px` 手机
  - `769-1200px` 平板/小屏本
  - `>1200px` 桌面
- 兼容目标：现代 Chromium / Safari / Firefox
- 不支持 IE

---

## 设计与体验特性

- 极简专业风格 + 层次化动效
- 全局视觉 token 统一（颜色、圆角、阴影、字号、字体）
- 非模板化布局：信息面板化、重点模块强化、工具卡交互反馈
- 支持深色氛围背景和高可读性内容区

---

## 已知限制

- 纯前端站点，数据仅存在当前浏览器本地
- 部分在线功能依赖外部服务可用性（天气、时间同步、节假日远端同步）
- 首次访问若拒绝定位，天气会回退到城市查询流程

---

## 后续可扩展方向

- 云端同步（GitHub Gist / Firebase / Supabase）
- 账号体系与多端同步
- 日历导入导出（ICS）
- PWA 离线缓存
- 更细粒度通知（浏览器通知/邮件/Webhook）

---

## 许可证

当前仓库未单独声明许可证。若计划开源复用，建议补充 `LICENSE` 文件。
