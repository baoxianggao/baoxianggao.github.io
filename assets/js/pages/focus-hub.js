import { formatDateTime } from "../core/date.js";
import {
  cancelFocusSession,
  getActiveFocusSession,
  getFocusSettings,
  getFocusSessionById,
  getTodayFocusSummary,
  listFocusSessions,
  startFocusSession,
  updateFocusSettings
} from "../core/focus.js";
import { applyLangToLinks, bootI18n, isEnglish, langHref, setText, tr } from "../core/i18n.js";
import { mountLauncher } from "../core/launcher.js";
import { DEFAULT_CLOCK_STATE, getState, initializeDefaults, listTodos, onStateChanged, setState, STORAGE_KEYS } from "../core/store.js";
import { bootTheme } from "../core/theme.js";

initializeDefaults();
bootTheme();
bootI18n();

const focusActiveCardEl = document.getElementById("focusActiveCard");
const focusActivePillEl = document.getElementById("focusHubActivePill");
const focusModeGridEl = document.getElementById("focusModeGrid");
const focusTodoSelectEl = document.getElementById("focusTodoSelect");
const focusTodoCalloutEl = document.getElementById("focusTodoCallout");
const focusSessionListEl = document.getElementById("focusSessionList");

const focusStatMinutesEl = document.getElementById("focusStatMinutes");
const focusStatPomodoroEl = document.getElementById("focusStatPomodoro");
const focusStatSessionsEl = document.getElementById("focusStatSessions");

const focusSettingsForm = document.getElementById("focusSettingsForm");
const focusPomodoroInputEl = document.getElementById("focusPomodoroInput");
const focusShortBreakInputEl = document.getElementById("focusShortBreakInput");
const focusLongBreakInputEl = document.getElementById("focusLongBreakInput");
const focusAutoBreakInputEl = document.getElementById("focusAutoBreakInput");
const focusAutoNextInputEl = document.getElementById("focusAutoNextInput");
const focusMutedInputEl = document.getElementById("focusMutedInput");
const focusCustomMinutesEl = document.getElementById("focusCustomMinutes");
const focusCustomStartBtn = document.getElementById("focusCustomStartBtn");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function modeLabel(mode) {
  const labels = {
    pomodoro: tr("番茄钟", "Pomodoro"),
    shortBreak: tr("短休息", "Short Break"),
    longBreak: tr("长休息", "Long Break"),
    custom: tr("自定义", "Custom")
  };
  return labels[mode] || mode;
}

function getTodoMap() {
  return new Map(listTodos({ includeArchived: true }).map((todo) => [todo.id, todo]));
}

function getSelectedTodoId() {
  return focusTodoSelectEl.value || "";
}

function redirectToClock() {
  window.location.href = langHref("/tools/clock.html");
}

function startSession(mode, minutes) {
  const todoMap = getTodoMap();
  const relatedTodoId = getSelectedTodoId();
  const todo = todoMap.get(relatedTodoId);
  startFocusSession({
    mode,
    durationMinutes: minutes,
    relatedTodoId,
    note: todo ? todo.title : "",
    label: `${modeLabel(mode)} · ${minutes}${tr(" 分钟", " min")}`,
    returnHref: "/tools/focus-hub.html"
  });
  redirectToClock();
}

function renderTodoSelect(prefilledTodoId = "") {
  const todos = listTodos({ includeArchived: false }).filter((todo) => todo.status !== "done");
  focusTodoSelectEl.innerHTML = [`<option value="">${tr("不关联任务", "No linked task")}</option>`]
    .concat(
      todos.map(
        (todo) => `
          <option value="${todo.id}">${escapeHtml(todo.title)} · ${escapeHtml(todo.priority)}</option>
        `
      )
    )
    .join("");
  if (prefilledTodoId && todos.some((todo) => todo.id === prefilledTodoId)) {
    focusTodoSelectEl.value = prefilledTodoId;
  }
}

