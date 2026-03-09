import { upsertBlogPost } from "../core/blog.js";
import { STORAGE_KEYS, getState, initializeDefaults, setState } from "../core/store.js";
import { applyLangToLinks, bootI18n, getLang, isEnglish, langHref, setPlaceholder, setText, tr } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

initializeDefaults();
bootTheme();
bootI18n();

const docListEl = document.getElementById("docList");
const docSearchInputEl = document.getElementById("docSearchInput");
const docTitleInputEl = document.getElementById("docTitleInput");
const editorTextEl = document.getElementById("editorText");
const editorPreviewEl = document.getElementById("editorPreview");
const editorDocCountPillEl = document.getElementById("editorDocCountPill");
const editorSaveStatePillEl = document.getElementById("editorSaveStatePill");
const editorStatsTextEl = document.getElementById("editorStatsText");
const importDocFileEl = document.getElementById("importDocFile");

const newDocBtn = document.getElementById("newDocBtn");
const duplicateDocBtn = document.getElementById("duplicateDocBtn");
const importDocBtn = document.getElementById("importDocBtn");
const deleteDocBtn = document.getElementById("deleteDocBtn");
const saveDocBtn = document.getElementById("saveDocBtn");
const sendToBlogBtn = document.getElementById("sendToBlogBtn");
const exportMdBtn = document.getElementById("exportMdBtn");
const exportTxtBtn = document.getElementById("exportTxtBtn");
const exportHtmlBtn = document.getElementById("exportHtmlBtn");

let docs = [];
let activeDocId = "";
let searchKeyword = "";
let autoSaveTimer;

