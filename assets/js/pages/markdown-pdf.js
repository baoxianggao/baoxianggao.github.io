import { bootI18n, tr, applyLangToLinks, setText } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

bootTheme();
bootI18n();

const inputEl = document.getElementById("mdPdfInput");
const previewEl = document.getElementById("mdPdfPreview");
const exportBtn = document.getElementById("mdPdfExportBtn");

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - Markdown 转 PDF", "BaoXiangGao Tools - Markdown to PDF");
  setText("#mdPdfBrandTitle", "Markdown 转 PDF", "Markdown to PDF");
  setText("#mdPdfBackHomeBtn", "返回首页", "Back Home");
  setText("#mdPdfExportBtn", "导出 PDF", "Export PDF");

  inputEl.value = tr(
    "# Markdown 转 PDF\n\n这是一个示例文档。\n\n## 功能\n\n- 支持 Markdown 输入\n- 右侧实时预览\n- 一键导出 PDF\n\n```js\nconsole.log('Hello PDF');\n```",
    "# Markdown to PDF\n\nThis is an example document.\n\n## Features\n\n- Markdown input\n- Live preview\n- One-click PDF export\n\n```js\nconsole.log('Hello PDF');\n```"
  );
}

function renderPreview() {
  previewEl.innerHTML = `<div class="pdf-export-wrap">${window.marked.parse(inputEl.value || "")}</div>`;
}

async function exportPdf() {
  const container = previewEl.querySelector(".pdf-export-wrap");
  if (!container) {
    return;
  }

  const options = {
    margin: 10,
    filename: `markdown-${Date.now()}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  await window.html2pdf().set(options).from(container).save();
}

applyStaticI18n();
inputEl.addEventListener("input", renderPreview);
exportBtn.addEventListener("click", exportPdf);
renderPreview();
applyLangToLinks();
