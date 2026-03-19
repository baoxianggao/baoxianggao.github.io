import { formatDayKey } from "./date.js";
import {
  DEFAULT_FOCUS_SETTINGS,
  STORAGE_KEYS,
  getState,
  normalizeClockState,
  setState,
  toISO,
  uid
} from "./store.js";

const FOCUS_MODES = new Set(["pomodoro", "shortBreak", "longBreak", "custom"]);
const FOCUS_STATUSES = new Set(["running", "completed", "cancelled"]);

function clampMinutes(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(1, Math.min(240, Math.round(number)));
}

function normalizeFocusSettings(settings) {
  const incoming = typeof settings === "object" && settings ? settings : {};
  return {
    pomodoroMinutes: clampMinutes(incoming.pomodoroMinutes, DEFAULT_FOCUS_SETTINGS.pomodoroMinutes),
    shortBreakMinutes: clampMinutes(incoming.shortBreakMinutes, DEFAULT_FOCUS_SETTINGS.shortBreakMinutes),
    longBreakMinutes: clampMinutes(incoming.longBreakMinutes, DEFAULT_FOCUS_SETTINGS.longBreakMinutes),
    autoStartBreak: Boolean(incoming.autoStartBreak),
    autoStartNext: Boolean(incoming.autoStartNext),
    muted: Boolean(incoming.muted)
  };
}

function normalizeFocusSession(session) {
  const incoming = typeof session === "object" && session ? session : {};
  const nowISO = new Date().toISOString();
  return {
    id: String(incoming.id || uid("focus")),
    mode: FOCUS_MODES.has(incoming.mode) ? incoming.mode : "pomodoro",
    durationMinutes: clampMinutes(incoming.durationMinutes, 25),
    startedAtISO: toISO(incoming.startedAtISO || nowISO),
    endedAtISO: incoming.endedAtISO ? toISO(incoming.endedAtISO, "") : "",
    status: FOCUS_STATUSES.has(incoming.status) ? incoming.status : "running",
    relatedTodoId: String(incoming.relatedTodoId || ""),
    note: String(incoming.note || "").trim()
  };
}

function readSessions() {
  const sessions = getState(STORAGE_KEYS.focusSessions, []);
  if (!Array.isArray(sessions)) {
    return [];
  }
  return sessions.map(normalizeFocusSession);
}

function persistSessions(sessions) {
  setState(
    STORAGE_KEYS.focusSessions,
    sessions.map(normalizeFocusSession)
  );
}

export function getFocusSettings() {
  return normalizeFocusSettings(getState(STORAGE_KEYS.focusSettings, DEFAULT_FOCUS_SETTINGS));
}

export function updateFocusSettings(patch) {
  const next = normalizeFocusSettings({
    ...getFocusSettings(),
    ...(typeof patch === "object" && patch ? patch : {})
  });
  setState(STORAGE_KEYS.focusSettings, next);
  return next;
}

export function listFocusSessions(filter = {}) {
  const search = String(filter.search || "").trim().toLowerCase();
  const dayKey = String(filter.dayKey || "").trim();
  const statuses = new Set(filter.statuses || (filter.status ? [filter.status] : []));

  return readSessions()
    .filter((session) => (statuses.size > 0 ? statuses.has(session.status) : true))
    .filter((session) => (filter.relatedTodoId ? session.relatedTodoId === filter.relatedTodoId : true))
    .filter((session) => (dayKey ? formatDayKey(session.startedAtISO) === dayKey : true))
    .filter((session) => {
      if (!search) {
        return true;
      }
      return `${session.mode} ${session.note} ${session.relatedTodoId}`.toLowerCase().includes(search);
    })
    .sort((a, b) => new Date(b.startedAtISO).getTime() - new Date(a.startedAtISO).getTime());
}

export function getFocusSessionById(id) {
  return readSessions().find((session) => session.id === id) || null;
}

export function getActiveFocusSession() {
  return listFocusSessions({ status: "running" })[0] || null;
}

export function upsertFocusSession(session) {
  const next = normalizeFocusSession(session);
  const sessions = readSessions();
  const index = sessions.findIndex((item) => item.id === next.id);

  if (index >= 0) {
    sessions[index] = {
      ...sessions[index],
      ...next,
      startedAtISO: sessions[index].startedAtISO
    };
  } else {
    sessions.unshift(next);
  }

  persistSessions(sessions);
  return next;
}

