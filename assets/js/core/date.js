export const DEFAULT_TIMEZONE = "Asia/Shanghai";

function partsByTimezone(value, timeZone = DEFAULT_TIMEZONE) {
  const date = value instanceof Date ? value : new Date(value);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const map = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  return map;
}

export function formatDayKey(value, timeZone = DEFAULT_TIMEZONE) {
  const p = partsByTimezone(value, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function formatTime(value, timeZone = DEFAULT_TIMEZONE) {
  const p = partsByTimezone(value, timeZone);
  return `${p.hour}:${p.minute}`;
}

export function formatDate(value, timeZone = DEFAULT_TIMEZONE, locale = "zh-CN") {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(date);
}

export function formatDateTime(value, timeZone = DEFAULT_TIMEZONE, locale = "zh-CN") {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

export function toInputDateTimeValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function endOfToday() {
  const d = startOfToday();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(value = new Date()) {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}

export function endOfWeek(value = new Date()) {
  const d = startOfWeek(value);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(value = new Date()) {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(value = new Date()) {
  const d = startOfMonth(value);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function isSameDay(a, b) {
  return formatDayKey(a, DEFAULT_TIMEZONE) === formatDayKey(b, DEFAULT_TIMEZONE);
}

export function addHours(value, amount) {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  d.setHours(d.getHours() + amount);
  return d;
}
