import { estimateReadingMinutes, listBlogPosts } from "../core/blog.js";
import { applyLangToLinks, bootI18n, isEnglish, langHref, setPlaceholder, setText, tr } from "../core/i18n.js";
import { mountLauncher } from "../core/launcher.js";
import { bootTheme } from "../core/theme.js";

bootTheme();
bootI18n();

const featuredPostWrapEl = document.getElementById("featuredPostWrap");
const blogDirectoryStatsEl = document.getElementById("blogDirectoryStats");
const blogDirectorySearchEl = document.getElementById("blogDirectorySearch");
const blogStatusFilterEl = document.getElementById("blogStatusFilter");
const blogTagFiltersEl = document.getElementById("blogTagFilters");
const draftSummaryEl = document.getElementById("draftSummary");
const blogCardGridEl = document.getElementById("blogCardGrid");

let selectedTag = "";
let searchKeyword = "";
let selectedStatus = "published";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat(isEnglish() ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function cardUrl(post) {
  return langHref(`/blog/post.html?id=${encodeURIComponent(post.id)}`);
}

function templateLabel(template) {
  const map = {
    guide: tr("指南", "Guide"),
    journal: tr("日志", "Journal"),
    "build-log": tr("构建记录", "Build Log"),
    review: tr("评测", "Review")
  };
  return map[template] || template;
}

function statusLabel(status) {
  return status === "published" ? tr("已发布", "Published") : tr("草稿", "Draft");
}

function getPosts() {
  const all = listBlogPosts({ includeDrafts: true });
  return {
    all,
    published: all.filter((post) => post.status === "published"),
    drafts: all.filter((post) => post.status === "draft")
  };
}

function filterPosts(posts) {
  return posts.filter((post) => {
    const matchesSearch = !searchKeyword
      ? true
      : `${post.title} ${post.summary} ${post.tags.join(" ")}`.toLowerCase().includes(searchKeyword);
    const matchesTag = selectedTag ? post.tags.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });
}

function pickVisiblePosts() {
  const { all, published, drafts } = getPosts();
  const base = selectedStatus === "all" ? all : selectedStatus === "draft" ? drafts : published;
  return {
    ...getPosts(),
    visible: filterPosts(base)
  };
}

function renderFeatured(post) {
  if (!post) {
    featuredPostWrapEl.innerHTML = `
      <div class="empty-state">
        <p>${tr("当前筛选条件下没有文章。去博客工作台新建一篇草稿吧。", "No posts match the current filters. Create a new draft in Blog Studio.")}</p>
        <a class="btn btn-primary" href="${langHref("/tools/blog-studio.html?action=new")}">${tr("新建草稿", "New Draft")}</a>
      </div>
    `;
    return;
  }

  featuredPostWrapEl.innerHTML = `
    <article class="featured-card accent-${post.accent}">
      <div>
        <div class="featured-meta-row" style="margin-bottom:18px">
          <span class="pill">${templateLabel(post.template)}</span>
          <span class="pill">${statusLabel(post.status)}</span>
          <span class="muted">${formatDate(post.publishedAtISO || post.updatedAtISO)}</span>
        </div>
        <h2>${escapeHtml(post.title)}</h2>
        <p style="margin-top:12px">${escapeHtml(post.summary)}</p>
      </div>
      <div class="featured-footer">
        <div class="chips">${post.tags.slice(0, 4).map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("")}</div>
        <a class="btn btn-primary" href="${cardUrl(post)}">${tr("阅读文章", "Read Post")}</a>
      </div>
    </article>
  `;
}

function renderTagFilters(posts) {
  const tags = Array.from(new Set(posts.flatMap((post) => post.tags))).slice(0, 18);
  const buttons = [
    `<button type="button" class="tag tag-filter ${selectedTag ? "" : "is-active"}" data-tag="">${tr("全部", "All")}</button>`
  ];
  tags.forEach((tag) => {
    buttons.push(
      `<button type="button" class="tag tag-filter ${selectedTag === tag ? "is-active" : ""}" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`
    );
  });
  blogTagFiltersEl.innerHTML = buttons.join("");
  blogTagFiltersEl.querySelectorAll("[data-tag]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTag = button.dataset.tag || "";
      renderDirectory();
    });
  });
}

