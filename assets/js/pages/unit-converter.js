import { applyLangToLinks, bootI18n, isEnglish, setText, tr } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

bootTheme();
bootI18n();

const categorySelectEl = document.getElementById("converterCategorySelect");
const fromSelectEl = document.getElementById("converterFromSelect");
const toSelectEl = document.getElementById("converterToSelect");
const valueInputEl = document.getElementById("converterValueInput");
const resultEl = document.getElementById("converterResult");
const formulaEl = document.getElementById("converterFormula");
const quickListEl = document.getElementById("converterQuickList");
const convertNowBtn = document.getElementById("convertNowBtn");
const swapUnitsBtn = document.getElementById("swapUnitsBtn");
const copyResultBtn = document.getElementById("copyResultBtn");

function getCategories() {
  return {
    length: {
      label: tr("长度", "Length"),
      units: [
        { key: "m", label: tr("米", "Meter"), factor: 1 },
        { key: "km", label: tr("千米", "Kilometer"), factor: 1000 },
        { key: "cm", label: tr("厘米", "Centimeter"), factor: 0.01 },
        { key: "mm", label: tr("毫米", "Millimeter"), factor: 0.001 },
        { key: "ft", label: tr("英尺", "Foot"), factor: 0.3048 },
        { key: "in", label: tr("英寸", "Inch"), factor: 0.0254 }
      ],
      toBase: (value, unit) => value * unit.factor,
      fromBase: (value, unit) => value / unit.factor
    },
    weight: {
      label: tr("重量", "Weight"),
      units: [
        { key: "kg", label: tr("千克", "Kilogram"), factor: 1 },
        { key: "g", label: tr("克", "Gram"), factor: 0.001 },
        { key: "lb", label: tr("磅", "Pound"), factor: 0.45359237 },
        { key: "oz", label: tr("盎司", "Ounce"), factor: 0.0283495 }
      ],
      toBase: (value, unit) => value * unit.factor,
      fromBase: (value, unit) => value / unit.factor
    },
    temperature: {
      label: tr("温度", "Temperature"),
      units: [
        { key: "c", label: tr("摄氏度", "Celsius") },
        { key: "f", label: tr("华氏度", "Fahrenheit") },
        { key: "k", label: tr("开尔文", "Kelvin") }
      ],
      toBase: (value, unit) => {
        if (unit.key === "f") {
          return ((value - 32) * 5) / 9;
        }
        if (unit.key === "k") {
          return value - 273.15;
        }
        return value;
      },
      fromBase: (value, unit) => {
        if (unit.key === "f") {
          return (value * 9) / 5 + 32;
        }
        if (unit.key === "k") {
          return value + 273.15;
        }
        return value;
      }
    },
    data: {
      label: tr("数据体积", "Data Size"),
      units: [
        { key: "b", label: "B", factor: 1 },
        { key: "kb", label: "KB", factor: 1024 },
        { key: "mb", label: "MB", factor: 1024 ** 2 },
        { key: "gb", label: "GB", factor: 1024 ** 3 },
        { key: "tb", label: "TB", factor: 1024 ** 4 }
      ],
      toBase: (value, unit) => value * unit.factor,
      fromBase: (value, unit) => value / unit.factor
    },
    time: {
      label: tr("时间", "Time"),
      units: [
        { key: "s", label: tr("秒", "Second"), factor: 1 },
        { key: "min", label: tr("分钟", "Minute"), factor: 60 },
        { key: "h", label: tr("小时", "Hour"), factor: 3600 },
        { key: "day", label: tr("天", "Day"), factor: 86400 }
      ],
      toBase: (value, unit) => value * unit.factor,
      fromBase: (value, unit) => value / unit.factor
    }
  };
}

function formatNumber(value) {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return value.toLocaleString(isEnglish() ? "en-US" : "zh-CN", { maximumFractionDigits: 4 });
  }
  return value.toLocaleString(isEnglish() ? "en-US" : "zh-CN", { maximumFractionDigits: 6 });
}

function getCurrentCategory() {
  const categories = getCategories();
  return categories[categorySelectEl.value] || categories.length;
}

function populateCategoryOptions() {
  const categories = getCategories();
  categorySelectEl.innerHTML = Object.entries(categories)
    .map(([key, value]) => `<option value="${key}">${value.label}</option>`)
    .join("");
}

