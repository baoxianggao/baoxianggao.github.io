import { applyLangToLinks, bootI18n, isEnglish, setPlaceholder, setText, tr } from "../core/i18n.js";
import { mountLauncher } from "../core/launcher.js";
import { bootTheme } from "../core/theme.js";
import { getSettings, updateSettings } from "../core/store.js";

bootTheme();
bootI18n();

const inputEl = document.getElementById("jsonInput");
const outputEl = document.getElementById("jsonOutput");
const metaEl = document.getElementById("jsonMeta");
const summaryGridEl = document.getElementById("jsonSummaryGrid");
const pathInputEl = document.getElementById("jsonPathInput");
const pathResultEl = document.getElementById("jsonPathResult");
const inputModePillEl = document.getElementById("jsonInputModePill");
const outputModePillEl = document.getElementById("jsonOutputModePill");
const recentSamplesEl = document.getElementById("jsonRecentSamples");

const btnFormat = document.getElementById("btnFormatJson");
const btnMinify = document.getElementById("btnMinifyJson");
const btnValidate = document.getElementById("btnValidateJson");
const btnJsonToYaml = document.getElementById("btnJsonToYaml");
const btnYamlToJson = document.getElementById("btnYamlToJson");
const btnCopyOutput = document.getElementById("btnCopyOutput");
const btnSwapJson = document.getElementById("btnSwapJson");
const btnClearJson = document.getElementById("btnClearJson");
const btnExtractPath = document.getElementById("btnExtractPath");
const btnCopyPathResult = document.getElementById("btnCopyPathResult");

const jsonSampleConfigBtn = document.getElementById("jsonSampleConfigBtn");
const jsonSampleApiBtn = document.getElementById("jsonSampleApiBtn");
const jsonSampleTodoBtn = document.getElementById("jsonSampleTodoBtn");

const SAMPLES = {
  config: `{
  "project": "BaoXiangGao Tools",
  "theme": "system",
  "features": {
    "calendar": true,
    "editor": true,
    "blog": true
  },
  "ports": [3000, 4173]
}`,
  api: `{
  "status": 200,
  "message": "ok",
  "data": {
    "user": {
      "id": "u_1024",
      "name": "Wang",
      "roles": ["admin", "editor"]
    },
    "tools": [
      { "name": "calendar", "enabled": true },
      { "name": "blog", "enabled": true }
    ]
  }
}`,
  todo: `{
  "todos": [
    {
      "title": "Finish blog studio",
      "priority": "high",
      "dueAt": "2026-03-10T09:00:00+08:00"
    },
    {
      "title": "Refine JSON toolbox",
      "priority": "medium",
      "dueAt": "2026-03-11T14:00:00+08:00"
    }
  ]
}`
};

function setModePills(inputMode = "JSON", outputMode = "Result") {
  inputModePillEl.textContent = inputMode;
  outputModePillEl.textContent = outputMode;
}

function setMeta(text, tone = "info") {
  metaEl.textContent = text;
  metaEl.dataset.tone = tone;
}

function calculateDepth(value, currentDepth = 1) {
  if (!value || typeof value !== "object") {
    return currentDepth;
  }
  const values = Array.isArray(value) ? value : Object.values(value);
  if (values.length === 0) {
    return currentDepth;
  }
  return Math.max(...values.map((item) => calculateDepth(item, currentDepth + 1)));
}

function describeType(value) {
  if (Array.isArray(value)) {
    return tr("数组", "Array");
  }
  if (value === null) {
    return "null";
  }
  return typeof value === "object" ? tr("对象", "Object") : typeof value;
}

