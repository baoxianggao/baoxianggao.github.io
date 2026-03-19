/**
 * @typedef {"none"|"hourly"|"daily"|"weekly"|"monthly"} RepeatRule
 * @typedef {"todo"|"doing"|"done"|"archived"} TodoStatus
 * @typedef {"pomodoro"|"shortBreak"|"longBreak"|"custom"} FocusMode
 * @typedef {"running"|"completed"|"cancelled"} FocusStatus
 *
 * @typedef {Object} TodoItem
 * @property {string} id
 * @property {string} title
 * @property {string} note
 * @property {string} dueAtISO
 * @property {RepeatRule} repeat
 * @property {TodoStatus} status
 * @property {"low"|"medium"|"high"} priority
 * @property {string[]} tags
 * @property {string} createdAtISO
 * @property {string} updatedAtISO
 *
 * @typedef {Object} QuickLink
 * @property {string} id
 * @property {string} title
 * @property {string} url
 * @property {string} category
 * @property {string[]} tags
 * @property {string} description
 * @property {boolean} pinned
 * @property {boolean} showOnHome
 * @property {boolean} showInLauncher
 * @property {string} createdAtISO
 * @property {string} updatedAtISO
 *
 * @typedef {Object} FocusSession
 * @property {string} id
 * @property {FocusMode} mode
 * @property {number} durationMinutes
 * @property {string} startedAtISO
 * @property {string} endedAtISO
 * @property {FocusStatus} status
 * @property {string} relatedTodoId
 * @property {string} note
 *
 * @typedef {Object} FocusSettings
 * @property {number} pomodoroMinutes
 * @property {number} shortBreakMinutes
 * @property {number} longBreakMinutes
 * @property {boolean} autoStartBreak
 * @property {boolean} autoStartNext
 * @property {boolean} muted
 *
 * @typedef {Object} AppSnapshot
 * @property {string} id
 * @property {string} createdAtISO
 * @property {string} version
 * @property {string[]} keys
 * @property {Record<string, unknown>} payload
 *
 * @typedef {Object} ScheduleEvent
 * @property {string} id
 * @property {string} source
 * @property {string} title
 * @property {string} startISO
 * @property {string} endISO
 * @property {string} relatedTodoId
 *
 * @typedef {Object} HolidayEntry
 * @property {string} date
 * @property {"holiday"|"workday"} type
 * @property {string} name
 * @property {string} source
 */

export const STORAGE_KEYS = Object.freeze({
  settings: "bxg.tools.v1.settings",
  todos: "bxg.tools.v1.todos",
  events: "bxg.tools.v1.events",
  editorDocs: "bxg.tools.v1.editor_docs",
  clock: "bxg.tools.v1.clock",
  holidayCache: "bxg.tools.v1.holiday_cache",
  blogPosts: "bxg.tools.v1.blog_posts",
  links: "bxg.tools.v1.links",
  focusSessions: "bxg.tools.v1.focus_sessions",
  focusSettings: "bxg.tools.v1.focus_settings",
  launcherRecent: "bxg.tools.v1.launcher_recent",
  dataSnapshots: "bxg.tools.v1.data_snapshots"
});

export const DEFAULT_SETTINGS = Object.freeze({
  language: "zh-CN",
  timezone: "Asia/Shanghai",
  theme: "pro-minimal",
  jsonToolboxRecentSamples: []
});

export const DEFAULT_CLOCK_STATE = Object.freeze({
  countdownTargetISO: "",
  remainingMs: 0,
  running: false,
  muted: false,
  source: "manual",
  mode: "",
  label: "",
  relatedTodoId: "",
  returnHref: "",
  sessionId: ""
});

export const DEFAULT_FOCUS_SETTINGS = Object.freeze({
  pomodoroMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreak: false,
  autoStartNext: false,
  muted: false
});

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : deepClone(fallback);
  } catch (_) {
    return deepClone(fallback);
  }
}

export function emitStateChanged(key, value) {
  window.dispatchEvent(
    new CustomEvent("bxg:state-changed", {
      detail: { key, value }
    })
  );
}

