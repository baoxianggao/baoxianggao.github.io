import { listBlogPosts } from "./blog.js";
import { getLang, langHref, tr } from "./i18n.js";
import { listLinks } from "./links.js";
import { STORAGE_KEYS, getState, onStateChanged, setState } from "./store.js";
import { getLauncherActions, getToolRegistry } from "./tools.js";

const MAX_RECENT = 6;

function getShortcutLabel() {
  return typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function ensureLauncherDom() {
  let root = document.getElementById("bxgLauncher");
  if (root) {
    return root;
  }

  root = document.createElement("div");
  root.id = "bxgLauncher";
  root.className = "launcher-shell";
  root.hidden = true;
  root.innerHTML = `
    <div class="launcher-backdrop" data-launcher-close></div>
    <div class="launcher-panel panel accent-midnight" role="dialog" aria-modal="true" aria-labelledby="launcherTitle">
      <div class="panel-inner launcher-panel-inner">
        <div class="launcher-head">
          <div>
            <span class="brand-kicker" id="launcherTitle">${tr("全局启动器", "Global Launcher")}</span>
            <div class="muted launcher-head-copy">${tr("搜索工具、收藏、文章和常用动作", "Search tools, links, posts, and actions")}</div>
          </div>
          <button class="btn btn-ghost launcher-close" type="button" data-launcher-close>${tr("关闭", "Close")}</button>
        </div>
        <div class="launcher-search-wrap">
          <input id="launcherSearchInput" class="input launcher-search-input" placeholder="${tr(
            "输入工具名、标签、动作或文章标题",
            "Search by tool, tag, action, or post title"
          )}" />
          <div class="launcher-shortcuts">
            <span class="pill">Esc</span>
            <span class="pill">Enter</span>
            <span class="pill">${getShortcutLabel()} + K</span>
          </div>
        </div>
        <div class="launcher-caption" id="launcherCaption">${tr("最近使用", "Recent")}</div>
        <div id="launcherResults" class="launcher-results" role="listbox" aria-live="polite"></div>
      </div>
    </div>
  `;
  document.body.appendChild(root);
  return root;
}

function readRecentItems() {
  const recent = getState(STORAGE_KEYS.launcherRecent, []);
  if (!Array.isArray(recent)) {
    return [];
  }
  return recent
    .map((item) => ({
      id: String(item.id || ""),
      type: String(item.type || "recent"),
      title: String(item.title || "").trim(),
      subtitle: String(item.subtitle || "").trim(),
      href: String(item.href || ""),
      badge: String(item.badge || ""),
      keywords: Array.isArray(item.keywords) ? item.keywords : []
    }))
    .filter((item) => item.id && item.title && item.href);
}

function persistRecentItem(item) {
  const current = readRecentItems().filter((entry) => entry.id !== item.id);
  const next = [
    {
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      badge: item.badge,
      keywords: item.keywords || []
    },
    ...current
  ].slice(0, MAX_RECENT);
  setState(STORAGE_KEYS.launcherRecent, next);
}

function toSearchHaystack(item) {
  return `${item.title} ${item.subtitle || ""} ${(item.keywords || []).join(" ")}`.toLowerCase();
}

function getDynamicItems() {
  const tools = getToolRegistry().map((tool) => ({
    id: `tool:${tool.id}`,
    type: "tool",
    title: tool.name,
    subtitle: tool.desc,
    href: tool.href,
    badge: tr("工具", "Tool"),
    keywords: tool.keywords || []
  }));

  const actions = getLauncherActions();
  const links = listLinks({ showInLauncherOnly: true }).map((link) => ({
    id: `link:${link.id}`,
    type: "link",
    title: link.title,
    subtitle: [link.category, link.description].filter(Boolean).join(" · ") || link.url,
    href: /^(https?:|mailto:|tel:)/i.test(link.url) ? link.url : langHref(link.url),
    badge: tr("收藏", "Link"),
    keywords: [...link.tags, link.category, link.description, link.url]
  }));

  const posts = listBlogPosts({ includeDrafts: true }).map((post) => ({
    id: `post:${post.id}`,
    type: "post",
    title: post.title,
    subtitle: `${post.status === "published" ? tr("已发布", "Published") : tr("草稿", "Draft")} · ${post.summary}`,
    href: langHref(`/blog/post.html?id=${encodeURIComponent(post.id)}`),
    badge: tr("文章", "Post"),
    keywords: [...post.tags, post.slug, post.template, post.summary]
  }));

  return [...actions, ...tools, ...links, ...posts];
}

function renderResultList(resultsEl, captionEl, items, keyword, activeIndex) {
  captionEl.textContent = keyword
    ? tr(`搜索结果 · ${items.length} 条`, `${items.length} result(s)`)
    : tr("最近使用", "Recent");

  if (items.length === 0) {
    resultsEl.innerHTML = `<div class="empty-state launcher-empty">${tr(
      "没有匹配结果，试试搜索工具、文章或标签。",
      "No matches. Try a tool, post, or tag."
    )}</div>`;
    return;
  }

  resultsEl.innerHTML = items
    .map(
      (item, index) => `
        <button
          type="button"
          class="launcher-item ${index === activeIndex ? "is-active" : ""}"
          data-launcher-item="${item.id}"
          role="option"
          aria-selected="${index === activeIndex ? "true" : "false"}"
        >
          <div class="launcher-item-main">
            <div class="launcher-item-title-row">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="pill">${item.badge || ""}</span>
            </div>
            <div class="launcher-item-subtitle">${escapeHtml(item.subtitle || "")}</div>
          </div>
          <div class="launcher-item-arrow">↗</div>
        </button>
      `
    )
    .join("");
}

function filterItems(items, keyword) {
  const search = String(keyword || "").trim().toLowerCase();
  if (!search) {
    const recent = readRecentItems();
    const recentById = new Map(recent.map((item) => [item.id, item]));
    const mappedRecent = recent
      .map((item) => items.find((entry) => entry.id === item.id) || item)
      .filter(Boolean);

    const fallback = items.filter((item) => !recentById.has(item.id)).slice(0, 10);
    return [...mappedRecent, ...fallback].slice(0, 12);
  }

  return items
    .filter((item) => toSearchHaystack(item).includes(search))
    .slice(0, 18);
}

function openLauncherItem(item) {
  if (!item?.href) {
    return;
  }
  persistRecentItem(item);

  const href = item.href;
  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    window.location.href = href;
    return;
  }
  window.location.href = langHref(href, getLang());
}

