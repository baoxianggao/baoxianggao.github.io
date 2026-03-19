import {
  DEFAULT_CLOCK_STATE,
  STORAGE_KEYS,
  getState,
  setState,
  listTodos,
  listUpcomingEvents,
  initializeDefaults,
  onStateChanged
} from "../core/store.js";
import { estimateReadingMinutes, listBlogPosts } from "../core/blog.js";
import { formatDate, formatDateTime, formatDayKey, formatTime } from "../core/date.js";
import { getActiveFocusSession, getTodayFocusSummary } from "../core/focus.js";
import { bootI18n, getLang, isEnglish, tr, langHref, applyLangToLinks, setText, setPlaceholder } from "../core/i18n.js";
import { mountLauncher } from "../core/launcher.js";
import { listLinks } from "../core/links.js";
import { getManagedStorageKeys, listSnapshots } from "../core/snapshot.js";
import { bootTheme } from "../core/theme.js";
import { getHomeToolCards } from "../core/tools.js";
import { geocodeCity, getWeatherByCoords, resolveWeatherByGeoOrCity } from "../core/weather.js";

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
const homeQuickLinksEl = document.getElementById("homeQuickLinks");
const homeFocusSummaryEl = document.getElementById("homeFocusSummary");
const homeDataStatusEl = document.getElementById("homeDataStatus");
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
  return getHomeToolCards();
}

function formatShortDateTime(value) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function focusModeLabel(mode) {
  return tr(
    mode === "pomodoro"
      ? "番茄钟"
      : mode === "shortBreak"
        ? "短休息"
        : mode === "longBreak"
          ? "长休息"
          : "自定义",
    mode === "pomodoro"
      ? "Pomodoro"
      : mode === "shortBreak"
        ? "Short Break"
        : mode === "longBreak"
          ? "Long Break"
          : "Custom"
  );
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

  setText("#homeQuickLinksTitle", "快捷收藏", "Quick Links");
  setText("#homeQuickLinksHint", "置顶且勾选首页展示的收藏会在这里集中出现。", "Pinned links marked for Home appear here.");
  setText("#homeQuickLinksBtn", "打开收藏", "Open Links");

  setText("#homeWeatherTitle", "天气", "Weather");
  setText("#weatherRefresh", "刷新天气", "Refresh Weather");
  setText("#weatherCityBtn", "按城市查询", "Search City");
  setPlaceholder("#weatherCityInput", "输入城市，如 Shanghai", "Enter a city, e.g. Shanghai");

  setText("#homeMiniCalTitle", "今日迷你日历", "Mini Calendar");
  setText("#homeStatTitle", "状态摘要", "Status Summary");
  setText("#homeStatAllLabel", "待办总数", "All Todos");
  setText("#homeStatTodayLabel", "今日截止", "Due Today");
  setText("#homeStatDoingLabel", "进行中", "In Progress");

  setText("#homeFocusTitle", "专注概览", "Focus Overview");
  setText("#homeFocusHint", "查看今天的专注统计，或继续当前番茄钟。", "Check today's focus stats or resume the current session.");
  setText("#homeFocusBtn", "打开专注中心", "Open Focus Hub");

  setText("#homeDataTitle", "数据状态", "Data Status");
  setText("#homeDataHint", "本地数据仍在本机保存，建议定期导出或备份。", "Data stays local in your browser, so regular backups are recommended.");
  setText("#homeDataBtn", "打开数据中心", "Open Data Center");

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
            <div>${escapeHtml(event.title)}</div>
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

  miniCalendarTitleEl.textContent = isEnglish()
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(now)
    : `${year} 年 ${month + 1} 月`;

  const weekdays = isEnglish() ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["一", "二", "三", "四", "五", "六", "日"];
  const heads = weekdays.map((weekday) => `<div class="mini-cal-head">${weekday}</div>`).join("");
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
  const todayKey = formatDayKey(new Date());
  const todayCount = todos.filter((todo) => formatDayKey(todo.dueAtISO) === todayKey && todo.status !== "done").length;
  const doingCount = todos.filter((todo) => todo.status === "doing").length;

  statTodoAllEl.textContent = String(todos.filter((todo) => todo.status !== "archived").length);
  statTodoTodayEl.textContent = String(todayCount);
  statTodoDoingEl.textContent = String(doingCount);
}

function renderQuickLinks() {
  const links = listLinks({ showOnHomeOnly: true, pinnedOnly: true }).slice(0, 6);
  if (links.length === 0) {
    homeQuickLinksEl.innerHTML = `<div class="empty-state">${tr(
      "还没有首页收藏，去快捷收藏页置顶几项高频入口吧。",
      "No quick links on Home yet. Pin a few entries in Link Vault."
    )}</div>`;
    return;
  }

  homeQuickLinksEl.innerHTML = links
    .map(
      (link) => `
        <a class="home-link-card" href="${link.url.startsWith("http") ? link.url : langHref(link.url)}">
          <div class="blog-teaser-meta">
            <span class="pill">${escapeHtml(link.category)}</span>
            <span class="muted">${link.showInLauncher ? tr("启动器可搜", "Launcher searchable") : tr("仅首页", "Home only")}</span>
          </div>
          <h3>${escapeHtml(link.title)}</h3>
          <p>${escapeHtml(link.description || link.url)}</p>
        </a>
      `
    )
    .join("");
}

