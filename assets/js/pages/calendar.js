import {
  STORAGE_KEYS,
  initializeDefaults,
  materializeRecurringTodos,
  onStateChanged
} from "../core/store.js";
import { formatDateTime, formatDayKey } from "../core/date.js";
import { getHolidayMap, syncHolidayFromRemote, readHolidayCache } from "../core/holiday.js";
import { bootI18n, isEnglish, tr, applyLangToLinks, setText } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

initializeDefaults();
bootTheme();
bootI18n();

const calendarEl = document.getElementById("calendar");
const selectedDateLabelEl = document.getElementById("selectedDateLabel");
const selectedHolidayEl = document.getElementById("selectedHoliday");
const dayTaskListEl = document.getElementById("dayTaskList");
const syncBtn = document.getElementById("btnSyncHoliday");
const syncStatusEl = document.getElementById("holidaySyncStatus");
const jumpControlsEl = document.getElementById("calendarJumpControls");
const jumpYearEl = document.getElementById("jumpYear");
const jumpMonthEl = document.getElementById("jumpMonth");

let holidayMap = new Map();
let dayTaskCountMap = new Map();
let currentSelectedDay = formatDayKey(new Date());
let currentViewStart = new Date();
let currentViewEnd = new Date();
let calendar;

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getVisibleYears(start, end) {
  const years = new Set();
  const cursor = new Date(start);
  while (cursor <= end) {
    years.add(cursor.getFullYear());
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return Array.from(years);
}

async function rebuildHolidayMap() {
  const years = getVisibleYears(currentViewStart, currentViewEnd);
  const maps = await Promise.all(years.map((year) => getHolidayMap(year)));
  const merged = new Map();
  maps.forEach((map) => {
    map.forEach((value, key) => merged.set(key, value));
  });
  holidayMap = merged;
}

function rebuildTaskCountMap() {
  const list = materializeRecurringTodos(currentViewStart.toISOString(), currentViewEnd.toISOString()).filter(
    (item) => item.status !== "archived"
  );
  const map = new Map();
  for (const item of list) {
    const key = formatDayKey(item.startISO);
    map.set(key, (map.get(key) || 0) + 1);
  }
  dayTaskCountMap = map;
}

function getLunarText(date) {
  if (!window.Lunar?.fromDate) {
    return "";
  }
  try {
    const lunar = window.Lunar.fromDate(date);
    if (isEnglish()) {
      return `Lunar ${lunar.getMonth()}-${lunar.getDay()}`;
    }
    return `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  } catch (_) {
    return "";
  }
}

function renderDayDetail(dateKey) {
  currentSelectedDay = dateKey;
  selectedDateLabelEl.textContent = dateKey;

  const holiday = holidayMap.get(dateKey);
  if (holiday) {
    const type = holiday.type === "holiday" ? tr("法定节假日", "Public holiday") : tr("调休工作日", "Adjusted workday");
    selectedHolidayEl.innerHTML = `<strong>${holiday.name}</strong> · ${type}`;
  } else {
    selectedHolidayEl.textContent = tr("暂无节假日信息", "No holiday info");
  }

  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(`${dateKey}T23:59:59`);
  const items = materializeRecurringTodos(start.toISOString(), end.toISOString())
    .filter((item) => item.status !== "archived")
    .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());

  if (items.length === 0) {
    dayTaskListEl.innerHTML = `<li class="day-task-item muted">${tr("当日暂无任务", "No tasks on this day")}</li>`;
    return;
  }

  dayTaskListEl.innerHTML = items
    .map((item) => {
      const statusText =
        item.status === "doing"
          ? tr("进行中", "In progress")
          : item.status === "done"
          ? tr("已完成", "Done")
          : tr("待办", "Todo");
      return `
      <li class="day-task-item">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <strong>${htmlEscape(item.title)}</strong>
          <span class="tag ${item.priority}">${item.priority}</span>
        </div>
        <div class="muted" style="font-size:12px">${formatDateTime(item.startISO)} · ${statusText}</div>
      </li>
    `;
    })
    .join("");
}

function buildEvents(info, successCallback) {
  const events = materializeRecurringTodos(info.start.toISOString(), info.end.toISOString())
    .filter((item) => item.status !== "archived")
    .map((item) => ({
      id: item.occurrenceId,
      title: item.title,
      start: item.startISO,
      end: item.startISO,
      allDay: false,
      backgroundColor: item.priority === "high" ? "#ff6b6b" : item.priority === "low" ? "#2fd38c" : "#72a8ff",
      borderColor: "transparent",
      textColor: "#0b1120"
    }));
  successCallback(events);
}

async function refreshCalendarDecorations() {
  rebuildTaskCountMap();
  await rebuildHolidayMap();
  calendar.updateSize();
  renderDayDetail(currentSelectedDay);
}

function fillJumpYearOptions() {
  if (!jumpYearEl) {
    return;
  }
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear - 8; year <= currentYear + 12; year += 1) {
    years.push(`<option value="${year}">${isEnglish() ? `${year}` : `${year} 年`}</option>`);
  }
  jumpYearEl.innerHTML = years.join("");
}

function fillJumpMonthOptions() {
  if (!jumpMonthEl) {
    return;
  }
  jumpMonthEl.innerHTML = Array.from({ length: 12 })
    .map((_, idx) => {
      const month = idx + 1;
      const label = isEnglish()
        ? new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(2026, idx, 1))
        : `${month} 月`;
      return `<option value="${month}">${label}</option>`;
    })
    .join("");
}

function syncJumpControlsByDate(dateValue) {
  if (!jumpYearEl || !jumpMonthEl) {
    return;
  }
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  jumpYearEl.value = String(d.getFullYear());
  jumpMonthEl.value = String(d.getMonth() + 1);
}

function jumpToSelectedYearMonth() {
  if (!jumpYearEl || !jumpMonthEl) {
    return;
  }
  const year = Number(jumpYearEl.value);
  const month = Number(jumpMonthEl.value);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return;
  }
  calendar.gotoDate(new Date(year, month - 1, 1));
}

function mountJumpControlsToToolbar() {
  if (!jumpControlsEl) {
    return;
  }
  const rightChunk = calendarEl.querySelector(".fc-toolbar .fc-toolbar-chunk:last-child");
  if (!rightChunk) {
    return;
  }
  if (jumpControlsEl.parentElement !== rightChunk) {
    rightChunk.appendChild(jumpControlsEl);
  }
}

function createCalendar() {
  calendar = new window.FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: isEnglish() ? "en" : "zh-cn",
    height: "100%",
    firstDay: 1,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek"
    },
    buttonText: {
      today: tr("今天", "Today"),
      month: tr("月", "Month"),
      week: tr("周", "Week")
    },
    dayMaxEvents: true,
    datesSet: async (info) => {
      currentViewStart = info.start;
      currentViewEnd = info.end;
      const isMonthView = info.view.type === "dayGridMonth";
      calendarEl.classList.toggle("is-month-view", isMonthView);
      calendarEl.classList.toggle("is-week-view", !isMonthView);
      mountJumpControlsToToolbar();
      syncJumpControlsByDate(info.view.currentStart || info.start);
      await refreshCalendarDecorations();
    },
    events: buildEvents,
    eventTimeFormat: {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    },
    dayCellContent: (arg) => {
      const dayKey = formatDayKey(arg.date);
      const lunar = getLunarText(arg.date);
      const holiday = holidayMap.get(dayKey);
      const taskCount = dayTaskCountMap.get(dayKey) || 0;
      const tagHtml = [];
      if (holiday) {
        tagHtml.push(`<span class="day-tag ${holiday.type}">${htmlEscape(holiday.name)}</span>`);
      }
      if (taskCount > 0) {
        tagHtml.push(`<span class="day-tag">${taskCount}${tr("任务", " tasks")}</span>`);
      }
      return {
        html: `
          <div class="day-cell">
            <span class="day-solar">${arg.date.getDate()}</span>
            <span class="day-lunar">${htmlEscape(lunar)}</span>
            <span class="day-tags">${tagHtml.join("")}</span>
          </div>
        `
      };
    },
    dateClick: (arg) => {
      renderDayDetail(formatDayKey(arg.date));
    }
  });

  calendar.render();
}

async function handleHolidaySync() {
  syncBtn.disabled = true;
  syncStatusEl.textContent = tr("同步中...", "Syncing...");

  const years = getVisibleYears(currentViewStart, currentViewEnd);
  const results = await Promise.allSettled(years.map((year) => syncHolidayFromRemote(year)));
  const okCount = results.filter((r) => r.status === "fulfilled").length;

  if (okCount > 0) {
    syncStatusEl.textContent = isEnglish() ? `Updated ${okCount} year(s)` : `已更新 ${okCount} 年`;
  } else {
    syncStatusEl.textContent = tr("同步失败，使用内置", "Sync failed, using builtin data");
  }

  await refreshCalendarDecorations();
  syncBtn.disabled = false;
}

function updateSyncStatusFromCache() {
  const cache = readHolidayCache();
  if (cache.updatedAtISO) {
    syncStatusEl.textContent = isEnglish()
      ? `Cached ${formatDateTime(cache.updatedAtISO)}`
      : `缓存 ${formatDateTime(cache.updatedAtISO)}`;
  } else {
    syncStatusEl.textContent = tr("内置数据", "Builtin data");
  }
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 全屏日历", "BaoXiangGao Tools - Calendar");
  setText("#calendarBrandTitle", "农历 + 法定节假日日历", "Lunar + China Public Holiday Calendar");
  setText("#calendarBackHomeBtn", "返回首页", "Back Home");
  setText("#btnSyncHoliday", "同步节假日", "Sync Holidays");
  selectedDateLabelEl.textContent = tr("请选择日期", "Select a date");
  selectedHolidayEl.textContent = tr("暂无节假日信息", "No holiday info");
  setText("#calendarDetailTitle", "日期详情", "Date Detail");
  setText("#calendarDayTaskTitle", "当日任务", "Tasks of the Day");

  jumpYearEl?.setAttribute("aria-label", tr("选择年份", "Select year"));
  jumpMonthEl?.setAttribute("aria-label", tr("选择月份", "Select month"));
}

function bindActions() {
  syncBtn.addEventListener("click", handleHolidaySync);
  if (jumpMonthEl) {
    jumpMonthEl.addEventListener("change", jumpToSelectedYearMonth);
  }
  if (jumpYearEl) {
    jumpYearEl.addEventListener("change", jumpToSelectedYearMonth);
  }
  onStateChanged((detail) => {
    if (detail.key === STORAGE_KEYS.todos) {
      rebuildTaskCountMap();
      calendar.refetchEvents();
      renderDayDetail(currentSelectedDay);
    }
  });
}

async function bootstrap() {
  applyStaticI18n();
  fillJumpYearOptions();
  fillJumpMonthOptions();
  createCalendar();
  mountJumpControlsToToolbar();
  await refreshCalendarDecorations();
  renderDayDetail(currentSelectedDay);
  updateSyncStatusFromCache();
  bindActions();
  applyLangToLinks();
}

bootstrap();
