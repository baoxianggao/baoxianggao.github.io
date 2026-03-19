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
  onChange
}) {
  if (!target || !button) {
    return { update() {}, toggle() {} };
  }

  const supportsFullscreen =
    typeof target.requestFullscreen === "function" &&
    typeof document.exitFullscreen === "function";

  function isActive() {
    return document.fullscreenElement === target;
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

  update();
  return { update, toggle };
}
