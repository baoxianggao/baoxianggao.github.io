import { STORAGE_KEYS, getState, setState } from "./store.js";

/**
 * @typedef {"draft"|"published"} BlogStatus
 * @typedef {"journal"|"guide"|"build-log"|"review"} BlogTemplate
 *
 * @typedef {Object} BlogPost
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {string} summary
 * @property {string} content
 * @property {string[]} tags
 * @property {BlogStatus} status
 * @property {BlogTemplate} template
 * @property {string} accent
 * @property {"zh"|"en"} language
 * @property {string} createdAtISO
 * @property {string} updatedAtISO
 * @property {string} publishedAtISO
 */

const BLOG_STATUS = new Set(["draft", "published"]);
const BLOG_TEMPLATES = new Set(["journal", "guide", "build-log", "review"]);
const BLOG_LANGS = new Set(["zh", "en"]);
const BLOG_ACCENTS = new Set(["ocean", "copper", "forest", "midnight"]);

function uid(prefix = "blog") {
  if (window.crypto?.randomUUID) {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toISO(value, fallbackISO = new Date().toISOString()) {
  if (!value) {
    return fallbackISO;
  }
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) {
    return fallbackISO;
  }
  return new Date(ms).toISOString();
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((item) => String(item).trim()).filter(Boolean).slice(0, 10);
  }
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  return [];
}

export function slugify(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return raw || `post-${new Date().toISOString().slice(0, 10)}`;
}

function createFallbackTitle(lang = "zh") {
  return lang === "en" ? "Untitled Post" : "未命名文章";
}

function defaultSummary(lang = "zh") {
  return lang === "en" ? "A new post from BaoXiangGao Tools." : "来自 BaoXiangGao Tools 的一篇新文章。";
}

function normalizePost(post) {
  const incoming = typeof post === "object" && post ? post : {};
  const language = BLOG_LANGS.has(incoming.language) ? incoming.language : "zh";
  const nowISO = new Date().toISOString();
  const title = String(incoming.title || createFallbackTitle(language)).trim() || createFallbackTitle(language);
  const slug = slugify(incoming.slug || title);
  const status = BLOG_STATUS.has(incoming.status) ? incoming.status : "draft";
  return {
    id: String(incoming.id || uid()),
    title,
    slug,
    summary: String(incoming.summary || defaultSummary(language)).trim() || defaultSummary(language),
    content: String(incoming.content || "").trim(),
    tags: normalizeTags(incoming.tags),
    status,
    template: BLOG_TEMPLATES.has(incoming.template) ? incoming.template : "guide",
    accent: BLOG_ACCENTS.has(incoming.accent) ? incoming.accent : "ocean",
    language,
    createdAtISO: toISO(incoming.createdAtISO || nowISO),
    updatedAtISO: toISO(incoming.updatedAtISO || nowISO),
    publishedAtISO: status === "published" ? toISO(incoming.publishedAtISO || nowISO) : String(incoming.publishedAtISO || "")
  };
}

function persistPosts(posts) {
  setState(
    STORAGE_KEYS.blogPosts,
    posts.map((post) => normalizePost(post))
  );
}

export function listBlogPosts(filter = {}) {
  const posts = getState(STORAGE_KEYS.blogPosts, []);
  const keyword = String(filter.search || "").trim().toLowerCase();
  const status = filter.status || "";
  const language = filter.language || "";
  const includeDrafts = Boolean(filter.includeDrafts);

  if (!Array.isArray(posts)) {
    return [];
  }

  return posts
    .map((post) => normalizePost(post))
    .filter((post) => (includeDrafts ? true : post.status === "published"))
    .filter((post) => (status ? post.status === status : true))
    .filter((post) => (language ? post.language === language : true))
    .filter((post) => {
      if (!keyword) {
        return true;
      }
      return `${post.title} ${post.summary} ${post.tags.join(" ")} ${post.slug}`.toLowerCase().includes(keyword);
    })
    .sort((a, b) => {
      const timeA = new Date(a.publishedAtISO || a.updatedAtISO).getTime();
      const timeB = new Date(b.publishedAtISO || b.updatedAtISO).getTime();
      return timeB - timeA;
    });
}

export function getBlogPostByIdOrSlug(identifier) {
  const target = String(identifier || "").trim();
  if (!target) {
    return null;
  }
  const posts = listBlogPosts({ includeDrafts: true });
  return posts.find((post) => post.id === target || post.slug === target) || null;
}

