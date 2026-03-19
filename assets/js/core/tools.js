import { langHref, tr } from "./i18n.js";

const TOOL_DEFINITIONS = Object.freeze([
  {
    id: "blog-directory",
    zh: "博客目录",
    en: "Blog Directory",
    descZh: "发布文章、浏览目录与最近草稿",
    descEn: "Published posts, directory, and recent drafts",
    href: "/blog/index.html",
    keywords: ["blog", "directory", "posts", "drafts"]
  },
  {
    id: "blog-studio",
    zh: "博客工作台",
    en: "Blog Studio",
    descZh: "生成结构稿并发布本地博客",
    descEn: "Generate structured drafts and publish posts",
    href: "/tools/blog-studio.html",
    keywords: ["blog", "studio", "editor", "publish"]
  },
  {
    id: "calendar",
    zh: "全屏日历",
    en: "Calendar",
    descZh: "农历、法定节假日、任务联动",
    descEn: "Lunar dates, China holidays, and task sync",
    href: "/tools/calendar.html",
    keywords: ["calendar", "schedule", "holiday"]
  },
  {
    id: "clock",
    zh: "全屏时钟",
    en: "Clock",
    descZh: "高精度时钟 + 倒计时",
    descEn: "High-precision clock and countdown",
    href: "/tools/clock.html",
    keywords: ["clock", "countdown", "timer"]
  },
  {
    id: "focus-hub",
    zh: "专注中心",
    en: "Focus Hub",
    descZh: "番茄钟、休息节奏与专注记录",
    descEn: "Pomodoro cycles, breaks, and focus sessions",
    href: "/tools/focus-hub.html",
    keywords: ["focus", "pomodoro", "sessions"]
  },
  {
    id: "editor",
    zh: "文本编辑器",
    en: "Editor",
    descZh: "Markdown/代码/图片编辑与导出",
    descEn: "Markdown, code, image editing, and export",
    href: "/tools/editor.html",
    keywords: ["editor", "markdown", "notes"]
  },
  {
    id: "todo",
    zh: "TodoList",
    en: "TodoList",
    descZh: "任务管理，支持小时/日/周/月重复",
    descEn: "Tasks with hourly, daily, weekly, monthly recurrence",
    href: "/tools/todo.html",
    keywords: ["todo", "tasks", "kanban"]
  },
  {
    id: "link-vault",
    zh: "快捷收藏",
    en: "Link Vault",
    descZh: "管理常用网址、站内入口与命令说明",
    descEn: "Save useful links, internal shortcuts, and command notes",
    href: "/tools/link-vault.html",
    keywords: ["links", "favorites", "vault", "bookmarks"]
  },
  {
    id: "data-center",
    zh: "数据中心",
    en: "Data Center",
    descZh: "导入、导出、备份与模块级清理",
    descEn: "Import, export, backup, and module-level resets",
    href: "/tools/data-center.html",
    keywords: ["data", "backup", "import", "export"]
  },
  {
    id: "markdown-pdf",
    zh: "Markdown 转 PDF",
    en: "Markdown to PDF",
    descZh: "渲染后导出 PDF",
    descEn: "Preview and export PDF",
    href: "/tools/markdown-pdf.html",
    keywords: ["markdown", "pdf", "export"]
  },
  {
    id: "json-toolbox",
    zh: "JSON 工具箱",
    en: "JSON Toolbox",
    descZh: "格式化、校验、JSON/YAML 转换",
    descEn: "Format, validate, and convert JSON/YAML",
    href: "/tools/json-toolbox.html",
    keywords: ["json", "yaml", "toolbox"]
  },
  {
    id: "color-lab",
    zh: "颜色实验室",
    en: "Color Lab",
    descZh: "调色板、对比度、CSS 变量",
    descEn: "Palettes, contrast, and CSS vars",
    href: "/tools/color-lab.html",
    keywords: ["color", "palette", "contrast"]
  },
  {
    id: "password-lab",
    zh: "密码实验室",
    en: "Password Lab",
    descZh: "生成密码、短语与文本哈希",
    descEn: "Generate passwords, passphrases, and hashes",
    href: "/tools/password-lab.html",
    keywords: ["password", "hash", "security"]
  },
  {
    id: "unit-converter",
    zh: "单位换算台",
    en: "Unit Converter",
    descZh: "长度、温度、数据体积与时间换算",
    descEn: "Convert length, temperature, data size, and time",
    href: "/tools/unit-converter.html",
    keywords: ["unit", "convert", "measurement"]
  }
]);

function localizeTool(definition) {
  return {
    id: definition.id,
    name: tr(definition.zh, definition.en),
    desc: tr(definition.descZh, definition.descEn),
    href: langHref(definition.href),
    keywords: definition.keywords
  };
}

export function getToolRegistry() {
  return TOOL_DEFINITIONS.map(localizeTool);
}

export function getHomeToolCards() {
  return getToolRegistry();
}

export function getLauncherActions() {
  return [
    {
      id: "action:new-todo",
      type: "action",
      title: tr("新建 Todo", "New Todo"),
      subtitle: tr("直接打开 Todo 并进入新建模式", "Open Todo and jump into create mode"),
      href: langHref("/tools/todo.html?action=new"),
      keywords: ["todo", "new", "task"],
      badge: tr("动作", "Action")
    },
    {
      id: "action:new-doc",
      type: "action",
      title: tr("新建文档", "New Document"),
      subtitle: tr("打开编辑器并创建空白文档", "Open the editor and create a fresh document"),
      href: langHref("/tools/editor.html?action=new"),
      keywords: ["editor", "document", "new"],
      badge: tr("动作", "Action")
    },
    {
      id: "action:new-blog",
      type: "action",
      title: tr("新建博客", "New Blog Post"),
      subtitle: tr("打开博客工作台并新建草稿", "Open Blog Studio and create a draft"),
      href: langHref("/tools/blog-studio.html?action=new"),
      keywords: ["blog", "post", "new"],
      badge: tr("动作", "Action")
    },
    {
      id: "action:start-focus",
      type: "action",
      title: tr("启动 25 分钟专注", "Start 25-minute Focus"),
      subtitle: tr("进入专注流程并接管时钟倒计时", "Start a focus session and hand off to the clock"),
      href: langHref("/tools/focus-hub.html?action=start&mode=pomodoro&minutes=25"),
      keywords: ["focus", "pomodoro", "25"],
      badge: tr("动作", "Action")
    },
    {
      id: "action:open-data-center",
      type: "action",
      title: tr("打开数据中心", "Open Data Center"),
      subtitle: tr("查看导出、导入与本地备份", "Review exports, imports, and local backups"),
      href: langHref("/tools/data-center.html"),
      keywords: ["data", "backup", "import", "export"],
      badge: tr("动作", "Action")
    },
    {
      id: "action:open-links",
      type: "action",
      title: tr("打开快捷收藏", "Open Link Vault"),
      subtitle: tr("管理常用网址、站内入口和命令说明", "Manage links, internal shortcuts, and command notes"),
      href: langHref("/tools/link-vault.html"),
      keywords: ["links", "favorites", "vault"],
      badge: tr("动作", "Action")
    }
  ];
}