function uid(prefix = "doc") {
  if (window.crypto?.randomUUID) {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

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

function getTemplateContent(template) {
  const title = tr("新文档", "New Document");
  if (template === "code") {
    return {
      title: tr("代码草稿", "Code Draft"),
      content: `# ${title}\n\n\`\`\`js\nfunction main() {\n  console.log("hello");\n}\n\`\`\`\n`
    };
  }
  if (template === "blog") {
    return {
      title: tr("博客草稿", "Blog Draft"),
      content: `# ${tr("博客标题", "Post Title")}\n\n> ${tr("在这里写摘要。", "Write the summary here.")}\n\n## ${tr("背景", "Background")}\n\n## ${tr("正文", "Main Body")}\n\n## ${tr("总结", "Wrap-up")}\n`
    };
  }
  if (template === "meeting") {
    return {
      title: tr("会议记录", "Meeting Notes"),
      content: `# ${tr("会议记录", "Meeting Notes")}\n\n- ${tr("时间", "Time")}:\n- ${tr("参与人", "Participants")}:\n- ${tr("议题", "Agenda")}:\n\n## ${tr("结论", "Decisions")}\n\n## ${tr("行动项", "Action Items")}\n`
    };
  }
  return {
    title: tr("临时笔记", "Quick Note"),
    content: `# ${tr("快速笔记", "Quick Note")}\n\n- ${tr("在这里记录想法", "Capture thoughts here")}\n`
  };
}

function defaultDoc() {
  return {
    id: "doc_default",
    title: tr("欢迎文档", "Welcome Document"),
    content: tr(
      "# 欢迎使用编辑器\n\n- 左侧管理文档库\n- 支持拖拽图片和文本文件\n- 可快速转成博客草稿\n- 可导出 MD / HTML / TXT\n",
      "# Welcome to the editor\n\n- Manage your document library from the left\n- Drag images and text files into the editor\n- Convert a document into a blog draft\n- Export MD / HTML / TXT\n"
    ),
    updatedAtISO: new Date().toISOString()
  };
}

function getDocById(id) {
  return docs.find((doc) => doc.id === id) || null;
}

function persistDocs() {
  setState(STORAGE_KEYS.editorDocs, docs);
}

function refreshDocs() {
  const state = getState(STORAGE_KEYS.editorDocs, []);
  docs = Array.isArray(state) ? state : [];
}

function ensureDocs() {
  refreshDocs();
  if (docs.length === 0) {
    docs = [defaultDoc()];
    persistDocs();
  }
  activeDocId = activeDocId && getDocById(activeDocId) ? activeDocId : docs[0].id;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(isEnglish() ? "en-US" : "zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function renderDocList() {
  const filtered = docs.filter((doc) => {
    if (!searchKeyword) {
      return true;
    }
    return `${doc.title} ${doc.content}`.toLowerCase().includes(searchKeyword);
  });

  editorDocCountPillEl.textContent = `${filtered.length}`;

  if (filtered.length === 0) {
    docListEl.innerHTML = `<div class="empty-state">${tr("没有匹配的文档。", "No matching documents.")}</div>`;
    return;
  }

  docListEl.innerHTML = filtered
    .map(
      (doc) => `
        <button type="button" class="doc-card ${doc.id === activeDocId ? "is-active" : ""}" data-doc-id="${doc.id}">
          <h3>${escapeHtml(doc.title || tr("未命名文档", "Untitled document"))}</h3>
          <p>${escapeHtml(doc.content).slice(0, 88)}</p>
          <div class="muted" style="margin-top:10px">${formatDateTime(doc.updatedAtISO)}</div>
        </button>
      `
    )
    .join("");

  docListEl.querySelectorAll("[data-doc-id]").forEach((button) => {
    button.addEventListener("click", () => {
      saveActiveDoc();
      loadDoc(button.dataset.docId);
    });
  });
}

function renderPreview() {
  editorPreviewEl.innerHTML = window.marked.parse(editorTextEl.value || "");
}

function renderStats() {
  const content = editorTextEl.value || "";
  const lines = content ? content.split("\n").length : 0;
  const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const images = (content.match(/!\[[^\]]*\]\(/g) || []).length;
  const chars = content.length;
  editorStatsTextEl.textContent = isEnglish()
    ? `${chars} chars · ${lines} lines · ${words} words · ${images} image(s)`
    : `${chars} 字 · ${lines} 行 · ${words} 词 · ${images} 张图`;
}

function setSaveState(saved) {
  editorSaveStatePillEl.textContent = saved ? tr("已保存", "Saved") : tr("编辑中", "Editing");
}

function loadDoc(docId) {
  const doc = getDocById(docId);
  if (!doc) {
    return;
  }
  activeDocId = doc.id;
  docTitleInputEl.value = doc.title;
  editorTextEl.value = doc.content;
  renderDocList();
  renderPreview();
  renderStats();
  setSaveState(true);
}

function saveActiveDoc() {
  const index = docs.findIndex((doc) => doc.id === activeDocId);
  if (index < 0) {
    return null;
  }
  docs[index] = {
    ...docs[index],
    title: docTitleInputEl.value.trim() || tr("未命名文档", "Untitled document"),
    content: editorTextEl.value,
    updatedAtISO: new Date().toISOString()
  };
  persistDocs();
  refreshDocs();
  renderDocList();
  setSaveState(true);
  return docs.find((doc) => doc.id === activeDocId) || null;
}

function createDoc(template = "note") {
  const preset = getTemplateContent(template);
  const doc = {
    id: uid(),
    title: preset.title,
    content: preset.content,
    updatedAtISO: new Date().toISOString()
  };
  docs.unshift(doc);
  persistDocs();
  refreshDocs();
  loadDoc(doc.id);
}

function duplicateDoc() {
  const current = getDocById(activeDocId);
  if (!current) {
    return;
  }
  docs.unshift({
    ...current,
    id: uid(),
    title: `${current.title} ${tr("副本", "Copy")}`,
    updatedAtISO: new Date().toISOString()
  });
  persistDocs();
  refreshDocs();
  loadDoc(docs[0].id);
}

function deleteDoc() {
  if (docs.length === 1) {
    docs = [defaultDoc()];
    persistDocs();
    refreshDocs();
    loadDoc(docs[0].id);
    return;
  }
  docs = docs.filter((doc) => doc.id !== activeDocId);
  persistDocs();
  refreshDocs();
  loadDoc(docs[0].id);
}

function insertAtCursor(text) {
  const start = editorTextEl.selectionStart;
  const end = editorTextEl.selectionEnd;
  const before = editorTextEl.value.slice(0, start);
  const after = editorTextEl.value.slice(end);
  editorTextEl.value = `${before}${text}${after}`;
  const cursor = start + text.length;
  editorTextEl.focus();
  editorTextEl.setSelectionRange(cursor, cursor);
  renderPreview();
  renderStats();
  setSaveState(false);
}

function bindExport() {
  exportMdBtn.addEventListener("click", () => {
    const title = docTitleInputEl.value.trim() || "document";
    downloadFile(`${title}.md`, editorTextEl.value, "text/markdown;charset=utf-8");
  });

  exportTxtBtn.addEventListener("click", () => {
    const title = docTitleInputEl.value.trim() || "document";
    downloadFile(`${title}.txt`, editorTextEl.value, "text/plain;charset=utf-8");
  });

  exportHtmlBtn.addEventListener("click", () => {
    const title = docTitleInputEl.value.trim() || "document";
    const html = `<!DOCTYPE html><html lang="${getLang()}"><head><meta charset="UTF-8"/><title>${escapeHtml(
      title
    )}</title></head><body>${window.marked.parse(editorTextEl.value)}</body></html>`;
    downloadFile(`${title}.html`, html, "text/html;charset=utf-8");
  });
}

function importTextFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const doc = {
      id: uid(),
      title: file.name.replace(/\.[^.]+$/, "") || tr("导入文档", "Imported Document"),
      content: String(reader.result || ""),
      updatedAtISO: new Date().toISOString()
    };
    docs.unshift(doc);
    persistDocs();
    refreshDocs();
    loadDoc(doc.id);
  };
  reader.readAsText(file);
}

function bindDragDrop() {
  editorTextEl.addEventListener("dragover", (event) => event.preventDefault());

  editorTextEl.addEventListener("drop", (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length === 0) {
      return;
    }

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          insertAtCursor(`\n![${file.name}](${reader.result})\n`);
          saveActiveDoc();
        };
        reader.readAsDataURL(file);
        return;
      }

      if (file.type.startsWith("text/") || /\.(md|markdown|txt|json|js|ts|html|css|csv|yml|yaml)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = () => {
          insertAtCursor(`\n${String(reader.result || "")}\n`);
          saveActiveDoc();
        };
        reader.readAsText(file);
      }
    });
  });
}

