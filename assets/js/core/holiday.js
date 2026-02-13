import { STORAGE_KEYS, getState, setState } from "./store.js";

const REMOTE_SOURCES = [
  "https://raw.githubusercontent.com/lanceliao/china-holiday-calender/master/holidayAPI.json",
  "https://cdn.jsdelivr.net/gh/lanceliao/china-holiday-calender@master/holidayAPI.json"
];

function withTimeout(promiseFactory, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return promiseFactory(controller.signal).finally(() => clearTimeout(timer));
}

async function fetchJSON(url, timeoutMs = 10000) {
  const response = await withTimeout((signal) => fetch(url, { signal }), timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function dateRange(startDate, endDate) {
  const result = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    result.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return result;
}

function normalizeEntry(entry, source = "builtin") {
  if (!entry || !entry.date) {
    return null;
  }
  return {
    date: String(entry.date).slice(0, 10),
    type: entry.type === "workday" ? "workday" : "holiday",
    name: String(entry.name || "节假日"),
    source
  };
}

function parseHolidayApiYearRows(rows) {
  const entries = [];
  for (const row of rows || []) {
    const name = String(row.Name || "节假日");
    for (const date of dateRange(row.StartDate, row.EndDate)) {
      entries.push({ date, type: "holiday", name, source: "remote-cache" });
    }
    for (const date of row.CompDays || []) {
      entries.push({ date: String(date).slice(0, 10), type: "workday", name: `${name}调休`, source: "remote-cache" });
    }
  }
  return entries;
}

function mergeEntries(...buckets) {
  const map = new Map();
  for (const bucket of buckets) {
    for (const item of bucket || []) {
      const normalized = normalizeEntry(item, item?.source || "builtin");
      if (normalized) {
        map.set(normalized.date, normalized);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function loadBuiltinHolidays(year) {
  try {
    const data = await fetchJSON(`/assets/data/holidays/cn-${year}.json`, 8000);
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .map((item) => normalizeEntry(item, "builtin"))
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (_) {
    return [];
  }
}

export function readHolidayCache() {
  const cache = getState(STORAGE_KEYS.holidayCache, { updatedAtISO: "", years: {} });
  if (!cache?.years || typeof cache.years !== "object") {
    return { updatedAtISO: "", years: {} };
  }
  return cache;
}

export async function getHolidayMap(year) {
  const builtin = await loadBuiltinHolidays(year);
  const cache = readHolidayCache();
  const cachedEntries = Array.isArray(cache.years?.[String(year)]) ? cache.years[String(year)] : [];
  const merged = mergeEntries(builtin, cachedEntries);
  return new Map(merged.map((item) => [item.date, item]));
}

export async function syncHolidayFromRemote(year) {
  const y = String(year);
  const errors = [];

  for (const source of REMOTE_SOURCES) {
    try {
      const payload = await fetchJSON(source, 12000);
      const rows = payload?.Years?.[y];
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(`Year ${year} not found in source`);
      }
      const entries = parseHolidayApiYearRows(rows);
      const cache = readHolidayCache();
      const years = { ...(cache.years || {}) };
      years[y] = mergeEntries(entries);
      setState(STORAGE_KEYS.holidayCache, {
        updatedAtISO: new Date().toISOString(),
        source,
        years
      });
      return {
        year,
        count: years[y].length,
        source,
        updatedAtISO: new Date().toISOString()
      };
    } catch (error) {
      errors.push(`${source}: ${error.message}`);
    }
  }

  throw new Error(errors.join("\n"));
}