function mountTrigger(openLauncher) {
  const header = document.querySelector(".page-header");
  if (!header || header.querySelector("[data-launcher-trigger]")) {
    return;
  }

  const target =
    header.querySelector(".header-actions-inline") ||
    header.querySelector(".header-actions") ||
    header.querySelector(".toolbar");

  if (!target) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn launcher-trigger-btn";
  button.dataset.launcherTrigger = "true";
  button.innerHTML = `
    <span>${tr("启动器", "Launcher")}</span>
    <span class="pill launcher-trigger-pill">${getShortcutLabel()} + K</span>
  `;
  button.addEventListener("click", openLauncher);
  target.prepend(button);
}

export function mountLauncher() {
  if (document.body.dataset.launcherMounted === "true") {
    return;
  }
  document.body.dataset.launcherMounted = "true";

  const root = ensureLauncherDom();
  const searchInput = root.querySelector("#launcherSearchInput");
  const resultsEl = root.querySelector("#launcherResults");
  const captionEl = root.querySelector("#launcherCaption");

  let activeIndex = 0;
  let currentItems = [];

  const refresh = () => {
    currentItems = filterItems(getDynamicItems(), searchInput.value);
    activeIndex = Math.max(0, Math.min(activeIndex, Math.max(currentItems.length - 1, 0)));
    renderResultList(resultsEl, captionEl, currentItems, searchInput.value, activeIndex);
  };

  const openLauncher = () => {
    root.hidden = false;
    document.body.classList.add("launcher-open");
    refresh();
    window.setTimeout(() => searchInput.focus(), 10);
  };

  const closeLauncher = () => {
    root.hidden = true;
    document.body.classList.remove("launcher-open");
    searchInput.value = "";
    activeIndex = 0;
  };

  mountTrigger(openLauncher);
  refresh();

  root.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-launcher-close]");
    if (closeButton) {
      closeLauncher();
      return;
    }

    const resultButton = event.target.closest("[data-launcher-item]");
    if (!resultButton) {
      return;
    }

    const item = currentItems.find((entry) => entry.id === resultButton.dataset.launcherItem);
    if (!item) {
      return;
    }
    closeLauncher();
    openLauncherItem(item);
  });

  searchInput.addEventListener("input", () => {
    activeIndex = 0;
    refresh();
  });

  window.addEventListener("keydown", (event) => {
    const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
    if (isShortcut) {
      event.preventDefault();
      if (root.hidden) {
        openLauncher();
      } else {
        closeLauncher();
      }
      return;
    }

    if (root.hidden) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeLauncher();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, Math.max(currentItems.length - 1, 0));
      refresh();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      refresh();
      return;
    }

    if (event.key === "Enter") {
      if (!currentItems[activeIndex]) {
        return;
      }
      event.preventDefault();
      const item = currentItems[activeIndex];
      closeLauncher();
      openLauncherItem(item);
    }
  });

  onStateChanged((detail) => {
    if (
      [
        STORAGE_KEYS.links,
        STORAGE_KEYS.blogPosts,
        STORAGE_KEYS.launcherRecent,
        STORAGE_KEYS.focusSessions,
        STORAGE_KEYS.todos
      ].includes(detail.key)
    ) {
      refresh();
    }
  });
}
