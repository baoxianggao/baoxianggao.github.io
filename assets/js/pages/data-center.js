import { formatDateTime } from "../core/date.js";
import { applyLangToLinks, bootI18n, isEnglish, setText, tr } from "../core/i18n.js";
import { mountLauncher } from "../core/launcher.js";
import {
  applySnapshot,
  clearDataGroup,
  createAndSaveSnapshot,
  createSnapshot,
  DATA_CLEAR_GROUPS,
  getManagedStorageKeys,
  listSnapshots,
  parseSnapshotText,
  saveSnapshot,
  snapshotToFileContent,
  validateSnapshot
} from "../core/snapshot.js";
import { initializeDefaults, STORAGE_KEYS } from "../core/store.js";
import { bootTheme } from "../core/theme.js";

initializeDefaults();
bootTheme();
bootI18n();

const exportSnapshotBtn = document.getElementById("exportSnapshotBtn");
const backupNowBtn = document.getElementById("backupNowBtn");
const selectImportFileBtn = document.getElementById("selectImportFileBtn");
const importSnapshotInput = document.getElementById("importSnapshotInput");
const importPreviewEl = document.getElementById("importPreview");
const applyImportBtn = document.getElementById("applyImportBtn");
const clearImportPreviewBtn = document.getElementById("clearImportPreviewBtn");
const backupListEl = document.getElementById("backupList");
const clearGroupGridEl = document.getElementById("clearGroupGrid");

const managedKeysCountEl = document.getElementById("dataCenterManagedKeys");
const backupCountEl = document.getElementById("dataCenterBackupCount");
const latestBackupEl = document.getElementById("dataCenterLatestBackup");
const resetAllBtn = document.getElementById("resetAllBtn");

let pendingImportSnapshot = null;

function downloadFile(filename, content, type = "application/json;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildSnapshotFilename(snapshot) {
  const stamp = new Date(snapshot.createdAtISO).toISOString().replaceAll(":", "-");
  return `bxg-tools-snapshot-${stamp}.json`;
}