function populateUnitOptions() {
  const category = getCurrentCategory();
  const options = category.units.map((unit) => `<option value="${unit.key}">${unit.label}</option>`).join("");
  fromSelectEl.innerHTML = options;
  toSelectEl.innerHTML = options;
  if (categorySelectEl.value === "length") {
    fromSelectEl.value = "m";
    toSelectEl.value = "ft";
  } else if (categorySelectEl.value === "temperature") {
    fromSelectEl.value = "c";
    toSelectEl.value = "f";
  } else {
    fromSelectEl.value = category.units[0].key;
    toSelectEl.value = category.units[Math.min(1, category.units.length - 1)].key;
  }
}

function convertValue() {
  const category = getCurrentCategory();
  const units = new Map(category.units.map((unit) => [unit.key, unit]));
  const from = units.get(fromSelectEl.value);
  const to = units.get(toSelectEl.value);
  const input = Number(valueInputEl.value);

  if (!from || !to || !Number.isFinite(input)) {
    resultEl.textContent = "--";
    formulaEl.textContent = tr("请输入合法数值", "Enter a valid number");
    return null;
  }

  const base = category.toBase(input, from);
  const result = category.fromBase(base, to);
  resultEl.textContent = `${formatNumber(result)} ${to.label}`;
  formulaEl.textContent = `${formatNumber(input)} ${from.label} = ${formatNumber(result)} ${to.label}`;
  renderQuickList(input, category, from.key);
  return { result, from, to };
}

function renderQuickList(inputValue, category, fromKey) {
  const units = category.units.filter((unit) => unit.key !== fromKey).slice(0, 6);
  const from = category.units.find((unit) => unit.key === fromKey);
  const base = category.toBase(inputValue, from);
  quickListEl.innerHTML = units
    .map((unit) => {
      const converted = category.fromBase(base, unit);
      return `
        <div class="quick-convert-card">
          <strong>${formatNumber(converted)} ${unit.label}</strong>
          <span class="muted">${formatNumber(inputValue)} ${from.label}</span>
        </div>
      `;
    })
    .join("");
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 单位换算", "BaoXiangGao Tools - Unit Converter");
  setText("#unitConverterBrandTitle", "单位换算台", "Unit Converter");
  setText(
    "#unitConverterBrandDesc",
    "集中处理长度、重量、温度、数据体积和时间换算，适合开发和日常使用。",
    "Convert length, weight, temperature, data size, and time for both development and daily use."
  );
  setText("#unitConverterBackHomeBtn", "返回首页", "Back Home");
  setText("#converterCategoryLabel", "类别", "Category");
  setText("#converterFromLabel", "从", "From");
  setText("#converterToLabel", "到", "To");
  setText("#converterValueLabel", "数值", "Value");
  setText("#convertNowBtn", "立即换算", "Convert");
  setText("#swapUnitsBtn", "交换方向", "Swap");
  setText("#copyResultBtn", "复制结果", "Copy Result");
  setText("#converterResultTitle", "结果", "Result");
  setText("#converterQuickListTitle", "常用换算", "Common Conversions");
}

function bindActions() {
  categorySelectEl.addEventListener("change", () => {
    populateUnitOptions();
    convertValue();
  });
  [fromSelectEl, toSelectEl].forEach((element) => element.addEventListener("change", convertValue));
  valueInputEl.addEventListener("input", convertValue);
  convertNowBtn.addEventListener("click", convertValue);
  swapUnitsBtn.addEventListener("click", () => {
    const previous = fromSelectEl.value;
    fromSelectEl.value = toSelectEl.value;
    toSelectEl.value = previous;
    convertValue();
  });
  copyResultBtn.addEventListener("click", async () => {
    if (!resultEl.textContent || resultEl.textContent === "--") {
      return;
    }
    await navigator.clipboard.writeText(resultEl.textContent);
    copyResultBtn.textContent = tr("已复制", "Copied");
    window.setTimeout(() => {
      copyResultBtn.textContent = tr("复制结果", "Copy Result");
    }, 1200);
  });
}

function bootstrap() {
  applyStaticI18n();
  populateCategoryOptions();
  categorySelectEl.value = "length";
  populateUnitOptions();
  convertValue();
  bindActions();
  applyLangToLinks();
}

bootstrap();
