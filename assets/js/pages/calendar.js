import {
  STORAGE_KEYS,
  initializeDefaults,
  materializeRecurringTodos,
  onStateChanged
} from "../core/store.js";
import { formatDateTime, formatDayKey } from "../core/date.js";
import { getHolidayMap, syncHolidayFromRemote, readHolidayCache } from "../core/holiday.js";

initializeDefaults();

const calendarEl = document.getElementById("calendar");
const selectedDateLabelEl = document.getElementById("selectedDateLabel");
const selectedHolidayEl = document.getElementById("selectedHoliday");
const dayTaskListEl = document.getElementById("dayTaskList");
const syncBtn = document.getElementById("btnSyncHoliday");
const syncStatusEl = document.getElementById("holidaySyncStatus");

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
    const type = holiday.type === "holiday" ? "法定节假日" : "调休工作日";
    selectedHolidayEl.innerHTML = `<strong>${holiday.name}</strong> · ${type}`;
  } else {
    selectedHolidayEl.textContent = "暂无节假日信息";
  }

  const start = new Date(`${dateKey}T00:00:00`);
  const end = new Date(`${dateKey}T23:59:59`);
  const items = materializeRecurringTodos(start.toISOString(), end.toISOString())
    .filter((item) => item.status !== "archived")
    .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());

  if (items.length === 0) {
    dayTaskListEl.innerHTML = '<li class="day-task-item muted">当日暂无任务</li>';
    return;
  }

  dayTaskListEl.innerHTML = items
    .map((item) => {
      const statusText = item.status === "doing" ? "进行中" : item.status === "done" ? "已完成" : "待办";
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
  calendar.render();
  renderDayDetail(currentSelectedDay);
}

function createCalendar() {
  calendar = new window.FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "zh-cn",
    height: "100%",
    firstDay: 1,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek"
    },
    buttonText: {
      today: "今天",
      month: "月",
      week: "周"
    },
    dayMaxEvents: true,
    datesSet: async (info) => {
      currentViewStart = info.start;
      currentViewEnd = info.end;
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
        tagHtml.push(`<span class="day-tag">${taskCount}任务</span>`);
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
  syncStatusEl.textContent = "同步中...";

  const years = getVisibleYears(currentViewStart, currentViewEnd);
  const results = await Promise.allSettled(years.map((year) => syncHolidayFromRemote(year)));
  const okCount = results.filter((r) => r.status === "fulfilled").length;

  if (okCount > 0) {
    syncStatusEl.textContent = `已更新 ${okCount} 年`;
  } else {
    syncStatusEl.textContent = "同步失败，使用内置";
  }

  await refreshCalendarDecorations();
  syncBtn.disabled = false;
}

function updateSyncStatusFromCache() {
  const cache = readHolidayCache();
  if (cache.updatedAtISO) {
    syncStatusEl.textContent = `缓存 ${formatDateTime(cache.updatedAtISO)}`;
  } else {
    syncStatusEl.textContent = "内置数据";
  }
}

function bindActions() {
  syncBtn.addEventListener("click", handleHolidaySync);
  onStateChanged((detail) => {
    if (detail.key === STORAGE_KEYS.todos) {
      rebuildTaskCountMap();
      calendar.refetchEvents();
      renderDayDetail(currentSelectedDay);
    }
  });
}

async function bootstrap() {
  createCalendar();
  await refreshCalendarDecorations();
  renderDayDetail(currentSelectedDay);
  updateSyncStatusFromCache();
  bindActions();
}

bootstrap();
