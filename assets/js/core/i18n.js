const LANG_STORAGE_KEY = "bxg.tools.v1.lang";
const DEFAULT_LANG = "zh";
const SUPPORTED_LANGS = new Set(["zh", "en"]);

let cachedLang = null;

function normalizeLang(value) {
  if (!value) {
    return null;
  }
  const raw = String(value).trim().toLowerCase();
  if (raw.startsWith("en")) {
    return "en";
  }
  if (raw.startsWith("zh")) {
    return "zh";
  }
  return SUPPORTED_LANGS.has(raw) ? raw : null;
}

function getLangFromUrl() {
  try {
    const lang = new URLSearchParams(window.location.search).get("lang");
    return normalizeLang(lang);
  } catch (_) {
    return null;
  }
}

function getLangFromStorage() {
  try {
    return normalizeLang(localStorage.getItem(LANG_STORAGE_KEY));
  } catch (_) {
    return null;
  }
}

function getLangFromNavigator() {
  try {
    return normalizeLang(navigator.language || navigator.userLanguage);
  } catch (_) {
    return null;
  }
}

export function setLang(lang) {
  const resolved = normalizeLang(lang) || DEFAULT_LANG;
  cachedLang = resolved;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, resolved);
  } catch (_) {
    // ignore storage errors
  }
  document.documentElement.lang = resolved === "en" ? "en" : "zh-CN";
  return resolved;
}

export function getLang() {
  if (cachedLang) {
    return cachedLang;
  }
  const resolved = getLangFromUrl() || getLangFromStorage() || getLangFromNavigator() || DEFAULT_LANG;
  return setLang(resolved);
}

export function isEnglish() {
  return getLang() === "en";
}

export function tr(zhText, enText) {
  return isEnglish() ? enText : zhText;
}

export function langHref(href, lang = getLang()) {
  if (!href) {
    return href;
  }
  if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href;
  }

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) {
      return href;
    }

    if (lang === "en") {
      url.searchParams.set("lang", "en");
    } else {
      url.searchParams.delete("lang");
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch (_) {
    return href;
  }
}

export function applyLangToLinks(root = document, lang = getLang()) {
  root.querySelectorAll("a[href]").forEach((anchor) => {
    if (anchor.dataset.noLang === "true") {
      return;
    }
    const rawHref = anchor.getAttribute("href");
    const next = langHref(rawHref, lang);
    if (next) {
      anchor.setAttribute("href", next);
    }
  });
}

export function initLangSwitch(root = document) {
  const lang = getLang();
  root.querySelectorAll("[data-lang-switch]").forEach((node) => {
    if (node.tagName === "SELECT") {
      node.value = lang;
      node.addEventListener("change", (event) => {
        const nextLang = setLang(event.target.value);
        window.location.href = langHref(window.location.href, nextLang);
      });
      return;
    }

    const buttons = Array.from(node.querySelectorAll("[data-value]"));
    if (buttons.length === 0) {
      return;
    }

    buttons.forEach((button) => {
      const active = normalizeLang(button.dataset.value) === lang;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.addEventListener("click", () => {
        const nextLang = setLang(button.dataset.value);
        window.location.href = langHref(window.location.href, nextLang);
      });
    });
  });
}

export function bootI18n(root = document) {
  const lang = getLang();
  applyLangToLinks(root, lang);
  initLangSwitch(root);
  return lang;
}

export function setText(target, zhText, enText) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (el) {
    el.textContent = tr(zhText, enText);
  }
}

export function setPlaceholder(target, zhText, enText) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (el) {
    el.setAttribute("placeholder", tr(zhText, enText));
  }
}
