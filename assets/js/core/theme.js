const THEME_STORAGE_KEY = "bxg.tools.v1.theme_mode";
const DEFAULT_THEME_MODE = "system";
const THEME_MODES = new Set(["dark", "light", "system"]);

let cachedThemeMode = null;
let mediaListenerBound = false;

function normalizeThemeMode(value) {
  if (!value) {
    return null;
  }
  const mode = String(value).trim().toLowerCase();
  return THEME_MODES.has(mode) ? mode : null;
}

function getThemeFromUrl() {
  try {
    const value = new URLSearchParams(window.location.search).get("theme");
    return normalizeThemeMode(value);
  } catch (_) {
    return null;
  }
}

function getThemeFromStorage() {
  try {
    return normalizeThemeMode(localStorage.getItem(THEME_STORAGE_KEY));
  } catch (_) {
    return null;
  }
}

function resolveTheme(themeMode) {
  const mode = normalizeThemeMode(themeMode) || DEFAULT_THEME_MODE;
  if (mode === "system") {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (_) {
      return "dark";
    }
  }
  return mode;
}

function applyThemeModeToDom(themeMode) {
  const resolvedMode = resolveTheme(themeMode);
  document.documentElement.dataset.themeMode = themeMode;
  document.documentElement.dataset.theme = resolvedMode;
}

function refreshThemeSwitchStates(root = document, themeMode = getThemeMode()) {
  root.querySelectorAll("[data-theme-switch]").forEach((node) => {
    if (node.tagName === "SELECT") {
      node.value = themeMode;
      return;
    }

    const buttons = node.querySelectorAll("[data-value]");
    buttons.forEach((button) => {
      const active = normalizeThemeMode(button.dataset.value) === themeMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  });
}

function bindSystemThemeListener() {
  if (mediaListenerBound) {
    return;
  }
  mediaListenerBound = true;
  try {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", () => {
      if (getThemeMode() === "system") {
        applyThemeModeToDom("system");
      }
    });
  } catch (_) {
    // ignore listener errors
  }
}

export function getThemeMode() {
  if (cachedThemeMode) {
    return cachedThemeMode;
  }
  const resolved = getThemeFromUrl() || getThemeFromStorage() || DEFAULT_THEME_MODE;
  return setThemeMode(resolved);
}

export function setThemeMode(themeMode) {
  const resolved = normalizeThemeMode(themeMode) || DEFAULT_THEME_MODE;
  cachedThemeMode = resolved;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, resolved);
  } catch (_) {
    // ignore storage errors
  }

  applyThemeModeToDom(resolved);
  refreshThemeSwitchStates(document, resolved);
  return resolved;
}

export function initThemeSwitch(root = document) {
  const mode = getThemeMode();
  root.querySelectorAll("[data-theme-switch]").forEach((node) => {
    if (node.tagName === "SELECT") {
      node.value = mode;
      node.addEventListener("change", (event) => {
        setThemeMode(event.target.value);
      });
      return;
    }

    const buttons = Array.from(node.querySelectorAll("[data-value]"));
    if (buttons.length === 0) {
      return;
    }

    buttons.forEach((button) => {
      const active = normalizeThemeMode(button.dataset.value) === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.addEventListener("click", () => {
        setThemeMode(button.dataset.value);
      });
    });
  });
}

export function bootTheme(root = document) {
  bindSystemThemeListener();
  const mode = getThemeMode();
  applyThemeModeToDom(mode);
  initThemeSwitch(root);
  refreshThemeSwitchStates(root, mode);
  return mode;
}
