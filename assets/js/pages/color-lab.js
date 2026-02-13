import { bootI18n, tr, applyLangToLinks, setText } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

bootTheme();
bootI18n();

const baseColorInput = document.getElementById("baseColor");
const baseColorHexInput = document.getElementById("baseColorHex");
const baseColorPreview = document.getElementById("baseColorPreview");
const fgColorInput = document.getElementById("fgColor");
const bgColorInput = document.getElementById("bgColor");
const contrastInfoEl = document.getElementById("contrastInfo");
const paletteGridEl = document.getElementById("paletteGrid");
const cssVarsOutputEl = document.getElementById("cssVarsOutput");
const copyCssVarsBtn = document.getElementById("copyCssVarsBtn");

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num));
}

function normalizeHex(hex) {
  const value = hex.trim();
  const full = value.startsWith("#") ? value : `#${value}`;
  if (/^#[0-9a-fA-F]{6}$/.test(full)) {
    return full.toLowerCase();
  }
  return null;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  const toHex = (x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mix(hex1, hex2, ratio) {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  const t = clamp(ratio, 0, 1);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const srgb = [r, g, b].map((value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function buildPalette(baseHex) {
  return [
    mix(baseHex, "#ffffff", 0.8),
    mix(baseHex, "#ffffff", 0.45),
    baseHex,
    mix(baseHex, "#000000", 0.35),
    mix(baseHex, "#000000", 0.62)
  ];
}

function renderPalette(baseHex) {
  const palette = buildPalette(baseHex);
  paletteGridEl.innerHTML = palette
    .map((color) => `<div class="palette-chip" style="background:${color}">${color}</div>`)
    .join("");

  const cssVars = palette
    .map((color, index) => `--tool-color-${index + 1}: ${color};`)
    .join("\n");
  cssVarsOutputEl.value = `:root {\n${cssVars}\n}`;
}

function renderContrast() {
  const fg = normalizeHex(fgColorInput.value) || "#ffffff";
  const bg = normalizeHex(bgColorInput.value) || "#000000";
  const ratio = contrastRatio(fg, bg);
  const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : tr("低于AA", "Below AA");
  contrastInfoEl.textContent = `${tr("对比度", "Contrast")} ${ratio.toFixed(2)} (${level})`;
}

function renderBase(baseHex) {
  baseColorPreview.style.background = `linear-gradient(140deg, ${mix(baseHex, "#ffffff", 0.35)}, ${baseHex}, ${mix(
    baseHex,
    "#000000",
    0.4
  )})`;
  renderPalette(baseHex);
}

function updateFromPicker() {
  const baseHex = normalizeHex(baseColorInput.value) || "#4fe3d1";
  baseColorHexInput.value = baseHex;
  renderBase(baseHex);
}

function updateFromText() {
  const baseHex = normalizeHex(baseColorHexInput.value);
  if (!baseHex) {
    return;
  }
  baseColorInput.value = baseHex;
  renderBase(baseHex);
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 颜色工具", "BaoXiangGao Tools - Color Lab");
  setText("#colorBrandTitle", "颜色实验室", "Color Lab");
  setText("#colorBackHomeBtn", "返回首页", "Back Home");
  setText("#copyCssVarsBtn", "复制 CSS Variables", "Copy CSS Variables");
  setText("#colorBaseTitle", "基础颜色", "Base Color");
  setText("#colorFgLabel", "前景色", "Foreground");
  setText("#colorBgLabel", "背景色", "Background");
  setText("#colorPaletteTitle", "自动调色板", "Auto Palette");
}

copyCssVarsBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(cssVarsOutputEl.value);
    copyCssVarsBtn.textContent = tr("已复制", "Copied");
    setTimeout(() => {
      copyCssVarsBtn.textContent = tr("复制 CSS Variables", "Copy CSS Variables");
    }, 1200);
  } catch (_) {
    copyCssVarsBtn.textContent = tr("复制失败", "Copy failed");
  }
});

baseColorInput.addEventListener("input", updateFromPicker);
baseColorHexInput.addEventListener("change", updateFromText);
fgColorInput.addEventListener("input", renderContrast);
bgColorInput.addEventListener("input", renderContrast);

applyStaticI18n();
updateFromPicker();
renderContrast();
applyLangToLinks();
