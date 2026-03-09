import { applyLangToLinks, bootI18n, isEnglish, setPlaceholder, setText, tr } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

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

const btnFormat = document.getElementById("btnFormatJson");
const btnMinify = document.getElementById("btnMinifyJson");
const btnValidate = document.getElementById("btnValidateJson");
const btnJsonToYaml = document.getElementById("btnJsonToYaml");
const btnYamlToJson = document.getElementById("btnYamlToJson");
const btnCopyOutput = document.getElementById("btnCopyOutput");
const btnSwapJson = document.getElementById("btnSwapJson");
const btnClearJson = document.getElementById("btnClearJson");
const btnExtractPath = document.getElementById("btnExtractPath");

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

function setMeta(text) {
  metaEl.textContent = text;
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

function tryParseStructuredText() {
  const outputRaw = outputEl.value.trim();
  const inputRaw = inputEl.value.trim();

  if (outputRaw) {
    try {
      return parseJson(outputRaw);
    } catch (_) {
      // ignore
    }
  }

  if (inputRaw) {
    try {
      return parseJson(inputRaw);
    } catch (_) {
      // ignore
    }
    try {
      return parseYaml(inputRaw);
    } catch (_) {
      // ignore
    }
  }

  return null;
}

function fillSample(name) {
  inputEl.value = SAMPLES[name];
  outputEl.value = "";
  pathResultEl.textContent = "--";
  setModePills("JSON", tr("结果", "Result"));
  validateJson();
}

function validateJson() {
  try {
    const parsed = parseJson(inputEl.value);
    const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed || {}).length;
    setMeta(tr(`JSON 合法 · 顶层 ${count} 项`, `Valid JSON · ${count} top-level item(s)`));
    outputEl.value = JSON.stringify(parsed, null, 2);
    renderSummary(parsed);
    setModePills("JSON", "JSON");
    return parsed;
  } catch (error) {
    summaryGridEl.innerHTML = "";
    setMeta(tr(`JSON 错误: ${error.message}`, `JSON error: ${error.message}`));
    return null;
  }
}

function formatJson() {
  try {
    const parsed = parseJson(inputEl.value);
    outputEl.value = JSON.stringify(parsed, null, 2);
    renderSummary(parsed);
    setModePills("JSON", "JSON");
    setMeta(tr("格式化完成", "Formatted"));
  } catch (error) {
    setMeta(tr(`格式化失败: ${error.message}`, `Format failed: ${error.message}`));
  }
}

function minifyJson() {
  try {
    const parsed = parseJson(inputEl.value);
    outputEl.value = JSON.stringify(parsed);
    renderSummary(parsed);
    setModePills("JSON", "JSON");
    setMeta(tr("压缩完成", "Minified"));
  } catch (error) {
    setMeta(tr(`压缩失败: ${error.message}`, `Minify failed: ${error.message}`));
  }
}

function convertJsonToYaml() {
  try {
    const parsed = parseJson(inputEl.value);
    outputEl.value = window.jsyaml.dump(parsed);
    renderSummary(parsed);
    setModePills("JSON", "YAML");
    setMeta(tr("JSON 转 YAML 成功", "JSON to YAML success"));
  } catch (error) {
    setMeta(tr(`转换失败: ${error.message}`, `Convert failed: ${error.message}`));
  }
}

function convertYamlToJson() {
  try {
    const parsed = parseYaml(inputEl.value);
    outputEl.value = JSON.stringify(parsed, null, 2);
    renderSummary(parsed);
    setModePills("YAML", "JSON");
    setMeta(tr("YAML 转 JSON 成功", "YAML to JSON success"));
  } catch (error) {
    setMeta(tr(`转换失败: ${error.message}`, `Convert failed: ${error.message}`));
  }
}

function extractPath() {
  const parsed = tryParseStructuredText();
  if (!parsed) {
    pathResultEl.textContent = tr("当前没有可提取的数据。", "There is no structured data to query.");
    return;
  }
  try {
    const value = extractPathValue(parsed, pathInputEl.value);
    pathResultEl.textContent = value === undefined ? tr("路径不存在", "Path not found") : JSON.stringify(value, null, 2);
  } catch (error) {
    pathResultEl.textContent = error.message;
  }
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
    setMeta(tr("已清空输入与输出", "Input and output cleared"));
    setModePills("JSON", tr("结果", "Result"));
  });

  jsonSampleConfigBtn.addEventListener("click", () => fillSample("config"));
  jsonSampleApiBtn.addEventListener("click", () => fillSample("api"));
  jsonSampleTodoBtn.addEventListener("click", () => fillSample("todo"));

  inputEl.addEventListener("input", () => {
    setMeta(tr("输入已更新，可继续格式化或校验", "Input updated. Continue with formatting or validation."));
  });
}

function bootstrap() {
  applyStaticI18n();
  bindActions();
  validateJson();
  applyLangToLinks();
}

bootstrap();