export function removeState(key) {
  localStorage.removeItem(key);
  emitStateChanged(key, null);
}

export function uid(prefix = "id") {
  if (window.crypto?.randomUUID) {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function toISO(value, fallbackISO = new Date().toISOString()) {
  if (!value) {
    return fallbackISO;
  }
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) {
    return fallbackISO;
  }
  return new Date(ms).toISOString();
}

export function normalizeTags(tags, limit = 8) {
  if (!Array.isArray(tags)) {
    if (typeof tags === "string") {
      return tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, limit);
    }
    return [];
  }
  return tags.map((item) => String(item).trim()).filter(Boolean).slice(0, limit);
}

function normalizeJsonToolboxSamples(samples) {
  if (!Array.isArray(samples)) {
    return [];
  }
  return samples
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function normalizeSettings(settings) {
  const incoming = typeof settings === "object" && settings ? settings : {};
  return {
    ...DEFAULT_SETTINGS,
    ...incoming,
    jsonToolboxRecentSamples: normalizeJsonToolboxSamples(incoming.jsonToolboxRecentSamples)
  };
}

export function normalizeClockState(state) {
  const incoming = typeof state === "object" && state ? state : {};
  return {
    ...DEFAULT_CLOCK_STATE,
    ...incoming,
    countdownTargetISO: incoming.countdownTargetISO ? toISO(incoming.countdownTargetISO, "") : "",
    remainingMs: Math.max(0, Number(incoming.remainingMs) || 0),
    running: Boolean(incoming.running),
    muted: Boolean(incoming.muted),
    source: String(incoming.source || DEFAULT_CLOCK_STATE.source),
    mode: String(incoming.mode || ""),
    label: String(incoming.label || ""),
    relatedTodoId: String(incoming.relatedTodoId || ""),
    returnHref: String(incoming.returnHref || ""),
    sessionId: String(incoming.sessionId || "")
  };
}

/**
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
export function getState(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return deepClone(fallback);
  }
  return safeParse(raw, fallback);
}

/**
 * @param {string} key
 * @param {unknown} value
 */
export function setState(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  emitStateChanged(key, value);
}

export function getSettings() {
  return normalizeSettings(getState(STORAGE_KEYS.settings, DEFAULT_SETTINGS));
}

export function updateSettings(patch) {
  const next = normalizeSettings({
    ...getSettings(),
    ...(typeof patch === "object" && patch ? patch : {})
  });
  setState(STORAGE_KEYS.settings, next);
  return next;
}

/**
 * @param {unknown} todo
 * @returns {TodoItem}
 */
function normalizeTodo(todo) {
  const nowISO = new Date().toISOString();
  const incoming = typeof todo === "object" && todo ? todo : {};
  return {
    id: String(incoming.id || uid("todo")),
    title: String(incoming.title || "未命名任务").trim() || "未命名任务",
    note: String(incoming.note || "").trim(),
    dueAtISO: toISO(incoming.dueAtISO || incoming.dueAt || nowISO),
    repeat: ["none", "hourly", "daily", "weekly", "monthly"].includes(incoming.repeat)
      ? incoming.repeat
      : "none",
    status: ["todo", "doing", "done", "archived"].includes(incoming.status)
      ? incoming.status
      : "todo",
    priority: ["low", "medium", "high"].includes(incoming.priority) ? incoming.priority : "medium",
    tags: normalizeTags(incoming.tags),
    createdAtISO: toISO(incoming.createdAtISO || nowISO),
    updatedAtISO: toISO(incoming.updatedAtISO || nowISO)
  };
}

function getTodosRaw() {
  const todos = getState(STORAGE_KEYS.todos, []);
  if (!Array.isArray(todos)) {
    return [];
  }
  return todos.map(normalizeTodo);
}

function persistTodos(todos) {
  const clean = todos.map(normalizeTodo);
  setState(STORAGE_KEYS.todos, clean);
}

/**
 * @param {Partial<TodoItem>} todo
 * @returns {TodoItem}
 */
export function upsertTodo(todo) {
  const normalized = normalizeTodo(todo);
  const todos = getTodosRaw();
  const index = todos.findIndex((item) => item.id === normalized.id);
  const withUpdatedTime = {
    ...normalized,
    updatedAtISO: new Date().toISOString()
  };
  if (index >= 0) {
    todos[index] = {
      ...todos[index],
      ...withUpdatedTime,
      createdAtISO: todos[index].createdAtISO
    };
  } else {
    todos.push(withUpdatedTime);
  }
  persistTodos(todos);
  return withUpdatedTime;
}

/**
 * @param {string} id
 */
export function removeTodo(id) {
  const todos = getTodosRaw().filter((todo) => todo.id !== id);
  persistTodos(todos);
}

/**
 * @param {Object} [filter]
 * @param {TodoStatus[]} [filter.statuses]
 * @param {TodoStatus} [filter.status]
 * @param {boolean} [filter.includeArchived]
 * @param {string} [filter.search]
 * @param {string} [filter.dueFromISO]
 * @param {string} [filter.dueToISO]
 * @returns {TodoItem[]}
 */
export function listTodos(filter = {}) {
  const {
    status,
    statuses,
    includeArchived = false,
    search,
    dueFromISO,
    dueToISO
  } = filter;

  const statusSet = new Set(statuses || (status ? [status] : []));
  const dueFromMs = dueFromISO ? new Date(dueFromISO).getTime() : null;
  const dueToMs = dueToISO ? new Date(dueToISO).getTime() : null;
  const keyword = String(search || "").trim().toLowerCase();

  return getTodosRaw()
    .filter((todo) => (includeArchived ? true : todo.status !== "archived"))
    .filter((todo) => (statusSet.size > 0 ? statusSet.has(todo.status) : true))
    .filter((todo) => {
      if (!keyword) {
        return true;
      }
      return `${todo.title} ${todo.note} ${todo.tags.join(" ")}`.toLowerCase().includes(keyword);
    })
    .filter((todo) => {
      const dueMs = new Date(todo.dueAtISO).getTime();
      if (dueFromMs !== null && dueMs < dueFromMs) {
        return false;
      }
      if (dueToMs !== null && dueMs > dueToMs) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(a.dueAtISO).getTime() - new Date(b.dueAtISO).getTime());
}

function addByRepeat(baseMs, repeat) {
  const date = new Date(baseMs);
  if (repeat === "hourly") {
    date.setHours(date.getHours() + 1);
  } else if (repeat === "daily") {
    date.setDate(date.getDate() + 1);
  } else if (repeat === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (repeat === "monthly") {
    date.setMonth(date.getMonth() + 1);
  }
  return date.getTime();
}

/**
 * @param {string} rangeStartISO
 * @param {string} rangeEndISO
 */
export function materializeRecurringTodos(rangeStartISO, rangeEndISO) {
  const startMs = new Date(rangeStartISO).getTime();
  const endMs = new Date(rangeEndISO).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs > endMs) {
    return [];
  }

  const todos = listTodos({ includeArchived: true });
  const materialized = [];

  for (const todo of todos) {
    if (todo.status === "archived") {
      continue;
    }
    if (todo.status === "done" && todo.repeat === "none") {
      continue;
    }

    const dueMs = new Date(todo.dueAtISO).getTime();
    if (Number.isNaN(dueMs)) {
      continue;
    }

    if (todo.repeat === "none") {
      if (dueMs >= startMs && dueMs <= endMs) {
        materialized.push({
          occurrenceId: `${todo.id}__${dueMs}`,
          todoId: todo.id,
          title: todo.title,
          note: todo.note,
          priority: todo.priority,
          status: todo.status,
          repeat: todo.repeat,
          startISO: new Date(dueMs).toISOString(),
          dueAtISO: todo.dueAtISO,
          tags: todo.tags
        });
      }
      continue;
    }

    let currentMs = dueMs;
    let guard = 0;
    while (currentMs < startMs && guard < 2400) {
      currentMs = addByRepeat(currentMs, todo.repeat);
      guard += 1;
    }

    let emitted = 0;
    while (currentMs <= endMs && emitted < 500) {
      materialized.push({
        occurrenceId: `${todo.id}__${currentMs}`,
        todoId: todo.id,
        title: todo.title,
        note: todo.note,
        priority: todo.priority,
        status: todo.status,
        repeat: todo.repeat,
        startISO: new Date(currentMs).toISOString(),
        dueAtISO: todo.dueAtISO,
        tags: todo.tags
      });
      currentMs = addByRepeat(currentMs, todo.repeat);
      emitted += 1;
    }
  }

  return materialized.sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());
}

/**
 * @param {number} [hours]
 * @returns {ScheduleEvent[]}
 */
export function listUpcomingEvents(hours = 72) {
  const nowMs = Date.now();
  const endMs = nowMs + Math.max(1, hours) * 60 * 60 * 1000;

  const todoEvents = materializeRecurringTodos(new Date(nowMs).toISOString(), new Date(endMs).toISOString())
    .filter((item) => item.status !== "done" && item.status !== "archived")
    .map((item) => ({
      id: `todo__${item.occurrenceId}`,
      source: "todo",
      title: item.title,
      startISO: item.startISO,
      endISO: item.startISO,
      relatedTodoId: item.todoId,
      priority: item.priority,
      tags: item.tags
    }));

  const manualEvents = getState(STORAGE_KEYS.events, [])
    .filter((event) => event?.startISO)
    .map((event) => ({
      id: String(event.id || uid("event")),
      source: "manual",
      title: String(event.title || "未命名日程"),
      startISO: toISO(event.startISO),
      endISO: toISO(event.endISO || event.startISO),
      relatedTodoId: String(event.relatedTodoId || "")
    }))
    .filter((event) => {
      const startMs = new Date(event.startISO).getTime();
      return startMs >= nowMs && startMs <= endMs;
    });

  return [...todoEvents, ...manualEvents].sort(
    (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
  );
}

export function initializeDefaults() {
  setState(STORAGE_KEYS.settings, normalizeSettings(getState(STORAGE_KEYS.settings, DEFAULT_SETTINGS)));

  if (localStorage.getItem(STORAGE_KEYS.todos) === null) {
    setState(STORAGE_KEYS.todos, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.events) === null) {
    setState(STORAGE_KEYS.events, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.editorDocs) === null) {
    setState(STORAGE_KEYS.editorDocs, []);
  }
  setState(STORAGE_KEYS.clock, normalizeClockState(getState(STORAGE_KEYS.clock, DEFAULT_CLOCK_STATE)));

  if (localStorage.getItem(STORAGE_KEYS.holidayCache) === null) {
    setState(STORAGE_KEYS.holidayCache, { updatedAtISO: "", years: {} });
  }
  if (localStorage.getItem(STORAGE_KEYS.blogPosts) === null) {
    setState(STORAGE_KEYS.blogPosts, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.links) === null) {
    setState(STORAGE_KEYS.links, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.focusSessions) === null) {
    setState(STORAGE_KEYS.focusSessions, []);
  }
  setState(
    STORAGE_KEYS.focusSettings,
    {
      ...DEFAULT_FOCUS_SETTINGS,
      ...getState(STORAGE_KEYS.focusSettings, DEFAULT_FOCUS_SETTINGS)
    }
  );
  if (localStorage.getItem(STORAGE_KEYS.launcherRecent) === null) {
    setState(STORAGE_KEYS.launcherRecent, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.dataSnapshots) === null) {
    setState(STORAGE_KEYS.dataSnapshots, []);
  }
}

export function onStateChanged(handler) {
  const customHandler = (event) => handler(event.detail);
  const storageHandler = (event) => {
    handler({ key: event.key, value: safeParse(event.newValue, null) });
  };

  window.addEventListener("bxg:state-changed", customHandler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener("bxg:state-changed", customHandler);
    window.removeEventListener("storage", storageHandler);
  };
}
