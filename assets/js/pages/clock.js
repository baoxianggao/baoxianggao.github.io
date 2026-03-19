import {
  cancelFocusSession,
  completeFocusSession,
  getFocusSessionById,
  getNextAutoFocusSpec,
  startFocusSession
} from "../core/focus.js";
import { formatDateTime, toInputDateTimeValue } from "../core/date.js";
import { initImmersiveFullscreen } from "../core/fullscreen.js";
import { bootI18n, tr, applyLangToLinks, setText, langHref } from "../core/i18n.js";
import { mountLauncher } from "../core/launcher.js";
import { DEFAULT_CLOCK_STATE, getState, initializeDefaults, listTodos, normalizeClockState, setState, STORAGE_KEYS } from "../core/store.js";
import { bootTheme } from "../core/theme.js";

initializeDefaults();
bootTheme();
bootI18n();

const timeMainEl = document.getElementById("timeMain");
const timeHhEl = document.getElementById("timeHh");
const timeMmEl = document.getElementById("timeMm");
const timeSsEl = document.getElementById("timeSs");
const timeMsEl = document.getElementById("timeMs");
const timeSubEl = document.getElementById("timeSub");
const syncStateEl = document.getElementById("syncState");
const pageWrapEl = document.getElementById("clockPageWrap");
const fullscreenBtn = document.getElementById("clockFullscreenBtn");
const immersiveHintEl = document.getElementById("clockImmersiveHint");
const countdownDisplayEl = document.getElementById("countdownDisplay");
const alarmMsgEl = document.getElementById("alarmMsg");
const targetTimeInput = document.getElementById("targetTimeInput");
const startBtn = document.getElementById("countdownStart");
const pauseBtn = document.getElementById("countdownPause");
const resetBtn = document.getElementById("countdownReset");
const muteToggle = document.getElementById("muteToggle");
const clockFocusContextEl = document.getElementById("clockFocusContext");

let offsetMs = 0;
let countdownState = normalizeClockState(getState(STORAGE_KEYS.clock, DEFAULT_CLOCK_STATE));

muteToggle.checked = Boolean(countdownState.muted);

function nowMs() {
  return Date.now() + offsetMs;
}

function pad(num, size = 2) {
  return String(num).padStart(size, "0");
}

function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
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

function persistCountdown() {
  countdownState = normalizeClockState(countdownState);
  setState(STORAGE_KEYS.clock, countdownState);
  renderFocusContext();
}

function beep() {
  if (countdownState.muted) {
    return;
  }
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.35);
  } catch (_) {
    // ignore audio failures
  }
}

async function syncClockOffset() {
  offsetMs = 0;
  syncStateEl.textContent = tr("本地高精度时间", "Local high-precision time");
}

function renderClock() {
  const now = new Date(nowMs());
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  const ms = pad(now.getMilliseconds(), 3);
  if (timeHhEl && timeMmEl && timeSsEl && timeMsEl) {
    timeHhEl.textContent = h;
    timeMmEl.textContent = m;
    timeSsEl.textContent = s;
    timeMsEl.textContent = ms;
  } else {
    timeMainEl.innerHTML = `${h}:${m}:${s}<span class="millisecond">.${ms}</span>`;
  }
  timeSubEl.textContent = formatDateTime(now);
  requestAnimationFrame(renderClock);
}

function getCurrentFocusSession() {
  if (countdownState.source !== "focus" || !countdownState.sessionId) {
    return null;
  }
  return getFocusSessionById(countdownState.sessionId);
}

function renderFocusContext() {
  const session = getCurrentFocusSession();
  if (!session) {
    clockFocusContextEl.innerHTML = `
      <div class="clock-context-empty">
        <strong>${tr("普通倒计时", "Manual Countdown")}</strong>
        <p class="muted">${tr("当前倒计时没有专注上下文，可以直接使用预设或目标时间。", "This countdown has no focus context. Use presets or set a target time directly.")}</p>
      </div>
    `;
    return;
  }

  const todo = listTodos({ includeArchived: true }).find((item) => item.id === session.relatedTodoId);
  clockFocusContextEl.innerHTML = `
    <div class="clock-context-main">
      <div>
        <div class="clock-context-top">
          <span class="pill">${tr("来自专注中心", "From Focus Hub")}</span>
          <span class="muted">${focusModeLabel(session.mode)} · ${session.durationMinutes}${tr(" 分钟", " min")}</span>
        </div>
        <strong>${escapeHtml(countdownState.label || focusModeLabel(session.mode))}</strong>
        <p class="muted" style="margin-top: 8px">${todo ? `${tr("关联任务", "Linked task")}: ${escapeHtml(todo.title)} · ` : ""}${tr(
          "完成后可返回专注中心查看记录。",
          "Return to Focus Hub after finishing to review the record."
        )}</p>
      </div>
      <div class="toolbar">
        <a class="btn" href="${langHref(countdownState.returnHref || "/tools/focus-hub.html")}">${tr("返回入口", "Return")}</a>
      </div>
    </div>
  `;
}

