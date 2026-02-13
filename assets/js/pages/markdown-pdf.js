const inputEl = document.getElementById("mdPdfInput");
const previewEl = document.getElementById("mdPdfPreview");
const exportBtn = document.getElementById("mdPdfExportBtn");

inputEl.value = `# Markdown 转 PDF\n\n这是一个示例文档。\n\n## 功能\n\n- 支持 Markdown 输入\n- 右侧实时预览\n- 一键导出 PDF\n\n\`\`\`js\nconsole.log('Hello PDF');\n\`\`\``;

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

inputEl.addEventListener("input", renderPreview);
exportBtn.addEventListener("click", exportPdf);

renderPreview();