function renderSummary(value) {
  const bytes = new Blob([JSON.stringify(value)]).size;
  const topLevel = Array.isArray(value) ? value.length : typeof value === "object" && value ? Object.keys(value).length : 0;
  const cards = [
    {
      label: tr("根类型", "Root Type"),
      value: describeType(value)
    },
    {
      label: tr("顶层数量", "Top-level Count"),
      value: String(topLevel)
    },
    {
      label: tr("估算深度", "Depth"),
      value: String(calculateDepth(value))
    },
    {
      label: tr("字节大小", "Bytes"),
      value: String(bytes)
    }
  ];

  summaryGridEl.innerHTML = cards
    .map(
      (card) => `
        <div class="json-metric-card">
          <strong>${card.value}</strong>
          <span class="muted">${card.label}</span>
        </div>
      `
    )
    .join("");
}

function parseJson(text) {
  return JSON.parse(text);
}

function parseYaml(text) {
  return window.jsyaml.load(text);
}

function detectInputType(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return { type: "empty", value: null };
  }

  try {
    return { type: "JSON", value: parseJson(raw) };
  } catch (_) {
    // ignore
  }

  try {
    return { type: "YAML", value: parseYaml(raw) };
  } catch (_) {
    // ignore
  }

  return { type: "unknown", value: null };
}

function extractPathValue(value, path) {
  if (!path.trim()) {
    return value;
  }
  const tokens = path.match(/[^.[\]]+|\[(\d+)\]/g) || [];
  return tokens.reduce((acc, token) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }
    const key = token.startsWith("[") ? Number(token.slice(1, -1)) : token;
    return acc[key];
  }, value);
}

function rememberRecentSample(content) {
  const trimmed = String(content || "").trim();
  if (!trimmed) {
    return;
  }
  const settings = getSettings();
  const next = [trimmed, ...settings.jsonToolboxRecentSamples.filter((sample) => sample !== trimmed)].slice(0, 5);
  updateSettings({
    jsonToolboxRecentSamples: next
  });
  renderRecentSamples();
}