function clearFocusContext() {
  countdownState = {
    ...countdownState,
    source: "manual",
    mode: "",
    label: "",
    relatedTodoId: "",
    returnHref: "",
    sessionId: ""
  };
}

function maybeAutoStartNextFocus(completedSession) {
  const nextSpec = getNextAutoFocusSpec(completedSession);
  if (!nextSpec) {
    return false;
  }
  startFocusSession({
    mode: nextSpec.mode,
    durationMinutes: nextSpec.durationMinutes,
    relatedTodoId: "",
    note: "",
    label: `${focusModeLabel(nextSpec.mode)} · ${nextSpec.durationMinutes}${tr(" 分钟", " min")}`,
    returnHref: "/tools/focus-hub.html"
  });
  countdownState = normalizeClockState(getState(STORAGE_KEYS.clock, DEFAULT_CLOCK_STATE));
  targetTimeInput.value = toInputDateTimeValue(new Date(countdownState.countdownTargetISO));
  alarmMsgEl.textContent = tr("上一轮结束，已自动开始下一轮。", "Previous session finished. The next round started automatically.");
  return true;
}

function handleCountdownFinished() {
  const session = getCurrentFocusSession();
  if (session) {
    const completedSession = completeFocusSession(session.id, {
      note: session.note
    });
    if (completedSession && maybeAutoStartNextFocus(completedSession)) {
      return;
    }
  }

  countdownState.running = false;
  countdownState.remainingMs = 0;
  countdownState.countdownTargetISO = "";
  clearFocusContext();
  persistCountdown();
  countdownDisplayEl.textContent = "00:00:00";
  alarmMsgEl.textContent = tr("倒计时结束", "Countdown finished");
  beep();
}

function recalcRemaining() {
  if (countdownState.running && countdownState.countdownTargetISO) {
    const targetMs = new Date(countdownState.countdownTargetISO).getTime();
    const remain = targetMs - nowMs();
    if (remain <= 0) {
      handleCountdownFinished();
      return;
    }
    countdownState.remainingMs = remain;
  }

  countdownDisplayEl.textContent = formatRemaining(countdownState.remainingMs || 0);
}

function cancelActiveFocusIfNeeded(reason) {
  const session = getCurrentFocusSession();
  if (!session) {
    return;
  }
  cancelFocusSession(session.id, {
    note: reason || session.note
  });
  clearFocusContext();
}

function startCountdownByTarget(targetISO, options = {}) {
  const targetMs = new Date(targetISO).getTime();
  if (Number.isNaN(targetMs) || targetMs <= nowMs()) {
    alarmMsgEl.textContent = tr("目标时间必须晚于当前时间", "Target time must be in the future");
    return;
  }

  if (options.asManual !== false) {
    cancelActiveFocusIfNeeded(tr("手动切换为普通倒计时", "Switched to a manual countdown"));
  }

  countdownState = {
    ...countdownState,
    countdownTargetISO: new Date(targetMs).toISOString(),
    running: true,
    remainingMs: targetMs - nowMs()
  };
  if (options.asManual !== false) {
    clearFocusContext();
  }
  persistCountdown();
  alarmMsgEl.textContent = "";
}

function handleStart() {
  const inputValue = targetTimeInput.value;
  if (!inputValue) {
    alarmMsgEl.textContent = tr("请先选择目标时间", "Please select a target time");
    return;
  }
  startCountdownByTarget(new Date(inputValue).toISOString(), { asManual: true });
}

