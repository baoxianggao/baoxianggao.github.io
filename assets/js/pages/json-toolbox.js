import { bootI18n, tr, applyLangToLinks, setText } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

bootTheme();
bootI18n();

const inputEl = document.getElementById("jsonInput");
const outputEl = document.getElementById("jsonOutput");
const metaEl = document.getElementById("jsonMeta");

const btnFormat = document.getElementById("btnFormatJson");
const btnMinify = document.getElementById("btnMinifyJson");
const btnValidate = document.getElementById("btnValidateJson");
const btnJsonToYaml = document.getElementById("btnJsonToYaml");
const btnYamlToJson = document.getElementById("btnYamlToJson");

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - JSON 工具箱", "BaoXiangGao Tools - JSON Toolbox");
  setText("#jsonBrandTitle", "JSON 工具箱", "JSON Toolbox");
  setText("#jsonBackHomeBtn", "返回首页", "Back Home");
  setText("#btnFormatJson", "格式化", "Format");
  setText("#btnMinifyJson", "压缩", "Minify");
  setText("#btnValidateJson", "校验", "Validate");
  setText("#jsonInputTitle", "输入", "Input");
  setText("#jsonOutputTitle", "输出", "Output");

  inputEl.value = '{\n  "name": "BaoXiangGao",\n  "tools": ["calendar", "clock", "todo"]\n}';
}

function setMeta(text) {
  metaEl.textContent = text;
}

function validateJson() {
  try {
    const parsed = JSON.parse(inputEl.value);
    setMeta(
      tr(`JSON 合法 · 键数 ${Object.keys(parsed || {}).length}`, `Valid JSON · keys ${Object.keys(parsed || {}).length}`)
    );
    outputEl.value = inputEl.value;
  } catch (error) {
    setMeta(tr(`JSON 错误: ${error.message}`, `JSON error: ${error.message}`));
  }
}

btnFormat.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(inputEl.value);
    outputEl.value = JSON.stringify(parsed, null, 2);
    setMeta(tr("格式化完成", "Formatted"));
  } catch (error) {
    setMeta(tr(`格式化失败: ${error.message}`, `Format failed: ${error.message}`));
  }
});

btnMinify.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(inputEl.value);
    outputEl.value = JSON.stringify(parsed);
    setMeta(tr("压缩完成", "Minified"));
  } catch (error) {
    setMeta(tr(`压缩失败: ${error.message}`, `Minify failed: ${error.message}`));
  }
});

btnValidate.addEventListener("click", validateJson);

btnJsonToYaml.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(inputEl.value);
    outputEl.value = window.jsyaml.dump(parsed);
    setMeta(tr("JSON 转 YAML 成功", "JSON to YAML success"));
  } catch (error) {
    setMeta(tr(`转换失败: ${error.message}`, `Convert failed: ${error.message}`));
  }
});

btnYamlToJson.addEventListener("click", () => {
  try {
    const parsed = window.jsyaml.load(inputEl.value);
    outputEl.value = JSON.stringify(parsed, null, 2);
    setMeta(tr("YAML 转 JSON 成功", "YAML to JSON success"));
  } catch (error) {
    setMeta(tr(`转换失败: ${error.message}`, `Convert failed: ${error.message}`));
  }
});

applyStaticI18n();
validateJson();
applyLangToLinks();
