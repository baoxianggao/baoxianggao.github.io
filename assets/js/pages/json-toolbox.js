const inputEl = document.getElementById("jsonInput");
const outputEl = document.getElementById("jsonOutput");
const metaEl = document.getElementById("jsonMeta");

const btnFormat = document.getElementById("btnFormatJson");
const btnMinify = document.getElementById("btnMinifyJson");
const btnValidate = document.getElementById("btnValidateJson");
const btnJsonToYaml = document.getElementById("btnJsonToYaml");
const btnYamlToJson = document.getElementById("btnYamlToJson");

inputEl.value = '{\n  "name": "BaoXiangGao",\n  "tools": ["calendar", "clock", "todo"]\n}';

function setMeta(text) {
  metaEl.textContent = text;
}

function validateJson() {
  try {
    const parsed = JSON.parse(inputEl.value);
    setMeta(`JSON 合法 · 键数 ${Object.keys(parsed || {}).length}`);
    outputEl.value = inputEl.value;
  } catch (error) {
    setMeta(`JSON 错误: ${error.message}`);
  }
}

btnFormat.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(inputEl.value);
    outputEl.value = JSON.stringify(parsed, null, 2);
    setMeta("格式化完成");
  } catch (error) {
    setMeta(`格式化失败: ${error.message}`);
  }
});

btnMinify.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(inputEl.value);
    outputEl.value = JSON.stringify(parsed);
    setMeta("压缩完成");
  } catch (error) {
    setMeta(`压缩失败: ${error.message}`);
  }
});

btnValidate.addEventListener("click", validateJson);

btnJsonToYaml.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(inputEl.value);
    outputEl.value = window.jsyaml.dump(parsed);
    setMeta("JSON 转 YAML 成功");
  } catch (error) {
    setMeta(`转换失败: ${error.message}`);
  }
});

btnYamlToJson.addEventListener("click", () => {
  try {
    const parsed = window.jsyaml.load(inputEl.value);
    outputEl.value = JSON.stringify(parsed, null, 2);
    setMeta("YAML 转 JSON 成功");
  } catch (error) {
    setMeta(`转换失败: ${error.message}`);
  }
});

validateJson();