function renderModeGrid() {
  const settings = getFocusSettings();
  const cards = [
    {
      mode: "pomodoro",
      title: tr("番茄钟", "Pomodoro"),
      minutes: settings.pomodoroMinutes,
      desc: tr("标准深度专注节奏", "Standard deep-work cycle")
    },
    {
      mode: "shortBreak",
      title: tr("短休息", "Short Break"),
      minutes: settings.shortBreakMinutes,
      desc: tr("适合番茄之间缓冲", "Good between pomodoro rounds")
    },
    {
      mode: "longBreak",
      title: tr("长休息", "Long Break"),
      minutes: settings.longBreakMinutes,
      desc: tr("完成多轮专注后的恢复", "Recovery after several rounds")
    }
  ];

  focusModeGridEl.innerHTML = cards
    .map(
      (card) => `
        <article class="focus-mode-card accent-${card.mode === "pomodoro" ? "forest" : card.mode === "shortBreak" ? "ocean" : "copper"}">
          <div class="focus-mode-top">
            <span class="pill">${card.minutes}${tr(" 分钟", " min")}</span>
            <span class="muted">${card.desc}</span>
          </div>
          <h3>${card.title}</h3>
          <button class="btn btn-primary" type="button" data-mode="${card.mode}" data-minutes="${card.minutes}">${tr(
            "立即开始",
            "Start Now"
          )}</button>
        </article>
      `
    )
    .join("");
}

