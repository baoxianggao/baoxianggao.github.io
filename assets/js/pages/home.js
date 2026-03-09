import {
  STORAGE_KEYS,
  getState,
  setState,
  listTodos,
  listUpcomingEvents,
  initializeDefaults,
  onStateChanged
} from "../core/store.js";
import { estimateReadingMinutes, listBlogPosts } from "../core/blog.js";
import { formatDate, formatDayKey, formatTime } from "../core/date.js";
import { resolveWeatherByGeoOrCity, geocodeCity, getWeatherByCoords } from "../core/weather.js";
import { bootI18n, getLang, isEnglish, tr, langHref, applyLangToLinks, setText, setPlaceholder } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

initializeDefaults();
bootTheme();
bootI18n();

const toolGridEl = document.getElementById("toolGrid");
const agendaListEl = document.getElementById("agendaList");
const miniCalendarEl = document.getElementById("miniCalendar");
const miniCalendarTitleEl = document.getElementById("miniCalendarTitle");
const statTodoAllEl = document.getElementById("statTodoAll");
const statTodoTodayEl = document.getElementById("statTodoToday");
const statTodoDoingEl = document.getElementById("statTodoDoing");
const homeBlogListEl = document.getElementById("homeBlogList");
const weatherTempEl = document.getElementById("weatherTemp");
const weatherTextEl = document.getElementById("weatherText");
const weatherMetaEl = document.getElementById("weatherMeta");
const weatherRefreshBtn = document.getElementById("weatherRefresh");
const weatherCityInput = document.getElementById("weatherCityInput");
const weatherCityBtn = document.getElementById("weatherCityBtn");

const locale = isEnglish() ? "en-US" : "zh-CN";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toolList() {
  return [
    {
      name: tr("博客目录", "Blog Directory"),
      desc: tr("发布文章、浏览目录与最近草稿", "Published posts, directory, and recent drafts"),
      href: langHref("/blog/index.html")
    },
    {
      name: tr("博客工作台", "Blog Studio"),
      desc: tr("生成结构稿并发布本地博客", "Generate structured drafts and publish posts"),
      href: langHref("/tools/blog-studio.html")
    },
    {
      name: tr("全屏日历", "Calendar"),
      desc: tr("农历、法定节假日、任务联动", "Lunar + China holidays + task sync"),
      href: langHref("/tools/calendar.html")
    },
    {
      name: tr("全屏时钟", "Clock"),
      desc: tr("高精度时钟 + 倒计时", "High-precision clock + countdown"),
      href: langHref("/tools/clock.html")
    },
    {
      name: tr("文本编辑器", "Editor"),
      desc: tr("Markdown/代码/图片编辑与导出", "Markdown/code/image editing + export"),
      href: langHref("/tools/editor.html")
    },
    {
      name: "TodoList",
      desc: tr("任务管理，支持小时/日/周/月重复", "Tasks with hourly/daily/weekly/monthly recurrence"),
      href: langHref("/tools/todo.html")
    },
    {
      name: tr("Markdown 转 PDF", "Markdown to PDF"),
      desc: tr("渲染后导出 PDF", "Preview and export PDF"),
      href: langHref("/tools/markdown-pdf.html")
    },
    {
      name: tr("JSON 工具箱", "JSON Toolbox"),
      desc: tr("格式化、校验、JSON/YAML 转换", "Format, validate, JSON/YAML conversion"),
      href: langHref("/tools/json-toolbox.html")
    },
    {
      name: tr("颜色实验室", "Color Lab"),
      desc: tr("调色板、对比度、CSS 变量", "Palette, contrast, CSS vars"),
      href: langHref("/tools/color-lab.html")
    },
    {
      name: tr("密码实验室", "Password Lab"),
      desc: tr("生成密码、短语与文本哈希", "Generate passwords, passphrases, and text hashes"),
      href: langHref("/tools/password-lab.html")
    },
    {
      name: tr("单位换算台", "Unit Converter"),
      desc: tr("长度、温度、数据体积与时间换算", "Convert length, temperature, data size, and time"),
      href: langHref("/tools/unit-converter.html")
    }
  ];
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 主页", "BaoXiangGao Tools - Home");
  setText(
    "#homeBrandDesc",
    "统一入口管理日历、时钟、编辑、待办与开发实用工具。全部数据本地存储，跨工具自动联动。",
    "A unified hub for calendar, clock, editor, todo and utility tools. All data is local-first and shared across tools."
  );

  setText("#homeTopTodoBtn", "新增待办", "New Todo");
  setText("#homeTopEditorBtn", "打开编辑器", "Open Editor");
  setText("#homeTopBlogBtn", "写博客", "Write Blog");
  setText("#homeTopClockBtn", "启动倒计时", "Start Countdown");

  setText("#homeAgendaTitle", "近期日程", "Upcoming Agenda");
  setText("#homeAgendaHint", "未来 72 小时任务与日程汇总", "Tasks and events in the next 72 hours");

  setText("#homeQuickTitle", "快捷操作", "Quick Actions");
  setText("#quickTodo", "新建 TODO", "Create TODO");
  setText("#quickClock", "30 分钟倒计时", "30-min Countdown");
  setText("#quickEditor", "新建文档", "New Document");
  setText("#quickBlog", "新建博客", "New Blog");
  setText("#refreshAll", "刷新全部摘要", "Refresh Dashboard");
  setText(
    "#homeLinkNotice",
    "跨工具联动已启用：TODO 新增后会自动同步到首页与日历。",
    "Cross-tool sync is enabled: new TODOs automatically appear on Home and Calendar."
  );

  setText("#homeWeatherTitle", "天气", "Weather");
  setText("#weatherRefresh", "刷新天气", "Refresh Weather");
  setText("#weatherCityBtn", "按城市查询", "Search City");
  setPlaceholder("#weatherCityInput", "输入城市，如 Shanghai", "Enter a city, e.g. Shanghai");

  setText("#homeMiniCalTitle", "今日迷你日历", "Mini Calendar");
  setText("#homeStatTitle", "状态摘要", "Status Summary");
  setText("#homeStatAllLabel", "待办总数", "All Todos");
  setText("#homeStatTodayLabel", "今日截止", "Due Today");
  setText("#homeStatDoingLabel", "进行中", "In Progress");
  setText("#homeBlogTitle", "博客目录", "Blog Directory");
  setText("#homeBlogHint", "最近发布与本地草稿", "Recent posts and local drafts");
  setText("#homeBlogDirectoryBtn", "打开目录", "Open Directory");

  weatherTextEl.textContent = tr("天气加载中...", "Loading weather...");
  weatherMetaEl.textContent = tr("定位中...", "Locating...");
}

