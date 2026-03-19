function isInteractiveTarget(target) {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag);
}

export function initImmersiveFullscreen({
  target,
  button,
  labels,
  onChange,
  chromeSelector = ".page-header",
  idleMs = 2400
}) {
  if (!target || !button) {
    return { update() {}, toggle() {} };
  }

  const supportsFullscreen =
    typeof target.requestFullscreen === "function" &&
    typeof document.exitFullscreen === "function";
  const chrome = target.querySelector(chromeSelector);
  let hideTimer = 0;

  function isActive() {
    return document.fullscreenElement === target;
  }

  function clearHideTimer() {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
    }
  }

  function revealChrome() {
    if (!isActive()) {
      return;
    }
    clearHideTimer();
    target.classList.remove("is-header-hidden");
    target.classList.add("is-hud-visible");
    if (!chrome) {
      return;
    }
    hideTimer = window.setTimeout(() => {
      if (!isActive()) {
        return;
      }
      target.classList.add("is-header-hidden");
      target.classList.remove("is-hud-visible");
    }, idleMs);
  }

  function resetChromeState() {
    clearHideTimer();
    target.classList.remove("is-header-hidden", "is-hud-visible");
  }

  function update() {
    const active = isActive();
    target.classList.toggle("is-immersive", active);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");

    if (!supportsFullscreen) {
      button.disabled = true;
      button.textContent = labels.unsupported;
    } else {
      button.disabled = false;
      button.textContent = active ? labels.exit : labels.enter;
    }

    if (active) {
      revealChrome();
    } else {
      resetChromeState();
    }

    if (typeof onChange === "function") {
      onChange(active);
    }
  }

  async function toggle() {
    if (!supportsFullscreen) {
      update();
      return;
    }
    try {
      if (isActive()) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
    } catch (_) {
      update();
    }
  }

  button.addEventListener("click", toggle);
  document.addEventListener("fullscreenchange", update);
  document.addEventListener("keydown", (event) => {
    if (event.code !== "KeyF" || isInteractiveTarget(event.target)) {
      return;
    }
    event.preventDefault();
    toggle();
  });
  document.addEventListener("mousemove", (event) => {
    if (!isActive()) {
      return;
    }
    if (event.clientY <= 120 || target.classList.contains("is-header-hidden")) {
      revealChrome();
    }
  });
  document.addEventListener("touchstart", () => {
    if (isActive()) {
      revealChrome();
    }
  }, { passive: true });
  document.addEventListener("focusin", () => {
    if (isActive()) {
      revealChrome();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (isActive() && ["Escape", "Tab"].includes(event.key)) {
      revealChrome();
    }
  });

  update();
  return { update, toggle };
}