function renderDraftSummary(drafts) {
  if (drafts.length === 0) {
    draftSummaryEl.textContent = tr("暂无草稿", "No drafts yet");
    return;
  }

  draftSummaryEl.innerHTML = `
    <div>${tr(`共有 ${drafts.length} 篇本地草稿`, `${drafts.length} local draft(s)`)}</div>
    <ul class="draft-summary-list">
      ${drafts.slice(0, 4).map((post) => `<li>${escapeHtml(post.title)}</li>`).join("")}
    </ul>
  `;
}

function renderCards(posts) {
  if (posts.length === 0) {
    blogCardGridEl.innerHTML = `<div class="empty-state">${tr("当前筛选条件下没有文章。", "No posts matched the current filters.")}</div>`;
    return;
  }

  blogCardGridEl.innerHTML = posts
    .map(
      (post) => `
        <a class="post-card accent-${post.accent}" href="${cardUrl(post)}">
          <div class="post-card-top">
            <span class="pill">${templateLabel(post.template)}</span>
            <span class="post-card-date">${formatDate(post.publishedAtISO || post.updatedAtISO)}</span>
          </div>
          <div>
            <div class="chips" style="margin-bottom: 10px"><span class="tag">${statusLabel(post.status)}</span></div>
            <h3>${escapeHtml(post.title)}</h3>
            <p style="margin-top:10px">${escapeHtml(post.summary)}</p>
          </div>
          <div class="post-card-footer">
            <div class="chips">${post.tags.slice(0, 3).map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("")}</div>
            <span class="muted">${tr(`${estimateReadingMinutes(post.content)} 分钟阅读`, `${estimateReadingMinutes(post.content)} min read`)}</span>
          </div>
        </a>
      `
    )
    .join("");
}

function renderDirectory() {
  const { all, published, drafts, visible } = pickVisiblePosts();
  blogDirectoryStatsEl.textContent = isEnglish()
    ? `${published.length} published / ${drafts.length} draft`
    : `${published.length} 已发布 / ${drafts.length} 草稿`;
  renderFeatured(visible[0] || published[0] || drafts[0] || null);
  renderTagFilters(all);
  renderDraftSummary(drafts);
  renderCards(visible);
  applyLangToLinks();
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Blog - 博客目录", "BaoXiangGao Blog - Directory");
  setText("#blogDirectoryBrandTitle", "个人博客目录", "Personal Blog Directory");
  setText(
    "#blogDirectoryBrandDesc",
    "整理发布过的文章、构建记录和个人观察。目录数据来自本地存储，适合在 GitHub Pages 上做轻量发布。",
    "Browse published articles, build logs, and observations. The directory is local-first and works well for lightweight GitHub Pages publishing."
  );
  setText("#blogDirectoryBackHomeBtn", "返回首页", "Back Home");
  setText("#blogDirectoryOpenStudioBtn", "打开工作台", "Open Studio");
  setText("#blogFeaturedPill", "精选文章", "Featured");
  setText("#blogFilterTitle", "筛选", "Filters");
  setText("#blogSearchLabel", "搜索", "Search");
  setText("#blogStatusLabel", "状态", "Status");
  setText("#blogTagsLabel", "标签", "Tags");
  setText("#blogDraftsLabel", "本地草稿", "Local Drafts");
  setText("#blogCreateDraftBtn", "新建草稿", "New Draft");
  setText("#blogDirectoryListTitle", "全部文章", "All Posts");
  setText("#blogDirectoryListHint", "按发布时间倒序排列", "Sorted by publish date");
  setPlaceholder("#blogDirectorySearch", "搜索标题、摘要、标签", "Search titles, summaries, tags");

  blogStatusFilterEl.innerHTML = `
    <option value="published">${tr("仅已发布", "Published only")}</option>
    <option value="draft">${tr("仅草稿", "Draft only")}</option>
    <option value="all">${tr("全部状态", "All statuses")}</option>
  `;
}

function bindActions() {
  blogDirectorySearchEl.addEventListener("input", () => {
    searchKeyword = blogDirectorySearchEl.value.trim().toLowerCase();
    renderDirectory();
  });

  blogStatusFilterEl.addEventListener("change", () => {
    selectedStatus = blogStatusFilterEl.value;
    renderDirectory();
  });
}

function bootstrap() {
  applyStaticI18n();
  renderDirectory();
  bindActions();
  mountLauncher();
  applyLangToLinks();
}

bootstrap();