function handlePauseResume() {
  if (countdownState.running) {
    const targetMs = new Date(countdownState.countdownTargetISO).getTime();
    const remain = Math.max(0, targetMs - nowMs());
    countdownState.running = false;
    countdownState.remainingMs = remain;
    countdownState.countdownTargetISO = "";
    alarmMsgEl.textContent = tr("已暂停", "Paused");
  } else {
    if (!countdownState.remainingMs || countdownState.remainingMs <= 0) {
      alarmMsgEl.textContent = tr("没有可恢复的倒计时", "No paused countdown to resume");
      return;
    }
    countdownState.running = true;
    countdownState.countdownTargetISO = new Date(nowMs() + countdownState.remainingMs).toISOString();
    alarmMsgEl.textContent = tr("继续计时", "Resumed");
  }
  persistCountdown();
}

function handleReset() {
  cancelActiveFocusIfNeeded(tr("在时钟页被重置", "Reset from the clock page"));
  countdownState = {
    ...countdownState,
    countdownTargetISO: "",
    remainingMs: 0,
    running: false
  };
  clearFocusContext();
  persistCountdown();
  countdownDisplayEl.textContent = "00:00:00";
  alarmMsgEl.textContent = tr("已重置", "Reset");
}

function bindPresetButtons() {
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const minutes = Number(button.dataset.preset || 0);
      const target = new Date(nowMs() + minutes * 60 * 1000);
      targetTimeInput.value = toInputDateTimeValue(target);
      startCountdownByTarget(target.toISOString(), { asManual: true });
    });
  });
}

function bindActions() {
  startBtn.addEventListener("click", handleStart);
  pauseBtn.addEventListener("click", handlePauseResume);
  resetBtn.addEventListener("click", handleReset);

  muteToggle.addEventListener("change", () => {
    countdownState.muted = muteToggle.checked;
    persistCountdown();
  });

  bindPresetButtons();
}

function bootstrapCountdownFromState() {
  countdownState = normalizeClockState(getState(STORAGE_KEYS.clock, DEFAULT_CLOCK_STATE));
  muteToggle.checked = Boolean(countdownState.muted);
  renderFocusContext();

  if (countdownState.running && countdownState.countdownTargetISO) {
    const targetMs = new Date(countdownState.countdownTargetISO).getTime();
    if (targetMs <= nowMs()) {
      handleCountdownFinished();
    } else {
      targetTimeInput.value = toInputDateTimeValue(new Date(targetMs));
      alarmMsgEl.textContent = tr("已恢复上次倒计时", "Restored previous countdown");
    }
  } else if (countdownState.remainingMs > 0) {
    alarmMsgEl.textContent = tr("检测到暂停状态，可点击继续", "Paused countdown detected, click resume");
  }
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 全屏时钟", "BaoXiangGao Tools - Clock");
  setText("#clockBrandTitle", "高精度时钟与倒计时", "High-Precision Clock & Countdown");
  setText("#clockBackHomeBtn", "返回首页", "Back Home");
  setText("#clockFullscreenBtn", "进入全屏", "Enter Fullscreen");
  setText(
    "#clockImmersiveHint",
    "沉浸模式已启用 · 按 F 切换全屏 · 按 Esc 退出 · 移动鼠标可唤出顶部工具栏",
    "Immersive mode on · Press F to toggle fullscreen · Esc exits · Move the pointer to reveal the top bar"
  );
  setText("#clockCountdownTitle", "倒计时", "Countdown");
  setText("#clockTargetLabel", "目标时间", "Target Time");
  setText("#preset5Btn", "5 分钟", "5 min");
  setText("#preset15Btn", "15 分钟", "15 min");
  setText("#preset30Btn", "30 分钟", "30 min");
  setText("#preset60Btn", "60 分钟", "60 min");
  setText("#countdownStart", "开始", "Start");
  setText("#countdownPause", "暂停/继续", "Pause/Resume");
  setText("#countdownReset", "重置", "Reset");
  setText("#clockMuteText", "静音", "Mute");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function bootstrap() {
  applyStaticI18n();
  bindActions();
  initImmersiveFullscreen({
    target: pageWrapEl,
    button: fullscreenBtn,
    labels: {
      enter: tr("进入全屏", "Enter Fullscreen"),
      exit: tr("退出全屏", "Exit Fullscreen"),
      unsupported: tr("浏览器不支持", "Unsupported")
    }
  });
  immersiveHintEl?.setAttribute("aria-live", "polite");
  await syncClockOffset();
  renderClock();
  bootstrapCountdownFromState();
  setInterval(recalcRemaining, 120);
  mountLauncher();
  applyLangToLinks();
}

bootstrap();