function renderFocusOverview() {
  const session = getActiveFocusSession();
  const summary = getTodayFocusSummary();
  const todoMap = new Map(listTodos({ includeArchived: true }).map((todo) => [todo.id, todo]));

  if (!session) {
    homeFocusSummaryEl.innerHTML = `
      <div class="focus-summary-main">
        <div>
          <strong>${tr("当前没有运行中的专注", "No active focus session")}</strong>
          <p class="muted">${tr("今天已完成", "Completed today")} ${summary.completedPomodoros} ${tr(
            "个番茄钟，累计",
            "pomodoros and"
          )} ${summary.totalMinutes} ${tr("分钟。", "minutes.")}</p>
        </div>
        <a class="btn btn-primary" href="${langHref("/tools/focus-hub.html")}">${tr("开始专注", "Start Focus")}</a>
      </div>
    `;
    return;
  }

  const todo = todoMap.get(session.relatedTodoId);
  homeFocusSummaryEl.innerHTML = `
    <div class="focus-summary-main">
      <div>
        <strong>${tr("当前进行中", "Now in progress")} · ${focusModeLabel(session.mode)} · ${session.durationMinutes}${tr(" 分钟", " min")}</strong>
        <p class="muted">${todo ? `${tr("关联任务", "Linked task")}: ${escapeHtml(todo.title)} · ` : ""}${tr(
          "开始于",
          "Started"
        )} ${formatShortDateTime(session.startedAtISO)}</p>
      </div>
      <div class="toolbar">
        <a class="btn btn-primary" href="${langHref("/tools/clock.html")}">${tr("继续计时", "Resume Timer")}</a>
        <a class="btn" href="${langHref("/tools/focus-hub.html")}">${tr("查看专注中心", "Open Focus Hub")}</a>
      </div>
    </div>
  `;
}

function renderDataStatus() {
  const snapshots = listSnapshots();
  const latest = snapshots[0];
  const clockState = getState(STORAGE_KEYS.clock, DEFAULT_CLOCK_STATE);

  homeDataStatusEl.innerHTML = `
    <div class="metric-box">
      <div>
        <strong>${getManagedStorageKeys().length}</strong>
        <div class="muted">${tr("个受管数据模块", "managed data keys")}</div>
      </div>
    </div>
    <div class="metric-box">
      <div>
        <strong>${snapshots.length}</strong>
        <div class="muted">${tr("份本地备份", "local backups")}</div>
      </div>
    </div>
    <div class="metric-box">
      <div>
        <strong>${latest ? formatShortDateTime(latest.createdAtISO) : "--"}</strong>
        <div class="muted">${tr("最近备份时间", "latest backup")}</div>
      </div>
    </div>
    <div class="metric-box">
      <div>
        <strong>${clockState.running ? tr("有活跃倒计时", "active countdown") : tr("当前无倒计时", "no countdown")}</strong>
        <div class="muted">${tr("可从数据中心导出完整快照", "Export a full snapshot from Data Center")}</div>
      </div>
    </div>
  `;
}

function renderRecentBlogs() {
  const posts = listBlogPosts({ includeDrafts: true }).slice(0, 4);
  if (posts.length === 0) {
    homeBlogListEl.innerHTML = `<div class="agenda-item"><span class="muted">${tr(
      "还没有博客内容，先去博客工作台生成第一篇结构稿。",
      "No blog content yet. Generate your first structured draft in Blog Studio."
    )}</span></div>`;
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
    window.location.href = langHref("/tools/todo.html?action=new");
  });

  document.getElementById("quickClock").addEventListener("click", () => {
    const target = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    setState(STORAGE_KEYS.clock, {
      ...DEFAULT_CLOCK_STATE,
      countdownTargetISO: target,
      remainingMs: 30 * 60 * 1000,
      running: true,
      muted: getState(STORAGE_KEYS.clock, { muted: false }).muted || false
    });
    window.location.href = langHref("/tools/clock.html");
  });

  document.getElementById("quickEditor").addEventListener("click", () => {
    window.location.href = langHref("/tools/editor.html?action=new");
  });

  document.getElementById("quickBlog").addEventListener("click", () => {
    window.location.href = langHref("/tools/blog-studio.html?action=new");
  });

  document.getElementById("refreshAll").addEventListener("click", () => {
    renderAgenda();
    renderStats();
    renderQuickLinks();
    renderFocusOverview();
    renderDataStatus();
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
  renderQuickLinks();
  renderFocusOverview();
  renderDataStatus();
  renderRecentBlogs();
  bindActions();
  refreshWeatherByGeo();
  mountLauncher();
  applyLangToLinks();

  onStateChanged((detail) => {
    if ([STORAGE_KEYS.todos, STORAGE_KEYS.events].includes(detail.key)) {
      renderAgenda();
      renderStats();
      renderFocusOverview();
    }
    if (detail.key === STORAGE_KEYS.blogPosts) {
      renderRecentBlogs();
    }
    if (detail.key === STORAGE_KEYS.links) {
      renderQuickLinks();
    }
    if ([STORAGE_KEYS.focusSessions, STORAGE_KEYS.clock].includes(detail.key)) {
      renderFocusOverview();
      renderDataStatus();
    }
    if (detail.key === STORAGE_KEYS.dataSnapshots) {
      renderDataStatus();
    }
  });
}

bootstrap();
