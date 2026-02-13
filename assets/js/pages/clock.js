import { STORAGE_KEYS, getState, setState, initializeDefaults } from "../core/store.js";
import { formatDateTime, toInputDateTimeValue } from "../core/date.js";

initializeDefaults();

const timeMainEl = document.getElementById("timeMain");
const timeSubEl = document.getElementById("timeSub");
const syncStateEl = document.getElementById("syncState");
const countdownDisplayEl = document.getElementById("countdownDisplay");
const alarmMsgEl = document.getElementById("alarmMsg");
const targetTimeInput = document.getElementById("targetTimeInput");
const startBtn = document.getElementById("countdownStart");
const pauseBtn = document.getElementById("countdownPause");
const resetBtn = document.getElementById("countdownReset");
const muteToggle = document.getElementById("muteToggle");

let offsetMs = 0;
let countdownState = getState(STORAGE_KEYS.clock, {
  countdownTargetISO: "",
  remainingMs: 0,
  running: false,
  muted: false
});

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

function persistCountdown() {
  setState(STORAGE_KEYS.clock, countdownState);
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
  syncStateEl.textContent = "同步中...";
  try {
    const response = await fetch("https://worldtimeapi.org/api/timezone/Asia/Shanghai");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    const serverMs = new Date(payload.datetime).getTime();
    offsetMs = serverMs - Date.now();
    syncStateEl.textContent = "已同步";
  } catch (_) {
    offsetMs = 0;
    syncStateEl.textContent = "离线本地时间";
  }
}

function renderClock() {
  const now = new Date(nowMs());
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  const ms = pad(now.getMilliseconds(), 3);
  timeMainEl.innerHTML = `${h}:${m}:${s}<span class="millisecond">.${ms}</span>`;
  timeSubEl.textContent = formatDateTime(now);
  requestAnimationFrame(renderClock);
}

function recalcRemaining() {
  if (countdownState.running && countdownState.countdownTargetISO) {
    const targetMs = new Date(countdownState.countdownTargetISO).getTime();
    const remain = targetMs - nowMs();
    if (remain <= 0) {
      countdownState.running = false;
      countdownState.remainingMs = 0;
      countdownState.countdownTargetISO = "";
      persistCountdown();
      countdownDisplayEl.textContent = "00:00:00";
      alarmMsgEl.textContent = "倒计时结束";
      beep();
      return;
    }
    countdownState.remainingMs = remain;
  }

  countdownDisplayEl.textContent = formatRemaining(countdownState.remainingMs || 0);
}

function startCountdownByTarget(targetISO) {
  const targetMs = new Date(targetISO).getTime();
  if (Number.isNaN(targetMs) || targetMs <= nowMs()) {
    alarmMsgEl.textContent = "目标时间必须晚于当前时间";
    return;
  }

  countdownState = {
    ...countdownState,
    countdownTargetISO: new Date(targetMs).toISOString(),
    running: true,
    remainingMs: targetMs - nowMs()
  };
  persistCountdown();
  alarmMsgEl.textContent = "";
}

function handleStart() {
  const inputValue = targetTimeInput.value;
  if (!inputValue) {
    alarmMsgEl.textContent = "请先选择目标时间";
    return;
  }
  startCountdownByTarget(new Date(inputValue).toISOString());
}

function handlePauseResume() {
  if (countdownState.running) {
    const targetMs = new Date(countdownState.countdownTargetISO).getTime();
    const remain = Math.max(0, targetMs - nowMs());
    countdownState.running = false;
    countdownState.remainingMs = remain;
    countdownState.countdownTargetISO = "";
    alarmMsgEl.textContent = "已暂停";
  } else {
    if (!countdownState.remainingMs || countdownState.remainingMs <= 0) {
      alarmMsgEl.textContent = "没有可恢复的倒计时";
      return;
    }
    countdownState.running = true;
    countdownState.countdownTargetISO = new Date(nowMs() + countdownState.remainingMs).toISOString();
    alarmMsgEl.textContent = "继续计时";
  }
  persistCountdown();
}

function handleReset() {
  countdownState = {
    ...countdownState,
    countdownTargetISO: "",
    remainingMs: 0,
    running: false
  };
  persistCountdown();
  countdownDisplayEl.textContent = "00:00:00";
  alarmMsgEl.textContent = "已重置";
}

function bindPresetButtons() {
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const minutes = Number(button.dataset.preset || 0);
      const target = new Date(nowMs() + minutes * 60 * 1000);
      targetTimeInput.value = toInputDateTimeValue(target);
      startCountdownByTarget(target.toISOString());
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
  if (countdownState.running && countdownState.countdownTargetISO) {
    const targetMs = new Date(countdownState.countdownTargetISO).getTime();
    if (targetMs <= nowMs()) {
      countdownState.running = false;
      countdownState.remainingMs = 0;
      countdownState.countdownTargetISO = "";
      persistCountdown();
      alarmMsgEl.textContent = "上次倒计时已结束";
    } else {
      targetTimeInput.value = toInputDateTimeValue(new Date(targetMs));
      alarmMsgEl.textContent = "已恢复上次倒计时";
    }
  } else if (countdownState.remainingMs > 0) {
    alarmMsgEl.textContent = "检测到暂停状态，可点击继续";
  }
}

async function bootstrap() {
  bindActions();
  await syncClockOffset();
  setInterval(syncClockOffset, 15 * 60 * 1000);
  renderClock();
  bootstrapCountdownFromState();
  setInterval(recalcRemaining, 120);
}

bootstrap();