function bindActions() {
  docSearchInputEl.addEventListener("input", () => {
    searchKeyword = docSearchInputEl.value.trim().toLowerCase();
    renderDocList();
  });

  newDocBtn.addEventListener("click", () => createDoc("note"));
  duplicateDocBtn.addEventListener("click", duplicateDoc);
  importDocBtn.addEventListener("click", () => importDocFileEl.click());
  deleteDocBtn.addEventListener("click", () => {
    const current = getDocById(activeDocId);
    if (!current) {
      return;
    }
    const ok = window.confirm(tr(`确认删除《${current.title}》？`, `Delete "${current.title}"?`));
    if (ok) {
      deleteDoc();
    }
  });

  importDocFileEl.addEventListener("change", () => {
    const file = importDocFileEl.files?.[0];
    if (file) {
      importTextFile(file);
      importDocFileEl.value = "";
    }
  });

  saveDocBtn.addEventListener("click", saveActiveDoc);

  sendToBlogBtn.addEventListener("click", () => {
    const current = saveActiveDoc();
    if (!current) {
      return;
    }
    const lines = current.content.split("\n").map((line) => line.trim());
    const summary = lines.find((line) => line && !line.startsWith("#")) || tr("从编辑器导入的博客草稿。", "Blog draft imported from the editor.");
    const blog = upsertBlogPost({
      title: current.title,
      summary,
      content: current.content,
      tags: "editor,draft",
      language: getLang(),
      status: "draft",
      template: "guide",
      accent: "ocean"
    });
    window.location.href = langHref(`/tools/blog-studio.html?id=${encodeURIComponent(blog.id)}`);
  });

  docTitleInputEl.addEventListener("input", () => {
    setSaveState(false);
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveActiveDoc, 600);
  });

  editorTextEl.addEventListener("input", () => {
    renderPreview();
    renderStats();
    setSaveState(false);
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveActiveDoc, 800);
  });

  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => createDoc(button.dataset.template));
  });

  document.querySelectorAll("[data-snippet]").forEach((button) => {
    button.addEventListener("click", () => insertAtCursor(button.dataset.snippet));
  });

  bindDragDrop();
  bindExport();
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 文本编辑器", "BaoXiangGao Tools - Editor");
  setText("#editorBrandTitle", "文本/代码/图片编辑器", "Text / Code / Image Editor");
  setText(
    "#editorBrandDesc",
    "文档库、模板、拖拽导入、实时预览和博客草稿联动整合在一个工作台里。",
    "Document library, templates, drag-and-drop import, live preview, and blog-draft sync in one workspace."
  );
  setText("#editorBackHomeBtn", "返回首页", "Back Home");
  setText("#editorOpenBlogBtn", "博客工作台", "Blog Studio");
  setText("#editorLibraryTitle", "文档库", "Document Library");
  setText("#editorLibraryHint", "本地文档实时保存", "Local documents are saved in real time");
  setPlaceholder("#docSearchInput", "搜索文档标题或内容", "Search titles or content");
  setText("#editorTemplateLabel", "快速模板", "Quick Templates");
  setText("#editorTemplateNoteBtn", "笔记", "Note");
  setText("#editorTemplateCodeBtn", "代码", "Code");
  setText("#editorTemplateBlogBtn", "博客", "Blog");
  setText("#editorTemplateMeetingBtn", "会议", "Meeting");
  setText("#newDocBtn", "新建文档", "New Document");
  setText("#duplicateDocBtn", "复制", "Duplicate");
  setText("#importDocBtn", "导入文件", "Import File");
  setText("#deleteDocBtn", "删除", "Delete");
  setPlaceholder("#docTitleInput", "文档标题", "Document title");
  setText("#saveDocBtn", "保存本地", "Save Local");
  setText("#sendToBlogBtn", "转成博客草稿", "Send to Blog");
  setText("#exportMdBtn", "导出 MD", "Export MD");
  setText("#exportTxtBtn", "导出 TXT", "Export TXT");
  setText("#exportHtmlBtn", "导出 HTML", "Export HTML");
  setText("#editorPaneEditTitle", "编辑区", "Editor");
  setText("#editorPanePreviewTitle", "实时预览", "Live Preview");
  setText("#editorSnippetList", "列表", "List");
  setText("#editorSnippetQuote", "引用", "Quote");
  setText("#editorSnippetCode", "代码块", "Code Block");
  setText("#editorSnippetImage", "图片", "Image");
  setText("#editorDropHint", "支持拖拽图片和文本文件到编辑区", "Drag images and text files into the editor");
  setText("#editorSaveStatePill", "已保存", "Saved");
}

function bootstrap() {
  applyStaticI18n();
  ensureDocs();
  loadDoc(activeDocId);
  bindActions();
  applyLangToLinks();
}

bootstrap();
