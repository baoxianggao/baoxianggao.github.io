import { initializeDefaults } from "../core/store.js";
import {
  buildBlogTemplate,
  duplicateBlogPost,
  estimateReadingMinutes,
  listBlogPosts,
  removeBlogPost,
  slugify,
  upsertBlogPost
} from "../core/blog.js";
import { applyLangToLinks, bootI18n, getLang, isEnglish, langHref, setPlaceholder, setText, tr } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

initializeDefaults();
bootTheme();
bootI18n();

const blogListEl = document.getElementById("blogList");
const blogCountPillEl = document.getElementById("blogCountPill");
const blogSearchInputEl = document.getElementById("blogSearchInput");
const postTitleInputEl = document.getElementById("postTitleInput");
const postSlugInputEl = document.getElementById("postSlugInput");
const postSummaryInputEl = document.getElementById("postSummaryInput");
const postTagsInputEl = document.getElementById("postTagsInput");
const postTemplateSelectEl = document.getElementById("postTemplateSelect");
const postLanguageSelectEl = document.getElementById("postLanguageSelect");
const blogContentInputEl = document.getElementById("blogContentInput");
const blogPreviewEl = document.getElementById("blogPreview");
const blogStudioStatusPillEl = document.getElementById("blogStudioStatusPill");
const blogStudioMetricsEl = document.getElementById("blogStudioMetrics");

const newBlogBtn = document.getElementById("newBlogBtn");
const duplicateBlogBtn = document.getElementById("duplicateBlogBtn");
const deleteBlogBtn = document.getElementById("deleteBlogBtn");
const saveDraftBtn = document.getElementById("saveDraftBtn");
const publishBlogBtn = document.getElementById("publishBlogBtn");
const generateDraftBtn = document.getElementById("generateDraftBtn");
const openPostBtn = document.getElementById("openPostBtn");
const exportBlogMdBtn = document.getElementById("exportBlogMdBtn");
const exportBlogHtmlBtn = document.getElementById("exportBlogHtmlBtn");

let posts = [];
let activePostId = "";
let activeAccent = "ocean";
let searchKeyword = "";
let slugTouched = false;
let autoSaveTimer;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getActivePost() {
  return posts.find((post) => post.id === activePostId) || null;
}

function templateName(template) {
  const map = {
    guide: tr("指南", "Guide"),
    journal: tr("日志", "Journal"),
    "build-log": tr("构建记录", "Build Log"),
    review: tr("评测", "Review")
  };
  return map[template] || template;
}

function getRequestedPostId() {
  return new URLSearchParams(window.location.search).get("id") || "";
}