function renderActiveCard() {
  const session = getActiveFocusSession();
  const clock = getState(STORAGE_KEYS.clock, DEFAULT_CLOCK_STATE);
  const todoMap = getTodoMap();

  if (!session || clock.sessionId !== session.id) {
    focusActivePillEl.textContent = tr("空闲中", "Idle");
    focusActiveCardEl.innerHTML = `
      <div class="empty-state">
        <p>${tr("当前没有运行中的专注会话。你可以直接从下面的模式卡开始，或者在 Todo 里发起专注。", "No focus session is running. Start one below or trigger it from Todo.")}</p>
      </div>
    `;
    return;
  }

  focusActivePillEl.textContent = tr("专注中", "Active");
  const todo = todoMap.get(session.relatedTodoId);
  focusActiveCardEl.innerHTML = `
    <div class="focus-active-main">
      <div>
        <h3>${modeLabel(session.mode)}</h3>
        <div class="muted">${tr("开始于", "Started")} ${formatDateTime(session.startedAtISO, "Asia/Shanghai", isEnglish() ? "en-US" : "zh-CN")}</div>
        <div class="chips" style="margin-top: 10px">
          <span class="tag">${session.durationMinutes}${tr(" 分钟", " min")}</span>
          ${todo ? `<span class="tag">#${escapeHtml(todo.title)}</span>` : ""}
        </div>
      </div>
      <div class="toolbar">
        <a class="btn btn-primary" href="${langHref("/tools/clock.html")}">${tr("继续倒计时", "Resume in Clock")}</a>
        <button class="btn btn-danger" type="button" id="cancelActiveFocusBtn">${tr("取消本次专注", "Cancel Session")}</button>
      </div>
    </div>
  `;

  document.getElementById("cancelActiveFocusBtn")?.addEventListener("click", () => {
    cancelFocusSession(session.id, {
      note: session.note || tr("从专注中心取消", "Cancelled from Focus Hub")
    });
    const nextClock = {
      ...clock,
      running: false,
      countdownTargetISO: "",
      remainingMs: 0,
      source: "manual",
      mode: "",
      label: "",
      returnHref: "",
      sessionId: "",
      relatedTodoId: ""
    };
    setState(STORAGE_KEYS.clock, nextClock);
    renderAll();
  });
}

function renderStats() {
  const summary = getTodayFocusSummary();
  focusStatMinutesEl.textContent = String(summary.totalMinutes);
  focusStatPomodoroEl.textContent = String(summary.completedPomodoros);
  focusStatSessionsEl.textContent = String(summary.totalSessions);
}

function renderSettings() {
  const settings = getFocusSettings();
  focusPomodoroInputEl.value = String(settings.pomodoroMinutes);
  focusShortBreakInputEl.value = String(settings.shortBreakMinutes);
  focusLongBreakInputEl.value = String(settings.longBreakMinutes);
  focusAutoBreakInputEl.checked = settings.autoStartBreak;
  focusAutoNextInputEl.checked = settings.autoStartNext;
  focusMutedInputEl.checked = settings.muted;
}

function renderSessions() {
  const todoMap = getTodoMap();
  const sessions = listFocusSessions().slice(0, 10);
  if (sessions.length === 0) {
    focusSessionListEl.innerHTML = `<div class="empty-state">${tr(
      "还没有专注记录，开始第一轮番茄钟吧。",
      "No focus sessions yet. Start your first pomodoro."
    )}</div>`;
    return;
  }

  focusSessionListEl.innerHTML = sessions
    .map((session) => {
      const todo = todoMap.get(session.relatedTodoId);
      return `
        <article class="focus-session-card status-${session.status}">
          <div class="focus-session-top">
            <strong>${modeLabel(session.mode)}</strong>
            <span class="pill">${session.status}</span>
          </div>
          <div class="muted">${session.durationMinutes}${tr(" 分钟", " min")} · ${formatDateTime(
            session.startedAtISO,
            "Asia/Shanghai",
            isEnglish() ? "en-US" : "zh-CN"
          )}</div>
          <div class="chips" style="margin-top: 10px">
            ${todo ? `<span class="tag">#${escapeHtml(todo.title)}</span>` : ""}
            ${session.note ? `<span class="tag">${escapeHtml(session.note)}</span>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTodoCallout(prefilledTodoId = "") {
  const todo = listTodos({ includeArchived: true }).find((item) => item.id === prefilledTodoId);
  if (!todo) {
    focusTodoCalloutEl.style.display = "none";
    focusTodoCalloutEl.textContent = "";
    return;
  }
  focusTodoCalloutEl.style.display = "block";
  focusTodoCalloutEl.textContent = tr(
    `准备从任务「${todo.title}」启动专注。`,
    `Ready to start focus from "${todo.title}".`
  );
}

function renderAll(prefilledTodoId = "") {
  renderTodoSelect(prefilledTodoId);
  renderModeGrid();
  renderActiveCard();
  renderStats();
  renderSettings();
  renderSessions();
  renderTodoCallout(prefilledTodoId);
}

function handleActionParams() {
  const params = new URLSearchParams(window.location.search);
  const action = params.get("action");
  const todoId = params.get("todoId") || "";
  renderTodoCallout(todoId);

  if (todoId) {
    renderTodoSelect(todoId);
  }

  if (action !== "start") {
    return todoId;
  }

  const mode = params.get("mode") || "pomodoro";
  const minutes = Number(params.get("minutes") || getFocusSettings().pomodoroMinutes);
  const todo = listTodos({ includeArchived: true }).find((item) => item.id === todoId);
  startFocusSession({
    mode,
    durationMinutes: minutes,
    relatedTodoId: todoId,
    note: todo ? todo.title : "",
    label: `${modeLabel(mode)} · ${minutes}${tr(" 分钟", " min")}`,
    returnHref: "/tools/focus-hub.html"
  });
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("action");
  cleanUrl.searchParams.delete("mode");
  cleanUrl.searchParams.delete("minutes");
  cleanUrl.searchParams.delete("todoId");
  window.history.replaceState({}, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  redirectToClock();
  return todoId;
}

function bindActions(prefilledTodoId) {
  focusModeGridEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mode]");
    if (!button) {
      return;
    }
    startSession(button.dataset.mode, Number(button.dataset.minutes || 0));
  });

  focusCustomStartBtn.addEventListener("click", () => {
    startSession("custom", Number(focusCustomMinutesEl.value || 45));
  });

  focusSettingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateFocusSettings({
      pomodoroMinutes: Number(focusPomodoroInputEl.value || 25),
      shortBreakMinutes: Number(focusShortBreakInputEl.value || 5),
      longBreakMinutes: Number(focusLongBreakInputEl.value || 15),
      autoStartBreak: focusAutoBreakInputEl.checked,
      autoStartNext: focusAutoNextInputEl.checked,
      muted: focusMutedInputEl.checked
    });
    renderAll(prefilledTodoId);
  });

  onStateChanged((detail) => {
    if (
      [STORAGE_KEYS.focusSessions, STORAGE_KEYS.focusSettings, STORAGE_KEYS.clock, STORAGE_KEYS.todos].includes(detail.key)
    ) {
      renderAll(prefilledTodoId);
    }
  });
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 专注中心", "BaoXiangGao Tools - Focus Hub");
  setText("#focusHubBrandTitle", "专注中心", "Focus Hub");
  setText(
    "#focusHubBrandDesc",
    "把番茄钟、休息节奏、任务上下文和今日专注记录收拢到一个入口里。",
    "Bring pomodoro timers, break pacing, task context, and today's focus history into one place."
  );
  setText("#focusHubBackHomeBtn", "返回首页", "Back Home");
  setText("#focusHubOpenClockBtn", "打开时钟", "Open Clock");
  setText("#focusHubHeroTitle", "当前专注上下文", "Current Focus Context");
  setText("#focusHubHeroHint", "开始专注后会自动把倒计时写入时钟页，随时可以继续。", "Starting a session writes the countdown into Clock so you can resume anytime.");
  setText("#focusHubModesTitle", "快速开始", "Quick Start");
  setText("#focusHubModesHint", "将番茄钟、短休息、长休息和自定义时长统一管理。", "Manage pomodoro, short breaks, long breaks, and custom durations together.");
  setText("#focusHubTodoLabel", "关联 Todo", "Linked Todo");
  setText("#focusHubCustomLabel", "自定义时长（分钟）", "Custom Minutes");
  setText("#focusCustomStartBtn", "开始自定义专注", "Start Custom Focus");
  setText("#focusHubStatsTitle", "今日统计", "Today's Summary");
  setText("#focusStatMinutesLabel", "累计分钟", "Total Minutes");
  setText("#focusStatPomodoroLabel", "完成番茄", "Completed Pomodoros");
  setText("#focusStatSessionsLabel", "会话数", "Sessions");
  setText("#focusHubSettingsTitle", "默认设置", "Default Settings");
  setText("#focusHubSettingsHint", "修改后会立即持久化到本地。", "Changes are saved locally right away.");
  setText("#focusPomodoroLabel", "番茄钟", "Pomodoro");
  setText("#focusShortBreakLabel", "短休息", "Short Break");
  setText("#focusLongBreakLabel", "长休息", "Long Break");
  setText("#focusAutoBreakLabel", "自动开始休息", "Auto-start Breaks");
  setText("#focusAutoBreakHint", "番茄结束后自动进入短/长休息", "Start a short or long break after pomodoro");
  setText("#focusAutoNextLabel", "休息后自动开始下一轮", "Auto-start Next Focus");
  setText("#focusAutoNextHint", "短休息或长休息结束后自动进入下一次专注", "Start the next focus session after a break");
  setText("#focusMutedLabel", "静音同步到时钟", "Mute in Clock");
  setText("#focusMutedHint", "新会话会把静音偏好带到时钟页", "New sessions carry this mute preference into Clock");
  setText("#focusSettingsSaveBtn", "保存设置", "Save Settings");
  setText("#focusHubRecordsTitle", "最近记录", "Recent Sessions");
  setText("#focusHubRecordsHint", "保留模式、时长、状态和关联任务。", "Keep mode, duration, status, and linked task history.");
}

function bootstrap() {
  applyStaticI18n();
  const prefilledTodoId = handleActionParams();
  renderAll(prefilledTodoId);
  bindActions(prefilledTodoId);
  mountLauncher();
  applyLangToLinks();
}

bootstrap();
