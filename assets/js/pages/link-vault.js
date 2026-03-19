import { listLinks, removeLink, upsertLink } from "../core/links.js";
import { applyLangToLinks, bootI18n, isEnglish, setPlaceholder, setText, tr } from "../core/i18n.js";
import { mountLauncher } from "../core/launcher.js";
import { initializeDefaults, onStateChanged, STORAGE_KEYS } from "../core/store.js";
import { bootTheme } from "../core/theme.js";

initializeDefaults();
bootTheme();
bootI18n();

const linkForm = document.getElementById("linkForm");
const linkListEl = document.getElementById("linkList");
const linkHomePreviewEl = document.getElementById("linkHomePreview");
const linkSearchInputEl = document.getElementById("linkSearchInput");
const linkCategoryFilterEl = document.getElementById("linkCategoryFilter");
const linkCountPillEl = document.getElementById("linkCountPill");
const linkModePillEl = document.getElementById("linkVaultModePill");

const statTotalEl = document.getElementById("linkStatTotal");
const statPinnedEl = document.getElementById("linkStatPinned");
const statHomeEl = document.getElementById("linkStatHome");

let editingId = "";
let searchKeyword = "";
let categoryFilter = "";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getFormValues() {
  return {
    id: editingId,
    title: document.getElementById("linkTitleInput").value.trim(),
    url: document.getElementById("linkUrlInput").value.trim(),
    category: document.getElementById("linkCategoryInput").value.trim(),
    tags: document.getElementById("linkTagsInput").value.trim(),
    description: document.getElementById("linkDescriptionInput").value.trim(),
    pinned: document.getElementById("linkPinnedInput").checked,
    showOnHome: document.getElementById("linkShowOnHomeInput").checked,
    showInLauncher: document.getElementById("linkShowInLauncherInput").checked
  };
}

function resetForm() {
  editingId = "";
  linkForm.reset();
  document.getElementById("linkShowInLauncherInput").checked = true;
  linkModePillEl.textContent = "New";
  setText("#linkVaultFormTitle", "新增收藏", "New Link");
}

function loadLinkToForm(link) {
  editingId = link.id;
  document.getElementById("linkTitleInput").value = link.title;
  document.getElementById("linkUrlInput").value = link.url;
  document.getElementById("linkCategoryInput").value = link.category;
  document.getElementById("linkTagsInput").value = link.tags.join(", ");
  document.getElementById("linkDescriptionInput").value = link.description;
  document.getElementById("linkPinnedInput").checked = Boolean(link.pinned);
  document.getElementById("linkShowOnHomeInput").checked = Boolean(link.showOnHome);
  document.getElementById("linkShowInLauncherInput").checked = Boolean(link.showInLauncher);
  linkModePillEl.textContent = tr("编辑中", "Editing");
  setText("#linkVaultFormTitle", "编辑收藏", "Edit Link");
}

function filterLinks() {
  return listLinks({
    search: searchKeyword,
    category: categoryFilter
  });
}

function renderCategoryFilter() {
  const categories = Array.from(new Set(listLinks().map((link) => link.category).filter(Boolean))).sort();
  const current = categoryFilter;
  linkCategoryFilterEl.innerHTML = `<option value="">${tr("全部分类", "All categories")}</option>${categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("")}`;
  linkCategoryFilterEl.value = current;
}

function renderStats() {
  const links = listLinks();
  statTotalEl.textContent = String(links.length);
  statPinnedEl.textContent = String(links.filter((link) => link.pinned).length);
  statHomeEl.textContent = String(links.filter((link) => link.showOnHome).length);
  linkCountPillEl.textContent = `${filterLinks().length}`;
}

