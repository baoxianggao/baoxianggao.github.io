import {
  STORAGE_KEYS,
  getState,
  setState,
  listTodos,
  listUpcomingEvents,
  initializeDefaults,
  onStateChanged
} from "../core/store.js";
import { formatDate, formatDayKey, formatTime } from "../core/date.js";
import { resolveWeatherByGeoOrCity, geocodeCity, getWeatherByCoords } from "../core/weather.js";

initializeDefaults();

const toolList = [
  { name: "全屏日历", desc: "农历、法定节假日、任务联动", href: "/tools/calendar.html" },
  { name: "全屏时钟", desc: "高精度时钟 + 倒计时", href: "/tools/clock.html" },
  { name: "文本编辑器", desc: "Markdown/代码/图片编辑与导出", href: "/tools/editor.html" },
  { name: "TodoList", desc: "任务管理，支持小时/日/周/月重复", href: "/tools/todo.html" },
  { name: "Markdown 转 PDF", desc: "渲染后导出 PDF", href: "/tools/markdown-pdf.html" },
  { name: "JSON 工具箱", desc: "格式化、校验、JSON/YAML 转换", href: "/tools/json-toolbox.html" },
  { name: "颜色实验室", desc: "调色板、对比度、CSS 变量", href: "/tools/color-lab.html" }
];

const toolGridEl = document.getElementById("toolGrid");
const agendaListEl = document.getElementById("agendaList");
const miniCalendarEl = document.getElementById("miniCalendar");
const miniCalendarTitleEl = document.getElementById("miniCalendarTitle");
const statTodoAllEl = document.getElementById("statTodoAll");
const statTodoTodayEl = document.getElementById("statTodoToday");
const statTodoDoingEl = document.getElementById("statTodoDoing");
const weatherTempEl = document.getElementById("weatherTemp");
const weatherTextEl = document.getElementById("weatherText");
const weatherMetaEl = document.getElementById("weatherMeta");
const weatherRefreshBtn = document.getElementById("weatherRefresh");
const weatherCityInput = document.getElementById("weatherCityInput");
const weatherCityBtn = document.getElementById("weatherCityBtn");

function renderToolGrid() {
  toolGridEl.innerHTML = toolList
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
    agendaListEl.innerHTML = '<li class="agenda-item"><span class="muted">未来 72 小时暂无日程</span></li>';
    return;
  }

  agendaListEl.innerHTML = events
    .map((event) => {
      const date = new Date(event.startISO);
      return `
        <li class="agenda-item">
          <div class="agenda-time">${formatDate(date)}<br/>${formatTime(date)}</div>
          <div>
            <div>${event.title}</div>
            <div class="muted" style="font-size:12px">${event.source === "todo" ? "来自 TODO" : "手动日程"}</div>
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

  miniCalendarTitleEl.textContent = `${year} 年 ${month + 1} 月`;

  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
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

function setWeatherLoading(text = "天气加载中...") {
  weatherTempEl.textContent = "--°";
  weatherTextEl.textContent = text;
  weatherMetaEl.textContent = "--";
}

function applyWeather(weather) {
  weatherTempEl.textContent = `${Math.round(weather.temperature)}°`;
  weatherTextEl.textContent = `${weather.weatherText} · 湿度 ${weather.humidity}%`;
  weatherMetaEl.textContent = `${weather.city || "当前位置"} · 风速 ${weather.windSpeed}km/h`;
}

async function refreshWeatherByGeo() {
  setWeatherLoading();
  try {
    const weather = await resolveWeatherByGeoOrCity("Shanghai");
    applyWeather(weather);
  } catch (error) {
    weatherTempEl.textContent = "--°";
    weatherTextEl.textContent = "天气获取失败";
    weatherMetaEl.textContent = error.message;
  }
}

async function refreshWeatherByCity(city) {
  if (!city) {
    return;
  }
  setWeatherLoading("城市天气加载中...");
  try {
    const geo = await geocodeCity(city);
    const weather = await getWeatherByCoords(geo.latitude, geo.longitude);
    applyWeather({ ...weather, city: geo.city, country: geo.country });
  } catch (error) {
    weatherTextEl.textContent = "城市查询失败";
    weatherMetaEl.textContent = error.message;
  }
}

function bindActions() {
  document.getElementById("quickTodo").addEventListener("click", () => {
    window.location.href = "/tools/todo.html";
  });

  document.getElementById("quickClock").addEventListener("click", () => {
    const target = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    setState(STORAGE_KEYS.clock, {
      countdownTargetISO: target,
      remainingMs: 0,
      running: true,
      muted: getState(STORAGE_KEYS.clock, { muted: false }).muted || false
    });
    window.location.href = "/tools/clock.html";
  });

  document.getElementById("quickEditor").addEventListener("click", () => {
    window.location.href = "/tools/editor.html";
  });

  document.getElementById("refreshAll").addEventListener("click", () => {
    renderAgenda();
    renderStats();
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
  renderToolGrid();
  renderAgenda();
  renderMiniCalendar();
  renderStats();
  bindActions();
  refreshWeatherByGeo();

  onStateChanged((detail) => {
    if ([STORAGE_KEYS.todos, STORAGE_KEYS.events].includes(detail.key)) {
      renderAgenda();
      renderStats();
    }
  });
}

bootstrap();