export function upsertBlogPost(post) {
  const normalized = normalizePost(post);
  const posts = listBlogPosts({ includeDrafts: true });
  const index = posts.findIndex((item) => item.id === normalized.id);
  const next = {
    ...normalized,
    updatedAtISO: new Date().toISOString(),
    publishedAtISO:
      normalized.status === "published"
        ? normalized.publishedAtISO || new Date().toISOString()
        : ""
  };

  if (index >= 0) {
    posts[index] = {
      ...posts[index],
      ...next,
      createdAtISO: posts[index].createdAtISO
    };
  } else {
    posts.unshift(next);
  }

  persistPosts(posts);
  return next;
}

export function removeBlogPost(id) {
  const posts = listBlogPosts({ includeDrafts: true }).filter((post) => post.id !== id);
  persistPosts(posts);
}

export function duplicateBlogPost(id) {
  const source = getBlogPostByIdOrSlug(id);
  if (!source) {
    return null;
  }
  return upsertBlogPost({
    ...source,
    id: "",
    title: `${source.title} Copy`,
    slug: `${source.slug}-copy`,
    status: "draft",
    publishedAtISO: ""
  });
}

export function estimateReadingMinutes(content) {
  const words = String(content || "")
    .replace(/[#>*`\-\[\]!()]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function extractHeadings(markdown) {
  return String(markdown || "")
    .split("\n")
    .map((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (!match) {
        return null;
      }
      return {
        depth: match[1].length,
        text: match[2].trim(),
        anchor: slugify(match[2].trim())
      };
    })
    .filter(Boolean);
}

export function buildBlogTemplate({ title, template = "guide", lang = "zh", summary = "" }) {
  const cleanTitle = String(title || "").trim() || createFallbackTitle(lang);
  const cleanSummary = String(summary || "").trim() || defaultSummary(lang);

  if (lang === "en") {
    if (template === "journal") {
      return `# ${cleanTitle}

> ${cleanSummary}

## Snapshot
- Date:
- Mood:
- Focus:

## What Happened
Write the core events, decisions, or observations of the day.

## What I Learned
- Lesson one
- Lesson two

## Next Move
Describe the next action you want to take tomorrow.`;
    }

    if (template === "build-log") {
      return `# ${cleanTitle}

> ${cleanSummary}

## Goal
What were you trying to build or improve?

## Changes Made
- Change one
- Change two

## Problems Encountered
Document blockers, surprises, or tradeoffs.

## Outcome
What works now, and what still needs work?

## Next Step
List the next implementation step.`;
    }

    if (template === "review") {
      return `# ${cleanTitle}

> ${cleanSummary}

## Quick Verdict
State the conclusion in two or three sentences.

## What Worked
- Strength one
- Strength two

## What Did Not
- Weakness one
- Weakness two

## Final Recommendation
Who is this for, and when is it worth using?`;
    }

    return `# ${cleanTitle}

> ${cleanSummary}

## Why This Matters
Explain the motivation and context for the topic.

## Core Ideas
Break down the most important concepts or steps.

## Practical Notes
- Tip one
- Tip two
- Tip three

## Conclusion
Summarize the main takeaway and the next action.`;
  }

  if (template === "journal") {
    return `# ${cleanTitle}

> ${cleanSummary}

## 今日快照
- 日期：
- 状态：
- 重点：

## 发生了什么
记录今天最关键的事件、决定或观察。

## 我的收获
- 收获一
- 收获二

## 下一步
写下你明天准备推进的动作。`;
  }

  if (template === "build-log") {
    return `# ${cleanTitle}

> ${cleanSummary}

## 这次要解决什么
说明这次构建、改造或调试的目标。

## 我做了哪些改动
- 改动一
- 改动二

## 遇到的问题
记录阻塞点、意外情况和权衡。

## 当前结果
现在已经完成了什么，还有什么没完成。

## 下一步计划
列出下一次继续推进的事项。`;
  }

  if (template === "review") {
    return `# ${cleanTitle}

> ${cleanSummary}

## 先说结论
用两三句话给出你的总体判断。

## 值得肯定的地方
- 优点一
- 优点二

## 不足与代价
- 问题一
- 问题二

## 最终建议
说明适合谁、什么场景下值得继续使用。`;
  }

  return `# ${cleanTitle}

> ${cleanSummary}

## 为什么写这篇
说明这个主题的背景和写作动机。

## 核心要点
把最重要的观点、步骤或方法拆开写清楚。

## 实操建议
- 建议一
- 建议二
- 建议三

## 总结
收束全文，并写下下一步行动。`;
}