function renderRecentSamples() {
  const samples = getSettings().jsonToolboxRecentSamples;
  if (!samples.length) {
    recentSamplesEl.innerHTML = `<span class="muted">${tr("还没有最近样本。", "No recent samples yet.")}</span>`;
    return;
  }
  recentSamplesEl.innerHTML = samples
    .map(
      (sample, index) => `
        <button type="button" class="tag tag-filter" data-recent-index="${index}">${escapeHtml(
          sample.split("\n")[0].slice(0, 28) || tr("空样本", "Empty sample")
        )}</button>
      `
    )
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readStructuredInput() {
  const detected = detectInputType(inputEl.value);
  if (detected.type === "unknown" || detected.type === "empty") {
    throw new Error(tr("无法识别输入为 JSON 或 YAML。", "Input is not valid JSON or YAML."));
  }
  return detected;
}

function tryParseStructuredText() {
  const outputRaw = outputEl.value.trim();
  if (outputRaw) {
    const outputType = detectInputType(outputRaw);
    if (outputType.type !== "unknown" && outputType.type !== "empty") {
      return outputType;
    }
  }
  return detectInputType(inputEl.value);
}

function fillSample(name) {
  inputEl.value = SAMPLES[name];
  outputEl.value = "";
  pathResultEl.textContent = "--";
  rememberRecentSample(inputEl.value);
  validateJson();
}

function validateJson() {
  try {
    const parsed = readStructuredInput();
    const count = Array.isArray(parsed.value) ? parsed.value.length : Object.keys(parsed.value || {}).length;
    setMeta(tr(`${parsed.type} 合法 · 顶层 ${count} 项`, `Valid ${parsed.type} · ${count} top-level item(s)`), "success");
    outputEl.value = parsed.type === "JSON" ? JSON.stringify(parsed.value, null, 2) : window.jsyaml.dump(parsed.value);
    renderSummary(parsed.value);
    setModePills(parsed.type, parsed.type);
    rememberRecentSample(inputEl.value);
    return parsed.value;
  } catch (error) {
    summaryGridEl.innerHTML = "";
    setMeta(tr(`输入错误: ${error.message}`, `Input error: ${error.message}`), "error");
    return null;
  }
}

function formatJson() {
  try {
    const parsed = readStructuredInput();
    outputEl.value = parsed.type === "JSON" ? JSON.stringify(parsed.value, null, 2) : window.jsyaml.dump(parsed.value);
    renderSummary(parsed.value);
    setModePills(parsed.type, parsed.type);
    setMeta(tr(`${parsed.type} 格式化完成`, `${parsed.type} formatted`), "success");
    rememberRecentSample(inputEl.value);
  } catch (error) {
    setMeta(tr(`格式化失败: ${error.message}`, `Format failed: ${error.message}`), "error");
  }
}

function minifyJson() {
  try {
    const parsed = readStructuredInput();
    outputEl.value = JSON.stringify(parsed.value);
    renderSummary(parsed.value);
    setModePills(parsed.type, "JSON");
    setMeta(tr("压缩完成", "Minified"), "success");
    rememberRecentSample(inputEl.value);
  } catch (error) {
    setMeta(tr(`压缩失败: ${error.message}`, `Minify failed: ${error.message}`), "error");
  }
}

function convertJsonToYaml() {
  try {
    const parsed = readStructuredInput();
    outputEl.value = window.jsyaml.dump(parsed.value);
    renderSummary(parsed.value);
    setModePills(parsed.type, "YAML");
    setMeta(tr("转换为 YAML 成功", "Converted to YAML"), "success");
    rememberRecentSample(inputEl.value);
  } catch (error) {
    setMeta(tr(`转换失败: ${error.message}`, `Convert failed: ${error.message}`), "error");
  }
}

function convertYamlToJson() {
  try {
    const parsed = readStructuredInput();
    outputEl.value = JSON.stringify(parsed.value, null, 2);
    renderSummary(parsed.value);
    setModePills(parsed.type, "JSON");
    setMeta(tr("转换为 JSON 成功", "Converted to JSON"), "success");
    rememberRecentSample(inputEl.value);
  } catch (error) {
    setMeta(tr(`转换失败: ${error.message}`, `Convert failed: ${error.message}`), "error");
  }
}

function extractPath() {
  const parsed = tryParseStructuredText();
  if (!parsed || parsed.type === "empty" || parsed.type === "unknown") {
    pathResultEl.textContent = tr("当前没有可提取的数据。", "There is no structured data to query.");
    return;
  }
  try {
    const value = extractPathValue(parsed.value, pathInputEl.value);
    pathResultEl.textContent = value === undefined ? tr("路径不存在", "Path not found") : JSON.stringify(value, null, 2);
  } catch (error) {
    pathResultEl.textContent = error.message;
  }
}

function updateDetectedMode() {
  const detected = detectInputType(inputEl.value);
  if (detected.type === "JSON" || detected.type === "YAML") {
    setModePills(detected.type, outputEl.value ? outputModePillEl.textContent : tr("结果", "Result"));
    setMeta(tr(`已识别输入类型: ${detected.type}`, `Detected input type: ${detected.type}`), "info");
    return;
  }
  setModePills(tr("未知", "Unknown"), outputEl.value ? outputModePillEl.textContent : tr("结果", "Result"));
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - JSON 工具箱", "BaoXiangGao Tools - JSON Toolbox");
  setText("#jsonBrandTitle", "JSON 工具箱", "JSON Toolbox");
  setText(
    "#jsonBrandDesc",
    "格式化、校验、YAML 转换、路径提取和样本切换集中在一个面板里，适合更高频地处理结构化数据。",
    "Format, validate, convert YAML, extract paths, and switch samples from one focused panel for frequent structured-data work."
  );
  setText("#jsonBackHomeBtn", "返回首页", "Back Home");
  setText("#jsonCommandTitle", "操作面板", "Command Panel");
  setText("#jsonCommandHint", "先选样本，再决定是格式化、压缩、校验还是转换", "Start with a sample, then format, minify, validate, or convert");
  setText("#jsonSampleConfigBtn", "配置样本", "Config Sample");
  setText("#jsonSampleApiBtn", "接口样本", "API Sample");
  setText("#jsonSampleTodoBtn", "待办样本", "Todo Sample");
  setText("#btnFormatJson", "格式化", "Format");
  setText("#btnMinifyJson", "压缩", "Minify");
  setText("#btnValidateJson", "校验", "Validate");
  setText("#btnJsonToYaml", "JSON→YAML", "JSON→YAML");
  setText("#btnYamlToJson", "YAML→JSON", "YAML→JSON");
  setText("#btnCopyOutput", "复制输出", "Copy Output");
  setText("#btnSwapJson", "交换输入输出", "Swap");
  setText("#btnClearJson", "清空", "Clear");
  setText("#jsonInputTitle", "输入", "Input");
  setText("#jsonOutputTitle", "输出", "Output");
  setText("#jsonInsightTitle", "结构洞察", "Structure Insights");
  setText("#jsonPathLabel", "路径提取", "Path Query");
  setText("#btnExtractPath", "提取路径", "Extract Path");
  setText("#btnCopyPathResult", "复制路径结果", "Copy Path Result");
  setText("#jsonRecentLabel", "最近样本", "Recent Samples");
  setPlaceholder("#jsonPathInput", "例如：tools[0]", "Example: tools[0]");
  inputEl.value = SAMPLES.config;
}

function bindActions() {
  btnFormat.addEventListener("click", formatJson);
  btnMinify.addEventListener("click", minifyJson);
  btnValidate.addEventListener("click", validateJson);
  btnJsonToYaml.addEventListener("click", convertJsonToYaml);
  btnYamlToJson.addEventListener("click", convertYamlToJson);
  btnExtractPath.addEventListener("click", extractPath);

  btnCopyOutput.addEventListener("click", async () => {
    if (!outputEl.value) {
      return;
    }
    await navigator.clipboard.writeText(outputEl.value);
    btnCopyOutput.textContent = tr("已复制", "Copied");
    window.setTimeout(() => {
      btnCopyOutput.textContent = tr("复制输出", "Copy Output");
    }, 1200);
  });

  btnCopyPathResult.addEventListener("click", async () => {
    if (!pathResultEl.textContent || pathResultEl.textContent === "--") {
      return;
    }
    await navigator.clipboard.writeText(pathResultEl.textContent);
    btnCopyPathResult.textContent = tr("已复制", "Copied");
    window.setTimeout(() => {
      btnCopyPathResult.textContent = tr("复制路径结果", "Copy Path Result");
    }, 1200);
  });

  btnSwapJson.addEventListener("click", () => {
    const temp = inputEl.value;
    inputEl.value = outputEl.value;
    outputEl.value = temp;
    validateJson();
  });

  btnClearJson.addEventListener("click", () => {
    inputEl.value = "";
    outputEl.value = "";
    pathResultEl.textContent = "--";
    summaryGridEl.innerHTML = "";
    setMeta(tr("已清空输入与输出", "Input and output cleared"), "info");
    setModePills("JSON", tr("结果", "Result"));
  });

  jsonSampleConfigBtn.addEventListener("click", () => fillSample("config"));
  jsonSampleApiBtn.addEventListener("click", () => fillSample("api"));
  jsonSampleTodoBtn.addEventListener("click", () => fillSample("todo"));

  inputEl.addEventListener("input", updateDetectedMode);

  recentSamplesEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-recent-index]");
    if (!button) {
      return;
    }
    const sample = getSettings().jsonToolboxRecentSamples[Number(button.dataset.recentIndex)];
    if (!sample) {
      return;
    }
    inputEl.value = sample;
    validateJson();
  });
}

function bootstrap() {
  applyStaticI18n();
  bindActions();
  renderRecentSamples();
  validateJson();
  mountLauncher();
  applyLangToLinks();
}

bootstrap();
