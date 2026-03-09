import { applyLangToLinks, bootI18n, isEnglish, setPlaceholder, setText, tr } from "../core/i18n.js";
import { bootTheme } from "../core/theme.js";

bootTheme();
bootI18n();

const passwordModeSelectEl = document.getElementById("passwordModeSelect");
const passwordLengthRangeEl = document.getElementById("passwordLengthRange");
const passwordLengthValueEl = document.getElementById("passwordLengthValue");
const passwordStrengthPillEl = document.getElementById("passwordStrengthPill");
const passwordOutputEl = document.getElementById("passwordOutput");
const hashInputEl = document.getElementById("hashInput");
const hashOutputEl = document.getElementById("hashOutput");

const useUppercaseEl = document.getElementById("useUppercase");
const useLowercaseEl = document.getElementById("useLowercase");
const useNumbersEl = document.getElementById("useNumbers");
const useSymbolsEl = document.getElementById("useSymbols");

const generatePasswordBtn = document.getElementById("generatePasswordBtn");
const copyPasswordBtn = document.getElementById("copyPasswordBtn");
const regeneratePasswordBtn = document.getElementById("regeneratePasswordBtn");
const generateHashBtn = document.getElementById("generateHashBtn");
const copyHashBtn = document.getElementById("copyHashBtn");

const WORDS = [
  "aurora",
  "cinder",
  "harbor",
  "orbit",
  "pixel",
  "velvet",
  "signal",
  "ember",
  "delta",
  "lumen",
  "atlas",
  "cobalt",
  "marble",
  "zenith",
  "ripple",
  "branch",
  "anchor",
  "glider",
  "canvas",
  "modem",
  "circuit",
  "prism",
  "quartz",
  "nova"
];

function randomInt(max) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] % max;
}

function pickRandom(list) {
  return list[randomInt(list.length)];
}

function buildCharset() {
  let charset = "";
  if (useUppercaseEl.checked) {
    charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }
  if (useLowercaseEl.checked) {
    charset += "abcdefghijklmnopqrstuvwxyz";
  }
  if (useNumbersEl.checked) {
    charset += "0123456789";
  }
  if (useSymbolsEl.checked) {
    charset += "!@#$%^&*()_+-=[]{};:,.?";
  }
  return charset;
}

function evaluateStrength(value) {
  let score = 0;
  if (value.length >= 12) {
    score += 1;
  }
  if (value.length >= 18) {
    score += 1;
  }
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) {
    score += 1;
  }
  if (/\d/.test(value)) {
    score += 1;
  }
  if (/[^A-Za-z0-9]/.test(value)) {
    score += 1;
  }

  if (score >= 5) {
    return tr("极强", "Elite");
  }
  if (score >= 3) {
    return tr("强", "Strong");
  }
  if (score >= 2) {
    return tr("中等", "Medium");
  }
  return tr("较弱", "Weak");
}

function generatePassword() {
  const length = Number(passwordLengthRangeEl.value);
  const mode = passwordModeSelectEl.value;

  if (mode === "passphrase") {
    const wordCount = Math.max(3, Math.min(7, Math.round(length / 5)));
    const phrase = Array.from({ length: wordCount }, () => pickRandom(WORDS)).join("-");
    const suffix = useNumbersEl.checked ? String(randomInt(9000) + 1000) : "";
    return `${phrase}${suffix ? `-${suffix}` : ""}`;
  }

  const charset = buildCharset();
  if (!charset) {
    return "";
  }
  return Array.from({ length }, () => charset[randomInt(charset.length)]).join("");
}

function updatePasswordLength() {
  passwordLengthValueEl.textContent = passwordLengthRangeEl.value;
}

function renderPassword() {
  const value = generatePassword();
  passwordOutputEl.value = value;
  passwordStrengthPillEl.textContent = evaluateStrength(value);
}

async function toSha256(value) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function renderHash() {
  if (!hashInputEl.value.trim()) {
    hashOutputEl.textContent = "--";
    return;
  }
  hashOutputEl.textContent = await toSha256(hashInputEl.value);
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 密码实验室", "BaoXiangGao Tools - Password Lab");
  setText("#passwordLabBrandTitle", "密码实验室", "Password Lab");
  setText(
    "#passwordLabBrandDesc",
    "生成强密码、可读短语，以及常见文本摘要哈希，适合日常账号和开发场景。",
    "Generate strong passwords, readable passphrases, and quick text hashes for personal and development use."
  );
  setText("#passwordLabBackHomeBtn", "返回首页", "Back Home");
  setText("#passwordGeneratorTitle", "密码生成器", "Password Generator");
  setText("#passwordGeneratorHint", "两种模式：随机密码和易读短语", "Two modes: random passwords and readable passphrases");
  setText("#passwordModeLabel", "模式", "Mode");
  setText("#passwordLengthLabel", "长度", "Length");
  setText("#passwordLengthValueLabel", "当前长度", "Current Length");
  setText("#passwordUppercaseLabel", "大写字母", "Uppercase");
  setText("#passwordLowercaseLabel", "小写字母", "Lowercase");
  setText("#passwordNumbersLabel", "数字", "Numbers");
  setText("#passwordSymbolsLabel", "符号", "Symbols");
  setText("#generatePasswordBtn", "生成", "Generate");
  setText("#copyPasswordBtn", "复制结果", "Copy Result");
  setText("#regeneratePasswordBtn", "重新生成", "Regenerate");
  setText("#hashToolTitle", "文本摘要", "Text Hash");
  setText("#hashToolHint", "输入任意文本，快速得到 SHA-256 摘要", "Input any text and get a SHA-256 digest");
  setText("#generateHashBtn", "生成哈希", "Generate Hash");
  setText("#copyHashBtn", "复制哈希", "Copy Hash");
  setPlaceholder("#hashInput", "输入需要生成摘要的文本", "Enter text to hash");

  passwordModeSelectEl.innerHTML = `
    <option value="password">${tr("随机密码", "Random Password")}</option>
    <option value="passphrase">${tr("短语密码", "Passphrase")}</option>
  `;
}

function bindActions() {
  passwordLengthRangeEl.addEventListener("input", () => {
    updatePasswordLength();
    renderPassword();
  });

  [passwordModeSelectEl, useUppercaseEl, useLowercaseEl, useNumbersEl, useSymbolsEl].forEach((element) => {
    element.addEventListener("change", renderPassword);
  });

  generatePasswordBtn.addEventListener("click", renderPassword);
  regeneratePasswordBtn.addEventListener("click", renderPassword);

  copyPasswordBtn.addEventListener("click", async () => {
    if (!passwordOutputEl.value) {
      return;
    }
    await navigator.clipboard.writeText(passwordOutputEl.value);
    copyPasswordBtn.textContent = tr("已复制", "Copied");
    window.setTimeout(() => {
      copyPasswordBtn.textContent = tr("复制结果", "Copy Result");
    }, 1200);
  });

  generateHashBtn.addEventListener("click", renderHash);
  copyHashBtn.addEventListener("click", async () => {
    if (!hashOutputEl.textContent || hashOutputEl.textContent === "--") {
      return;
    }
    await navigator.clipboard.writeText(hashOutputEl.textContent);
    copyHashBtn.textContent = tr("已复制", "Copied");
    window.setTimeout(() => {
      copyHashBtn.textContent = tr("复制哈希", "Copy Hash");
    }, 1200);
  });
}

function bootstrap() {
  applyStaticI18n();
  updatePasswordLength();
  renderPassword();
  bindActions();
  applyLangToLinks();
}

bootstrap();