function buildClockState(session, options = {}) {
  const currentClock = normalizeClockState(getState(STORAGE_KEYS.clock, {}));
  const settings = getFocusSettings();
  const targetISO = new Date(Date.now() + session.durationMinutes * 60 * 1000).toISOString();

  return {
    ...currentClock,
    countdownTargetISO: targetISO,
    remainingMs: session.durationMinutes * 60 * 1000,
    running: true,
    muted: settings.muted || currentClock.muted,
    source: "focus",
    mode: session.mode,
    label: String(options.label || ""),
    relatedTodoId: session.relatedTodoId,
    returnHref: String(options.returnHref || "/tools/focus-hub.html"),
    sessionId: session.id
  };
}

export function startFocusSession(options = {}) {
  const durationMinutes = clampMinutes(options.durationMinutes, 25);
  const active = getActiveFocusSession();
  if (active) {
    cancelFocusSession(active.id, {
      note: active.note || "Replaced by a new focus session"
    });
  }

  const session = upsertFocusSession({
    mode: options.mode,
    durationMinutes,
    relatedTodoId: options.relatedTodoId,
    note: options.note,
    status: "running",
    startedAtISO: new Date().toISOString(),
    endedAtISO: ""
  });

  setState(STORAGE_KEYS.clock, buildClockState(session, options));
  return session;
}

export function completeFocusSession(sessionId, patch = {}) {
  const session = getFocusSessionById(sessionId);
  if (!session) {
    return null;
  }
  return upsertFocusSession({
    ...session,
    ...patch,
    status: "completed",
    endedAtISO: new Date().toISOString()
  });
}

export function cancelFocusSession(sessionId, patch = {}) {
  const session = getFocusSessionById(sessionId);
  if (!session) {
    return null;
  }
  return upsertFocusSession({
    ...session,
    ...patch,
    status: "cancelled",
    endedAtISO: new Date().toISOString()
  });
}

export function clearActiveFocusClockLink(sessionId) {
  const currentClock = normalizeClockState(getState(STORAGE_KEYS.clock, {}));
  if (currentClock.sessionId !== sessionId) {
    return currentClock;
  }
  const next = {
    ...currentClock,
    source: "manual",
    mode: "",
    label: "",
    relatedTodoId: "",
    returnHref: "",
    sessionId: ""
  };
  setState(STORAGE_KEYS.clock, next);
  return next;
}

export function getTodayFocusSummary() {
  const todayKey = formatDayKey(new Date());
  const sessions = listFocusSessions({ dayKey: todayKey });
  const completed = sessions.filter((session) => session.status === "completed");
  const running = sessions.filter((session) => session.status === "running");
  const completedPomodoros = completed.filter((session) => session.mode === "pomodoro");

  return {
    totalSessions: sessions.length,
    runningCount: running.length,
    completedCount: completed.length,
    completedPomodoros: completedPomodoros.length,
    totalMinutes: completed.reduce((sum, session) => sum + session.durationMinutes, 0)
  };
}

export function getNextAutoFocusSpec(completedSession, settings = getFocusSettings()) {
  if (!completedSession || completedSession.status !== "completed") {
    return null;
  }

  if (completedSession.mode === "pomodoro" && settings.autoStartBreak) {
    const todayPomodoros = listFocusSessions({ status: "completed" }).filter(
      (session) => session.mode === "pomodoro" && formatDayKey(session.startedAtISO) === formatDayKey(completedSession.startedAtISO)
    ).length;
    const useLongBreak = todayPomodoros > 0 && todayPomodoros % 4 === 0;
    return {
      mode: useLongBreak ? "longBreak" : "shortBreak",
      durationMinutes: useLongBreak ? settings.longBreakMinutes : settings.shortBreakMinutes,
      label: useLongBreak ? "Long Break" : "Short Break"
    };
  }

  if ((completedSession.mode === "shortBreak" || completedSession.mode === "longBreak") && settings.autoStartNext) {
    return {
      mode: "pomodoro",
      durationMinutes: settings.pomodoroMinutes,
      label: "Pomodoro"
    };
  }

  return null;
}
