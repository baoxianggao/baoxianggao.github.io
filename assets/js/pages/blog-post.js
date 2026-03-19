import { estimateReadingMinutes, extractHeadings, getBlogPostByIdOrSlug } from "../core/blog.js";
import { applyLangToLinks, bootI18n, isEnglish, setText, tr } from "../core/i18n.js";
import { mountLauncher } from "../core/launcher.js";
import { bootTheme } from "../core/theme.js";

bootTheme();
bootI18n();

const postHeroEl = document.getElementById("postHero");
const postArticleEl = document.getElementById("postArticle");
const postMetaInfoEl = document.getElementById("postMetaInfo");
const postOutlineEl = document.getElementById("postOutline");
const copyPostLinkBtn = document.getElementById("copyPostLinkBtn");
const exportPostHtmlBtn = document.getElementById("exportPostHtmlBtn");

let currentPost = null;

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
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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

function getPostIdentifier() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || params.get("slug") || "";
}

function renderNotFound() {
  document.title = tr("BaoXiangGao Blog - 未找到文章", "BaoXiangGao Blog - Post Not Found");
  postHeroEl.innerHTML = `
    <div class="empty-state" style="width:100%">
      <p>${tr("没有找到对应的文章，可能还未发布或已被删除。", "The post could not be found. It may not be published yet or has been removed.")}</p>
      <a class="btn btn-primary" href="/tools/blog-studio.html">${tr("返回博客工作台", "Go to Blog Studio")}</a>
    </div>
  `;
  postArticleEl.innerHTML = "";
  postMetaInfoEl.innerHTML = "";
  postOutlineEl.innerHTML = "";
}

function renderPost(post) {
  currentPost = post;
  document.title = `${post.title} - BaoXiangGao Blog`;
  postHeroEl.className = `post-hero accent-${post.accent}`;
  postHeroEl.innerHTML = `
    <div class="post-hero-meta">
      <span class="pill">${templateLabel(post.template)}</span>
      <span class="pill">${post.status === "published" ? tr("已发布", "Published") : tr("草稿", "Draft")}</span>
      <span class="muted">${formatDate(post.publishedAtISO || post.updatedAtISO)}</span>
    </div>
    <h1>${escapeHtml(post.title)}</h1>
    <p>${escapeHtml(post.summary)}</p>
    <div class="chips">${post.tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("")}</div>
  `;

  postArticleEl.innerHTML = window.marked.parse(post.content || `# ${escapeHtml(post.title)}`);

  postMetaInfoEl.innerHTML = `
    <div class="post-meta-block">
      <strong>${tr("阅读时间", "Reading Time")}</strong>
      <div>${tr(`${estimateReadingMinutes(post.content)} 分钟`, `${estimateReadingMinutes(post.content)} min`)}</div>
    </div>
    <div class="post-meta-block">
      <strong>${tr("语言", "Language")}</strong>
      <div>${post.language === "en" ? "English" : tr("中文", "Chinese")}</div>
    </div>
    <div class="post-meta-block">
      <strong>${tr("更新时间", "Updated")}</strong>
      <div>${formatDate(post.updatedAtISO)}</div>
    </div>
  `;

  const outline = extractHeadings(post.content);
  if (outline.length === 0) {
    postOutlineEl.innerHTML = `<div class="empty-state">${tr("当前文章还没有标题层级。", "This post does not have heading structure yet.")}</div>`;
    return;
  }
  postOutlineEl.innerHTML = outline
    .map((item) => `<div class="outline-item depth-${item.depth}">${escapeHtml(item.text)}</div>`)
    .join("");
}

function applyStaticI18n() {
  setText("#blogPostBrandTitle", "博客文章", "Blog Post");
  setText("#blogPostBackDirectoryBtn", "博客目录", "Directory");
  setText("#blogPostOpenStudioBtn", "编辑文章", "Edit Post");
  setText("#blogPostInfoTitle", "文章信息", "Post Info");
  setText("#copyPostLinkBtn", "复制链接", "Copy Link");
  setText("#exportPostHtmlBtn", "导出 HTML", "Export HTML");
  setText("#blogPostOutlineTitle", "提纲", "Outline");
}

function bindActions() {
  copyPostLinkBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyPostLinkBtn.textContent = tr("已复制", "Copied");
      window.setTimeout(() => {
        copyPostLinkBtn.textContent = tr("复制链接", "Copy Link");
      }, 1200);
    } catch (_) {
      copyPostLinkBtn.textContent = tr("复制失败", "Copy failed");
    }
  });

  exportPostHtmlBtn.addEventListener("click", () => {
    if (!currentPost) {
      return;
    }
    const html = `<!DOCTYPE html><html lang="${currentPost.language}"><head><meta charset="UTF-8"/><title>${escapeHtml(
      currentPost.title
    )}</title></head><body>${window.marked.parse(currentPost.content)}</body></html>`;
    downloadFile(`${currentPost.slug || "post"}.html`, html, "text/html;charset=utf-8");
  });
}

function bootstrap() {
  applyStaticI18n();
  const post = getBlogPostByIdOrSlug(getPostIdentifier());
  if (!post) {
    renderNotFound();
  } else {
    renderPost(post);
  }
  bindActions();
  mountLauncher();
  applyLangToLinks();
}

bootstrap();