function renderOverview() {
  const snapshots = listSnapshots();
  managedKeysCountEl.textContent = String(getManagedStorageKeys().length);
  backupCountEl.textContent = String(snapshots.length);
  latestBackupEl.textContent = snapshots[0]
    ? new Intl.DateTimeFormat(isEnglish() ? "en-US" : "zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(snapshots[0].createdAtISO))
    : "--";
}

function renderImportPreview() {
  if (!pendingImportSnapshot) {
    importPreviewEl.className = "empty-state";
    importPreviewEl.textContent = tr("暂无待导入快照。", "No snapshot is selected for import.");
    applyImportBtn.disabled = true;
    return;
  }

  importPreviewEl.className = "snapshot-preview-card";
  importPreviewEl.innerHTML = `
    <div class="panel-heading">
      <div>
        <h3>${tr("导入预览", "Import Preview")}</h3>
        <div class="muted">${tr("版本", "Version")}: ${pendingImportSnapshot.version}</div>
      </div>
      <span class="pill">${pendingImportSnapshot.keys.length} ${tr("个键", "keys")}</span>
    </div>
    <div class="chips" style="margin-top: 12px">
      <span class="tag">${tr("创建时间", "Created")}: ${formatDateTime(
        pendingImportSnapshot.createdAtISO,
        "Asia/Shanghai",
        isEnglish() ? "en-US" : "zh-CN"
      )}</span>
      <span class="tag">${tr("将整包替换当前数据", "Will fully replace current data")}</span>
    </div>
    <pre class="snapshot-preview-code">${JSON.stringify(
      Object.fromEntries(Object.entries(pendingImportSnapshot.payload).slice(0, 4)),
      null,
      2
    )}</pre>
  `;
  applyImportBtn.disabled = false;
}

function renderBackupList() {
  const snapshots = listSnapshots();
  if (snapshots.length === 0) {
    backupListEl.innerHTML = `<div class="empty-state">${tr(
      "还没有本地备份，先手动备份一次会更稳妥。",
      "No local backups yet. Create one before making destructive changes."
    )}</div>`;
    return;
  }

  backupListEl.innerHTML = snapshots
    .map(
      (snapshot) => `
        <article class="backup-card" data-snapshot-id="${snapshot.id}">
          <div>
            <strong>${tr("本地快照", "Local Snapshot")}</strong>
            <div class="muted">${formatDateTime(snapshot.createdAtISO, "Asia/Shanghai", isEnglish() ? "en-US" : "zh-CN")}</div>
          </div>
          <div class="chips">
            <span class="tag">${snapshot.version}</span>
            <span class="tag">${snapshot.keys.length} ${tr("个键", "keys")}</span>
          </div>
          <div class="toolbar" style="margin-top: 12px">
            <button class="btn" data-action="preview">${tr("作为导入预览", "Use as Preview")}</button>
            <button class="btn" data-action="download">${tr("下载", "Download")}</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderClearGroups() {
  const definitions = [
    { id: "todos-events", title: tr("清空 Todo + 日程", "Clear Todo + Events"), desc: tr("任务与手动日程会一起清空。", "Tasks and manual events are cleared together.") },
    { id: "editor-docs", title: tr("清空编辑器文档", "Clear Editor Docs"), desc: tr("删除文档库与最近文档。", "Remove saved documents and recents.") },
    { id: "clock-focus", title: tr("清空时钟 + 专注", "Clear Clock + Focus"), desc: tr("倒计时状态、专注记录和设置一起重置。", "Reset countdown state, focus records, and focus settings.") },
    { id: "blog-posts", title: tr("清空博客数据", "Clear Blog Data"), desc: tr("博客目录和工作台文章一起清空。", "Clear posts from both the directory and studio.") },
    { id: "links-launcher", title: tr("清空收藏 + 启动器历史", "Clear Links + Launcher History"), desc: tr("删除快捷收藏和最近启动记录。", "Remove quick links and launcher recents.") },
    { id: "holiday-cache", title: tr("清空节假日缓存", "Clear Holiday Cache"), desc: tr("重新同步时会重新拉取缓存。", "Holiday cache will be rebuilt on next sync.") },
    { id: "preferences", title: tr("重置偏好设置", "Reset Preferences"), desc: tr("语言、主题和站点设置回到默认值。", "Language, theme, and site settings return to defaults.") },
    { id: "snapshots", title: tr("清空本地备份", "Clear Snapshots"), desc: tr("只删除数据中心里的本地备份历史。", "Only clear local backups listed in Data Center.") }
  ];

  clearGroupGridEl.innerHTML = definitions
    .map(
      (item) => `
        <article class="clear-group-card">
          <div>
            <strong>${item.title}</strong>
            <p class="muted">${item.desc}</p>
          </div>
          <button class="btn btn-danger" data-clear-group="${item.id}">${tr("立即清空", "Clear Now")}</button>
        </article>
      `
    )
    .join("");
}

async function applyImportedSnapshot() {
  if (!pendingImportSnapshot) {
    return;
  }

  const ok = window.confirm(
    tr("确认导入这个快照？导入前会自动备份当前数据，导入后将整包替换。", "Import this snapshot? A local backup is created first and current data will be replaced.")
  );
  if (!ok) {
    return;
  }

  const preImportBackup = createAndSaveSnapshot();
  applySnapshot(pendingImportSnapshot);
  saveSnapshot(preImportBackup);
  initializeDefaults();
  window.location.reload();
}

function handleImportedText(text) {
  try {
    const snapshot = parseSnapshotText(text);
    const validation = validateSnapshot(snapshot);
    if (!validation.ok) {
      throw new Error(validation.error);
    }
    pendingImportSnapshot = validation.snapshot;
    renderImportPreview();
  } catch (error) {
    pendingImportSnapshot = null;
    importPreviewEl.className = "empty-state";
    importPreviewEl.textContent = `${tr("快照无效", "Invalid snapshot")}: ${error.message}`;
    applyImportBtn.disabled = true;
  }
}

function bindActions() {
  exportSnapshotBtn.addEventListener("click", () => {
    const snapshot = createSnapshot();
    downloadFile(buildSnapshotFilename(snapshot), snapshotToFileContent(snapshot));
  });

  backupNowBtn.addEventListener("click", () => {
    createAndSaveSnapshot();
    renderOverview();
    renderBackupList();
  });

  selectImportFileBtn.addEventListener("click", () => importSnapshotInput.click());

  importSnapshotInput.addEventListener("change", () => {
    const file = importSnapshotInput.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      handleImportedText(String(reader.result || ""));
      importSnapshotInput.value = "";
    };
    reader.readAsText(file);
  });

  applyImportBtn.addEventListener("click", applyImportedSnapshot);

  clearImportPreviewBtn.addEventListener("click", () => {
    pendingImportSnapshot = null;
    renderImportPreview();
  });

  backupListEl.addEventListener("click", (event) => {
    const actionButton = event.target.closest("button[data-action]");
    if (!actionButton) {
      return;
    }
    const card = actionButton.closest("[data-snapshot-id]");
    const snapshot = listSnapshots().find((item) => item.id === card?.dataset.snapshotId);
    if (!snapshot) {
      return;
    }

    if (actionButton.dataset.action === "preview") {
      pendingImportSnapshot = snapshot;
      renderImportPreview();
      return;
    }

    downloadFile(buildSnapshotFilename(snapshot), snapshotToFileContent(snapshot));
  });

  clearGroupGridEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-clear-group]");
    if (!button) {
      return;
    }
    const groupId = button.dataset.clearGroup;
    const ok = window.confirm(tr("确认清空这个模块吗？建议先做本地备份。", "Clear this module? Consider making a backup first."));
    if (!ok) {
      return;
    }
    clearDataGroup(groupId);
    initializeDefaults();
    if (groupId === "snapshots") {
      renderOverview();
      renderBackupList();
      return;
    }
    window.location.reload();
  });

  resetAllBtn.addEventListener("click", () => {
    const ok = window.confirm(
      tr("确认重置整站数据？这会清空所有工具数据、偏好和本地备份。", "Reset all site data? This clears all tool data, preferences, and local backups.")
    );
    if (!ok) {
      return;
    }

    Object.keys(DATA_CLEAR_GROUPS).forEach((groupId) => clearDataGroup(groupId));
    initializeDefaults();
    window.location.reload();
  });
}

function applyStaticI18n() {
  document.title = tr("BaoXiangGao Tools - 数据中心", "BaoXiangGao Tools - Data Center");
  setText("#dataCenterBrandTitle", "数据中心", "Data Center");
  setText(
    "#dataCenterBrandDesc",
    "统一管理导出、导入、本地备份、模块级清空与整站重置，全部操作都保持本地优先。",
    "Manage exports, imports, backups, module resets, and full-site reset in one local-first workspace."
  );
  setText("#dataCenterBackHomeBtn", "返回首页", "Back Home");
  setText("#dataCenterOpenLinksBtn", "快捷收藏", "Link Vault");
  setText("#dataCenterOverviewTitle", "数据总览", "Overview");
  setText("#dataCenterOverviewHint", "导出完整快照，或先生成一份本地备份再继续清理。", "Export a full snapshot, or create a local backup before cleaning data.");
  setText("#dataCenterManagedKeysLabel", "受管模块", "Managed Keys");
  setText("#dataCenterBackupCountLabel", "本地备份", "Backups");
  setText("#dataCenterLatestBackupLabel", "最近备份", "Latest Backup");
  setText("#exportSnapshotBtn", "导出完整快照", "Export Snapshot");
  setText("#backupNowBtn", "立即备份当前数据", "Backup Current Data");
  setText("#dataCenterImportTitle", "导入快照", "Import Snapshot");
  setText("#dataCenterImportHint", "先预览，再决定是否导入。导入前会自动生成当前数据备份。", "Preview before import. A local backup is created automatically first.");
  setText("#selectImportFileBtn", "选择快照文件", "Choose Snapshot");
  setText("#applyImportBtn", "确认导入", "Import Snapshot");
  setText("#clearImportPreviewBtn", "清空预览", "Clear Preview");
  setText("#dataCenterBackupTitle", "本地备份历史", "Backup History");
  setText("#dataCenterBackupHint", "自动备份只保留最近 10 份，可从这里预览或下载。", "Automatic backups keep the most recent 10 items.");
  setText("#dataCenterModuleTitle", "模块级清空", "Module Reset");
  setText("#dataCenterModuleHint", "只清掉指定模块，不影响其他本地数据。", "Clear a single module without touching the rest.");
  setText("#dataCenterDangerTitle", "整站重置", "Full Site Reset");
  setText("#dataCenterDangerHint", "这会清除所有工具数据、偏好和本地备份，请谨慎使用。", "This clears all tool data, preferences, and local backups.");
  setText("#dataCenterDangerNotice", "建议先执行完整导出，或至少生成一份本地备份。", "Export first, or at least create a local backup before resetting.");
  setText("#resetAllBtn", "重置整站数据", "Reset All Data");
}

function bootstrap() {
  applyStaticI18n();
  renderOverview();
  renderImportPreview();
  renderBackupList();
  renderClearGroups();
  bindActions();
  mountLauncher();
  applyLangToLinks();
}

bootstrap();