function formatDateTime(value) {
  if (!value) {
    return tr("未发布", "Unpublished");
  }
  return new Intl.DateTimeFormat(isEnglish() ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function statusText(status) {
  return status === "published" ? tr("已发布", "Published") : tr("草稿", "Draft");
}

function collectForm(statusOverride = "") {
  const post = getActivePost();
  const status = statusOverride || post?.status || "draft";
  return {
    id: post?.id || "",
    title: postTitleInputEl.value.trim() || tr("未命名文章", "Untitled Post"),
    slug: postSlugInputEl.value.trim() || slugify(postTitleInputEl.value),
    summary: postSummaryInputEl.value.trim() || tr("这是一篇待完善的博客草稿。", "This is a draft post waiting to be refined."),
    tags: postTagsInputEl.value,
    template: postTemplateSelectEl.value,
    language: postLanguageSelectEl.value,
    accent: activeAccent,
    content: blogContentInputEl.value,
    status,
    createdAtISO: post?.createdAtISO || "",
    publishedAtISO: status === "published" ? post?.publishedAtISO || new Date().toISOString() : ""
  };
}

function refreshPosts() {
  posts = listBlogPosts({ includeDrafts: true });
}

function renderAccentState() {
  document.querySelectorAll(".accent-swatch").forEach((button) => {
    const active = button.dataset.accent === activeAccent;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function renderBlogList() {
  const filtered = posts.filter((post) => {
    if (!searchKeyword) {
      return true;
    }
    const haystack = `${post.title} ${post.summary} ${post.tags.join(" ")}`.toLowerCase();
    return haystack.includes(searchKeyword);
  });

  blogCountPillEl.textContent = `${filtered.length}`;

  if (filtered.length === 0) {
    blogListEl.innerHTML = `<div class="empty-state">${tr("没有匹配文章，换个关键词试试。", "No posts matched. Try another keyword.")}</div>`;
    return;
  }

  blogListEl.innerHTML = filtered
    .map(
      (post) => `
        <button class="blog-list-item accent-${post.accent} ${post.id === activePostId ? "is-active" : ""}" type="button" data-post-id="${post.id}">
          <h3>${escapeHtml(post.title)}</h3>
          <div class="blog-list-meta">
            <span class="pill">${statusText(post.status)}</span>
            <span>${templateName(post.template)}</span>
          </div>
          <p class="muted" style="margin:10px 0 0">${escapeHtml(post.summary).slice(0, 90)}</p>
          <div class="blog-list-meta" style="margin-top:10px">
            <span>${formatDateTime(post.updatedAtISO)}</span>
            <span>${post.tags.slice(0, 2).map((tag) => `#${escapeHtml(tag)}`).join(" ")}</span>
          </div>
        </button>
      `
    )
    .join("");

  blogListEl.querySelectorAll("[data-post-id]").forEach((button) => {
    button.addEventListener("click", () => {
      saveCurrentSilently();
      loadPost(button.dataset.postId);
    });
  });
}

function renderPreview() {
  const post = collectForm(getActivePost()?.status || "draft");
  blogPreviewEl.className = `blog-preview accent-${post.accent}`;
  blogPreviewEl.innerHTML = window.marked.parse(post.content || `# ${escapeHtml(post.title)}`);
}

function renderMetrics() {
  const chars = blogContentInputEl.value.length;
  const reading = estimateReadingMinutes(blogContentInputEl.value);
  blogStudioMetricsEl.textContent = isEnglish() ? `${chars} chars · ${reading} min read` : `${chars} 字 · ${reading} 分钟阅读`;
}

function updateStatusPill(status) {
  blogStudioStatusPillEl.textContent = statusText(status);
}

function loadPost(postId) {
  const post = posts.find((item) => item.id === postId);
  if (!post) {
    return;
  }

  activePostId = post.id;
  activeAccent = post.accent;
  slugTouched = false;

  postTitleInputEl.value = post.title;
  postSlugInputEl.value = post.slug;
  postSummaryInputEl.value = post.summary;
  postTagsInputEl.value = post.tags.join(", ");
  postTemplateSelectEl.value = post.template;
  postLanguageSelectEl.value = post.language;
  blogContentInputEl.value = post.content;

  renderAccentState();
  renderBlogList();
  renderPreview();
  renderMetrics();
  updateStatusPill(post.status);
}

function ensureStarterPost() {
  refreshPosts();
  const requestedPostId = getRequestedPostId();
  if (requestedPostId && posts.some((post) => post.id === requestedPostId)) {
    activePostId = requestedPostId;
    return;
  }
  if (posts.length > 0) {
    activePostId = posts[0].id;
    return;
  }

  const language = getLang();
  const starter = upsertBlogPost({
    title: tr("第一篇博客草稿", "First Blog Draft"),
    summary: tr("记录这个工具站的第一篇博客内容。", "Capture the first post for this utility site."),
    language,
    template: "build-log",
    accent: "ocean",
    content: buildBlogTemplate({
      title: tr("我的个人工具站构建记录", "Building My Personal Utility Site"),
      template: "build-log",
      lang: language,
      summary: tr("这一篇用来记录设计、功能和迭代过程。", "Use this post to track design, features, and iteration.")
    }),
    status: "draft"
  });

  refreshPosts();
  activePostId = starter.id;
}

function saveCurrent(statusOverride = "") {
  const saved = upsertBlogPost(collectForm(statusOverride));
  refreshPosts();
  loadPost(saved.id);
  return saved;
}

function saveCurrentSilently() {
  const post = getActivePost();
  if (!post) {
    return null;
  }
  const saved = upsertBlogPost(collectForm(post.status));
  refreshPosts();
  activePostId = saved.id;
  renderBlogList();
  return saved;
}

function createNewPost(template = "guide") {
  const language = getLang();
  const title = tr("新文章", "New Post");
  const created = upsertBlogPost({
    title,
    summary: tr("在这里写下文章摘要。", "Write the post summary here."),
    template,
    language,
    accent: template === "review" ? "copper" : template === "journal" ? "forest" : template === "build-log" ? "midnight" : "ocean",
    content: buildBlogTemplate({
      title,
      template,
      lang: language,
      summary: tr("这是生成的结构稿，可继续修改。", "This is the generated draft structure and can be edited.")
    }),
    status: "draft"
  });
  refreshPosts();
  loadPost(created.id);
}

function insertSnippet(snippet) {
  const start = blogContentInputEl.selectionStart;
  const end = blogContentInputEl.selectionEnd;
  const before = blogContentInputEl.value.slice(0, start);
  const after = blogContentInputEl.value.slice(end);
  blogContentInputEl.value = `${before}${snippet}${after}`;
  const cursor = start + snippet.length;
  blogContentInputEl.focus();
  blogContentInputEl.setSelectionRange(cursor, cursor);
  renderPreview();
  renderMetrics();
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 博客工作台", "BaoXiangGao Tools - Blog Studio");
  setText("#blogStudioBrandTitle", "博客工作台", "Blog Studio");
  setText(
    "#blogStudioBrandDesc",
    "生成结构化博客草稿，管理文章目录，并一键发布到本地博客目录。",
    "Generate structured blog drafts, manage your article library, and publish to the local blog directory."
  );
  setText("#blogStudioBackHomeBtn", "返回首页", "Back Home");
  setText("#blogStudioOpenDirectoryBtn", "博客目录", "Blog Directory");
  setText("#blogStudioLibraryTitle", "文章库", "Post Library");
  setText("#blogStudioLibraryHint", "草稿与已发布文章统一管理", "Manage drafts and published posts together");
  setPlaceholder("#blogSearchInput", "搜索文章标题、摘要、标签", "Search titles, summaries, tags");
  setText("#blogStudioTemplateLabel", "快速生成模板", "Quick Templates");
  setText("#templateGuideBtn", "指南", "Guide");
  setText("#templateJournalBtn", "日志", "Journal");
  setText("#templateBuildLogBtn", "构建记录", "Build Log");
  setText("#templateReviewBtn", "评测", "Review");
  setText("#newBlogBtn", "新建文章", "New Post");
  setText("#duplicateBlogBtn", "复制当前", "Duplicate");
  setText("#deleteBlogBtn", "删除", "Delete");
  setText("#blogStudioTitleLabel", "标题", "Title");
  setText("#blogStudioSlugLabel", "Slug", "Slug");
  setText("#blogStudioSummaryLabel", "摘要", "Summary");
  setText("#blogStudioTagsLabel", "标签", "Tags");
  setText("#blogStudioTemplateFieldLabel", "模板", "Template");
  setText("#blogStudioLanguageLabel", "文章语言", "Post Language");
  setText("#blogStudioAccentLabel", "封面风格", "Cover Accent");
  setText("#generateDraftBtn", "生成结构稿", "Generate Draft");
  setText("#saveDraftBtn", "保存草稿", "Save Draft");
  setText("#publishBlogBtn", "发布文章", "Publish");
  setText("#openPostBtn", "打开文章", "Open Post");
  setText("#exportBlogMdBtn", "导出 MD", "Export MD");
  setText("#exportBlogHtmlBtn", "导出 HTML", "Export HTML");
  setText("#blogStudioEditorTitle", "Markdown 编辑", "Markdown Editor");
  setText("#blogStudioPreviewTitle", "实时预览", "Live Preview");
  setText("#blogSnippetQuote", "引用", "Quote");
  setText("#blogSnippetList", "列表", "List");
  setText("#blogSnippetCode", "代码块", "Code Block");
  setText("#blogStudioStatusPill", "草稿", "Draft");
  setPlaceholder("#postTitleInput", "比如：我如何把 github.io 改造成工具站", "Example: How I turned my github.io into a utility hub");
  setPlaceholder("#postSummaryInput", "写一段站在目录页上展示的摘要", "Write the summary shown on the directory page");
  setPlaceholder("#postTagsInput", "frontend, tools, build-log", "frontend, tools, build-log");

  postTemplateSelectEl.innerHTML = `
    <option value="guide">${tr("指南", "Guide")}</option>
    <option value="journal">${tr("日志", "Journal")}</option>
    <option value="build-log">${tr("构建记录", "Build Log")}</option>
    <option value="review">${tr("评测", "Review")}</option>
  `;
  postLanguageSelectEl.innerHTML = `
    <option value="zh">${tr("中文", "Chinese")}</option>
    <option value="en">English</option>
  `;
}

function bindActions() {
  blogSearchInputEl.addEventListener("input", () => {
    searchKeyword = blogSearchInputEl.value.trim().toLowerCase();
    renderBlogList();
  });

  document.querySelectorAll(".template-btn").forEach((button) => {
    button.addEventListener("click", () => createNewPost(button.dataset.template));
  });

  document.querySelectorAll(".accent-swatch").forEach((button) => {
    button.addEventListener("click", () => {
      activeAccent = button.dataset.accent;
      renderAccentState();
      renderPreview();
    });
  });

  newBlogBtn.addEventListener("click", () => createNewPost("guide"));
  duplicateBlogBtn.addEventListener("click", () => {
    const copy = duplicateBlogPost(activePostId);
    if (!copy) {
      return;
    }
    refreshPosts();
    loadPost(copy.id);
  });

  deleteBlogBtn.addEventListener("click", () => {
    const post = getActivePost();
    if (!post) {
      return;
    }
    const ok = window.confirm(
      tr(`确认删除《${post.title}》？此操作不会恢复。`, `Delete "${post.title}"? This cannot be undone.`)
    );
    if (!ok) {
      return;
    }
    removeBlogPost(post.id);
    refreshPosts();
    if (posts.length === 0) {
      createNewPost("guide");
      return;
    }
    loadPost(posts[0].id);
  });

  postTitleInputEl.addEventListener("input", () => {
    if (!slugTouched) {
      postSlugInputEl.value = slugify(postTitleInputEl.value);
    }
    renderPreview();
    renderMetrics();
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveCurrentSilently, 700);
  });

  postSlugInputEl.addEventListener("input", () => {
    slugTouched = true;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveCurrentSilently, 700);
  });

  [postSummaryInputEl, postTagsInputEl, postTemplateSelectEl, postLanguageSelectEl].forEach((element) => {
    element.addEventListener("input", () => {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(saveCurrentSilently, 700);
    });
    element.addEventListener("change", () => {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(saveCurrentSilently, 700);
    });
  });

  blogContentInputEl.addEventListener("input", () => {
    renderPreview();
    renderMetrics();
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveCurrentSilently, 700);
  });

  generateDraftBtn.addEventListener("click", () => {
    blogContentInputEl.value = buildBlogTemplate({
      title: postTitleInputEl.value,
      template: postTemplateSelectEl.value,
      lang: postLanguageSelectEl.value,
      summary: postSummaryInputEl.value
    });
    renderPreview();
    renderMetrics();
  });

  saveDraftBtn.addEventListener("click", () => saveCurrent("draft"));
  publishBlogBtn.addEventListener("click", () => saveCurrent("published"));

  openPostBtn.addEventListener("click", () => {
    const saved = saveCurrent(getActivePost()?.status || "draft");
    window.location.href = langHref(`/blog/post.html?id=${encodeURIComponent(saved.id)}`);
  });

  exportBlogMdBtn.addEventListener("click", () => {
    const post = collectForm(getActivePost()?.status || "draft");
    downloadFile(`${post.slug || slugify(post.title)}.md`, post.content, "text/markdown;charset=utf-8");
  });

  exportBlogHtmlBtn.addEventListener("click", () => {
    const post = collectForm(getActivePost()?.status || "draft");
    const html = `<!DOCTYPE html><html lang="${post.language}"><head><meta charset="UTF-8"/><title>${escapeHtml(
      post.title
    )}</title></head><body>${window.marked.parse(post.content)}</body></html>`;
    downloadFile(`${post.slug || slugify(post.title)}.html`, html, "text/html;charset=utf-8");
  });

  document.querySelectorAll("[data-snippet]").forEach((button) => {
    button.addEventListener("click", () => insertSnippet(button.dataset.snippet));
  });
}

function bootstrap() {
  applyStaticI18n();
  ensureStarterPost();
  refreshPosts();
  loadPost(activePostId);
  bindActions();
  applyLangToLinks();
}

bootstrap();
