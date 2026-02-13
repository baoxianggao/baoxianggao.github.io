import { STORAGE_KEYS, getState, setState, initializeDefaults } from "../core/store.js";
import { bootI18n, tr, applyLangToLinks, setText, setPlaceholder } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

initializeDefaults();
bootTheme();
bootI18n();

const docSelectEl = document.getElementById("docSelect");
const newDocBtn = document.getElementById("newDocBtn");
const saveDocBtn = document.getElementById("saveDocBtn");
const docTitleInputEl = document.getElementById("docTitleInput");
const editorTextEl = document.getElementById("editorText");
const editorPreviewEl = document.getElementById("editorPreview");
const exportMdBtn = document.getElementById("exportMdBtn");
const exportTxtBtn = document.getElementById("exportTxtBtn");
const exportHtmlBtn = document.getElementById("exportHtmlBtn");

const defaultDoc = {
  id: "doc_default",
  title: tr("欢迎文档", "Welcome Document"),
  content: tr(
    "# 欢迎使用编辑器\n\n- 支持 Markdown 实时预览\n- 可拖拽图片到左侧编辑区\n- 可导出 MD / HTML / TXT\n",
    "# Welcome to the Editor\n\n- Live Markdown preview\n- Drag images into the editor pane\n- Export to MD / HTML / TXT\n"
  ),
  updatedAtISO: new Date().toISOString()
};

let docs = getState(STORAGE_KEYS.editorDocs, []);
if (!Array.isArray(docs) || docs.length === 0) {
  docs = [defaultDoc];
  setState(STORAGE_KEYS.editorDocs, docs);
}

let activeDocId = docs[0].id;
let autoSaveTimer;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getDocById(id) {
  return docs.find((doc) => doc.id === id);
}

function persistDocs() {
  setState(STORAGE_KEYS.editorDocs, docs);
}

function renderDocSelect() {
  docSelectEl.innerHTML = docs
    .map((doc) => `<option value="${doc.id}">${escapeHtml(doc.title || tr("未命名文档", "Untitled document"))}</option>`)
    .join("");
  docSelectEl.value = activeDocId;
}

function renderPreview() {
  const markdown = editorTextEl.value || "";
  editorPreviewEl.innerHTML = window.marked.parse(markdown);
}

function loadDoc(docId) {
  const doc = getDocById(docId);
  if (!doc) {
    return;
  }
  activeDocId = doc.id;
  docTitleInputEl.value = doc.title;
  editorTextEl.value = doc.content;
  renderDocSelect();
  renderPreview();
}

function saveActiveDoc() {
  const index = docs.findIndex((doc) => doc.id === activeDocId);
  if (index < 0) {
    return;
  }

  docs[index] = {
    ...docs[index],
    title: docTitleInputEl.value.trim() || tr("未命名文档", "Untitled document"),
    content: editorTextEl.value,
    updatedAtISO: new Date().toISOString()
  };

  persistDocs();
  renderDocSelect();
}

function createNewDoc() {
  const id = window.crypto?.randomUUID ? `doc_${window.crypto.randomUUID()}` : `doc_${Date.now()}`;
  const newDoc = {
    id,
    title: tr(`新文档 ${docs.length + 1}`, `New Document ${docs.length + 1}`),
    content: "",
    updatedAtISO: new Date().toISOString()
  };
  docs.unshift(newDoc);
  persistDocs();
  loadDoc(id);
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  textarea.value = `${before}${text}${after}`;
  const cursor = start + text.length;
  textarea.setSelectionRange(cursor, cursor);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${escapeHtml(
      title
    )}</title></head><body>${window.marked.parse(editorTextEl.value)}</body></html>`;
    downloadFile(`${title}.html`, html, "text/html;charset=utf-8");
  });
}

function bindDragDropImage() {
  editorTextEl.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  editorTextEl.addEventListener("drop", (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      return;
    }

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const markdown = `\n![${file.name}](${reader.result})\n`;
        insertAtCursor(editorTextEl, markdown);
        renderPreview();
        saveActiveDoc();
      };
      reader.readAsDataURL(file);
    });
  });
}

function bindActions() {
  docSelectEl.addEventListener("change", () => {
    saveActiveDoc();
    loadDoc(docSelectEl.value);
  });

  newDocBtn.addEventListener("click", createNewDoc);
  saveDocBtn.addEventListener("click", saveActiveDoc);

  docTitleInputEl.addEventListener("input", () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveActiveDoc, 500);
  });

  editorTextEl.addEventListener("input", () => {
    renderPreview();
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveActiveDoc, 800);
  });

  bindDragDropImage();
  bindExport();
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 文本编辑器", "BaoXiangGao Tools - Editor");
  setText("#editorBrandTitle", "文本/代码/图片编辑器", "Text / Code / Image Editor");
  setText("#editorBackHomeBtn", "返回首页", "Back Home");
  setText("#newDocBtn", "新建文档", "New Document");
  setText("#saveDocBtn", "保存本地", "Save Local");
  setPlaceholder("#docTitleInput", "文档标题", "Document title");
  setText("#exportMdBtn", "导出 MD", "Export MD");
  setText("#exportTxtBtn", "导出 TXT", "Export TXT");
  setText("#exportHtmlBtn", "导出 HTML", "Export HTML");
  setText("#editorPaneEditTitle", "编辑区（支持拖拽图片）", "Editor (drag & drop images)");
  setText("#editorPanePreviewTitle", "实时预览", "Live Preview");
}

function bootstrap() {
  applyStaticI18n();
  renderDocSelect();
  loadDoc(activeDocId);
  bindActions();
  applyLangToLinks();
}

bootstrap();