function renderToolGrid() {
  toolGridEl.innerHTML = toolList()
    .map(
      (tool) => `
      <a class="tool-card" href="${tool.href}">
        <h3>${tool.name}</h3>
        <p>${tool.desc}</p>
      </a>
    `
    )
    .join("");
}

function renderAgenda() {
  const events = listUpcomingEvents(72).slice(0, 10);
  if (events.length === 0) {
    agendaListEl.innerHTML = `<li class="agenda-item"><span class="muted">${tr(
      "未来 72 小时暂无日程",
      "No events in the next 72 hours"
    )}</span></li>`;
    return;
  }

  agendaListEl.innerHTML = events
    .map((event) => {
      const date = new Date(event.startISO);
      return `
        <li class="agenda-item">
          <div class="agenda-time">${formatDate(date, "Asia/Shanghai", locale)}<br/>${formatTime(date)}</div>
          <div>
            <div>${event.title}</div>
            <div class="muted" style="font-size:12px">${event.source === "todo" ? tr("来自 TODO", "From TODO") : tr("手动日程", "Manual Event")}</div>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderMiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  if (isEnglish()) {
    miniCalendarTitleEl.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(now);
  } else {
    miniCalendarTitleEl.textContent = `${year} 年 ${month + 1} 月`;
  }

  const weekdays = isEnglish() ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["一", "二", "三", "四", "五", "六", "日"];
  const heads = weekdays.map((w) => `<div class="mini-cal-head">${w}</div>`).join("");

  const startWeekday = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
  const totalDays = lastDay.getDate();
  const blocks = [];

  for (let i = 1; i < startWeekday; i += 1) {
    blocks.push('<div class="mini-cal-day"></div>');
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const currentClass = formatDayKey(date) === formatDayKey(now) ? " current" : "";
    blocks.push(`<div class="mini-cal-day${currentClass}">${day}</div>`);
  }

  miniCalendarEl.innerHTML = heads + blocks.join("");
}

function renderStats() {
  const todos = listTodos({ includeArchived: false });
  const now = new Date();
  const todayKey = formatDayKey(now);
  const todayCount = todos.filter((todo) => formatDayKey(todo.dueAtISO) === todayKey && todo.status !== "done").length;
  const doingCount = todos.filter((todo) => todo.status === "doing").length;

  statTodoAllEl.textContent = String(todos.filter((todo) => todo.status !== "archived").length);
  statTodoTodayEl.textContent = String(todayCount);
  statTodoDoingEl.textContent = String(doingCount);
}

function renderRecentBlogs() {
  const posts = listBlogPosts({ includeDrafts: true }).slice(0, 4);
  if (posts.length === 0) {
    homeBlogListEl.innerHTML = `
      <div class="agenda-item">
        <span class="muted">${tr("还没有博客内容，先去博客工作台生成第一篇结构稿。", "No blog content yet. Generate your first structured draft in Blog Studio.")}</span>
      </div>
    `;
    return;
  }

  homeBlogListEl.innerHTML = posts
    .map((post) => {
      const href = langHref(`/blog/post.html?id=${encodeURIComponent(post.id)}`);
      return `
        <a class="blog-teaser-card" href="${href}">
          <div class="blog-teaser-meta">
            <span class="pill">${post.status === "published" ? tr("已发布", "Published") : tr("草稿", "Draft")}</span>
            <span class="muted">${estimateReadingMinutes(post.content)} ${tr("分钟", "min")}</span>
          </div>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.summary)}</p>
        </a>
      `;
    })
    .join("");
}

function setWeatherLoading(text = tr("天气加载中...", "Loading weather...")) {
  weatherTempEl.textContent = "--°";
  weatherTextEl.textContent = text;
  weatherMetaEl.textContent = "--";
}

function applyWeather(weather) {
  weatherTempEl.textContent = `${Math.round(weather.temperature)}°`;
  weatherTextEl.textContent = `${weather.weatherText} · ${tr("湿度", "Humidity")} ${weather.humidity}%`;
  weatherMetaEl.textContent = `${weather.city || tr("当前位置", "Current location")} · ${tr("风速", "Wind")} ${weather.windSpeed}km/h`;
}

async function refreshWeatherByGeo() {
  setWeatherLoading();
  try {
    const weather = await resolveWeatherByGeoOrCity("Shanghai", getLang());
    applyWeather(weather);
  } catch (error) {
    weatherTempEl.textContent = "--°";
    weatherTextEl.textContent = tr("天气获取失败", "Weather unavailable");
    weatherMetaEl.textContent = error.message;
  }
}

async function refreshWeatherByCity(city) {
  if (!city) {
    return;
  }
  setWeatherLoading(tr("城市天气加载中...", "Loading city weather..."));
  try {
    const geo = await geocodeCity(city, getLang());
    const weather = await getWeatherByCoords(geo.latitude, geo.longitude, getLang());
    applyWeather({ ...weather, city: geo.city, country: geo.country });
  } catch (error) {
    weatherTextEl.textContent = tr("城市查询失败", "City search failed");
    weatherMetaEl.textContent = error.message;
  }
}

function bindActions() {
  document.getElementById("quickTodo").addEventListener("click", () => {
    window.location.href = langHref("/tools/todo.html");
  });

  document.getElementById("quickClock").addEventListener("click", () => {
    const target = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    setState(STORAGE_KEYS.clock, {
      countdownTargetISO: target,
      remainingMs: 0,
      running: true,
      muted: getState(STORAGE_KEYS.clock, { muted: false }).muted || false
    });
    window.location.href = langHref("/tools/clock.html");
  });

  document.getElementById("quickEditor").addEventListener("click", () => {
    window.location.href = langHref("/tools/editor.html");
  });

  document.getElementById("quickBlog").addEventListener("click", () => {
    window.location.href = langHref("/tools/blog-studio.html");
  });

  document.getElementById("refreshAll").addEventListener("click", () => {
    renderAgenda();
    renderStats();
    renderRecentBlogs();
    renderMiniCalendar();
    refreshWeatherByGeo();
  });

  weatherRefreshBtn.addEventListener("click", refreshWeatherByGeo);
  weatherCityBtn.addEventListener("click", () => refreshWeatherByCity(weatherCityInput.value.trim()));
  weatherCityInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      refreshWeatherByCity(weatherCityInput.value.trim());
    }
  });
}

function bootstrap() {
  applyStaticI18n();
  renderToolGrid();
  renderAgenda();
  renderMiniCalendar();
  renderStats();
  renderRecentBlogs();
  bindActions();
  refreshWeatherByGeo();
  applyLangToLinks();

  onStateChanged((detail) => {
    if ([STORAGE_KEYS.todos, STORAGE_KEYS.events].includes(detail.key)) {
      renderAgenda();
      renderStats();
    }
    if (detail.key === STORAGE_KEYS.blogPosts) {
      renderRecentBlogs();
    }
  });
}

bootstrap();