function renderHomePreview() {
  const previewLinks = listLinks({ showOnHomeOnly: true, pinnedOnly: true }).slice(0, 6);
  if (previewLinks.length === 0) {
    linkHomePreviewEl.innerHTML = `<div class="empty-state">${tr(
      "还没有会展示到首页的收藏，勾选“置顶 + 展示到首页”就会出现在这里。",
      "No home links yet. Mark a link as pinned and visible on Home to preview it here."
    )}</div>`;
    return;
  }

  linkHomePreviewEl.innerHTML = previewLinks
    .map(
      (link) => `
        <a class="link-preview-card" href="${escapeHtml(link.url)}">
          <div class="blog-teaser-meta">
            <span class="pill">${escapeHtml(link.category)}</span>
            <span class="muted">${link.showInLauncher ? tr("启动器可见", "Launcher visible") : tr("仅页面可见", "Page only")}</span>
          </div>
          <h3>${escapeHtml(link.title)}</h3>
          <p>${escapeHtml(link.description || link.url)}</p>
        </a>
      `
    )
    .join("");
}

function renderLinkList() {
  const links = filterLinks();
  if (links.length === 0) {
    linkListEl.innerHTML = `<div class="empty-state">${tr(
      "当前筛选条件下没有收藏。",
      "No links match the current filter."
    )}</div>`;
    return;
  }

  linkListEl.innerHTML = links
    .map(
      (link) => `
        <article class="link-card" data-link-id="${link.id}">
          <div class="link-card-main">
            <div class="link-card-top">
              <div>
                <h3>${escapeHtml(link.title)}</h3>
                <div class="muted">${escapeHtml(link.url)}</div>
              </div>
              <div class="chips">
                ${link.pinned ? `<span class="pill">${tr("置顶", "Pinned")}</span>` : ""}
                ${link.showOnHome ? `<span class="pill">${tr("首页", "Home")}</span>` : ""}
                ${link.showInLauncher ? `<span class="pill">${tr("启动器", "Launcher")}</span>` : ""}
              </div>
            </div>
            ${link.description ? `<p class="link-card-description">${escapeHtml(link.description)}</p>` : ""}
            <div class="chips">
              <span class="tag">${escapeHtml(link.category)}</span>
              ${link.tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
          <div class="link-card-actions">
            <button class="btn" data-action="open">${tr("打开", "Open")}</button>
            <button class="btn" data-action="copy">${tr("复制地址", "Copy URL")}</button>
            <button class="btn" data-action="edit">${tr("编辑", "Edit")}</button>
            <button class="btn btn-danger" data-action="delete">${tr("删除", "Delete")}</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderAll() {
  renderCategoryFilter();
  renderStats();
  renderHomePreview();
  renderLinkList();
}

function bindActions() {
  linkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = getFormValues();
    if (!values.title || !values.url) {
      return;
    }
    upsertLink(values);
    resetForm();
    renderAll();
  });

  document.getElementById("linkCancelBtn").addEventListener("click", resetForm);

  linkSearchInputEl.addEventListener("input", () => {
    searchKeyword = linkSearchInputEl.value.trim();
    renderStats();
    renderLinkList();
  });

  linkCategoryFilterEl.addEventListener("change", () => {
    categoryFilter = linkCategoryFilterEl.value;
    renderStats();
    renderLinkList();
  });

  linkListEl.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) {
      return;
    }
    const card = actionButton.closest("[data-link-id]");
    const id = card?.dataset.linkId;
    const link = listLinks().find((item) => item.id === id);
    if (!link) {
      return;
    }

    if (actionButton.dataset.action === "open") {
      window.location.href = link.url;
      return;
    }
    if (actionButton.dataset.action === "copy") {
      await navigator.clipboard.writeText(link.url);
      actionButton.textContent = tr("已复制", "Copied");
      window.setTimeout(() => {
        actionButton.textContent = tr("复制地址", "Copy URL");
      }, 1200);
      return;
    }
    if (actionButton.dataset.action === "edit") {
      loadLinkToForm(link);
      document.getElementById("linkTitleInput").focus();
      return;
    }

    const ok = window.confirm(tr(`确认删除「${link.title}」？`, `Delete "${link.title}"?`));
    if (ok) {
      removeLink(link.id);
      if (editingId === link.id) {
        resetForm();
      }
      renderAll();
    }
  });

  onStateChanged((detail) => {
    if (detail.key === STORAGE_KEYS.links) {
      renderAll();
    }
  });
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 快捷收藏", "BaoXiangGao Tools - Link Vault");
  setText("#linkVaultBrandTitle", "快捷收藏", "Link Vault");
  setText(
    "#linkVaultBrandDesc",
    "把常用网址、站内入口和命令说明整理到一个本地优先的收藏库里。",
    "Collect useful links, internal routes, and command notes in one local-first vault."
  );
  setText("#linkVaultBackHomeBtn", "返回首页", "Back Home");
  setText("#linkVaultOpenDataCenterBtn", "数据中心", "Data Center");
  setText("#linkVaultFormTitle", "新增收藏", "New Link");
  setText("#linkVaultFormHint", "支持外链、站内入口和命令说明文本。", "Save external links, internal routes, and command notes.");
  setText("#linkTitleLabel", "标题", "Title");
  setText("#linkUrlLabel", "地址", "URL");
  setText("#linkCategoryLabel", "分类", "Category");
  setText("#linkTagsLabel", "标签", "Tags");
  setText("#linkDescriptionLabel", "说明 / 命令", "Description / Command");
  setText("#linkPinnedLabel", "置顶", "Pinned");
  setText("#linkPinnedHint", "优先出现在列表顶部", "Show at the top of the list");
  setText("#linkHomeLabel", "展示到首页", "Show on Home");
  setText("#linkHomeHint", "最多展示 6 个置顶收藏", "Up to 6 pinned links on Home");
  setText("#linkLauncherLabel", "展示到启动器", "Show in Launcher");
  setText("#linkLauncherHint", "支持全局命令面板搜索", "Searchable in the global launcher");
  setText("#linkSubmitBtn", "保存收藏", "Save Link");
  setText("#linkCancelBtn", "取消编辑", "Cancel");
  setText("#linkVaultOverviewTitle", "收藏概览", "Overview");
  setText("#linkVaultOverviewHint", "筛选、搜索，并预览会出现在首页的收藏。", "Filter, search, and preview links that appear on Home.");
  setText("#linkStatTotalLabel", "总收藏", "Total Links");
  setText("#linkStatPinnedLabel", "置顶", "Pinned");
  setText("#linkStatHomeLabel", "首页可见", "Home Visible");
  setText("#linkVaultHomePreviewTitle", "首页收藏预览", "Home Preview");
  setText("#linkVaultHomePreviewHint", "这里只展示置顶且勾选“首页可见”的前 6 项。", "Only the first 6 pinned home-visible links appear here.");
  setText("#linkVaultListTitle", "全部收藏", "All Links");
  setText("#linkVaultListHint", "支持编辑、复制链接和快速跳转。", "Edit, copy, and jump quickly from here.");

  setPlaceholder("#linkTitleInput", "例如：博客目录", "Example: Blog Directory");
  setPlaceholder("#linkUrlInput", "https://example.com or /blog/index.html", "https://example.com or /blog/index.html");
  setPlaceholder("#linkCategoryInput", "workspace / reading / tools", "workspace / reading / tools");
  setPlaceholder("#linkTagsInput", "blog, publish, note", "blog, publish, note");
  setPlaceholder(
    "#linkDescriptionInput",
    "例如：pnpm dev 或记录打开路径的说明",
    "For example: pnpm dev or a note about how to use the link"
  );
  setPlaceholder("#linkSearchInput", "搜索标题、分类、标签、说明", "Search title, category, tags, description");
}

function bootstrap() {
  applyStaticI18n();
  resetForm();
  renderAll();
  bindActions();
  mountLauncher();
  applyLangToLinks();
}

bootstrap();
