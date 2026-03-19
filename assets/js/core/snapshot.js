import {
  DEFAULT_CLOCK_STATE,
  DEFAULT_FOCUS_SETTINGS,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  emitStateChanged,
  getState,
  normalizeClockState,
  normalizeSettings,
  removeState,
  setState,
  toISO,
  uid
} from "./store.js";

export const SNAPSHOT_VERSION = "v1";
export const SNAPSHOT_RETENTION = 10;
export const LANG_STORAGE_KEY = "bxg.tools.v1.lang";
export const THEME_STORAGE_KEY = "bxg.tools.v1.theme_mode";

const EXTRA_MANAGED_KEYS = [LANG_STORAGE_KEY, THEME_STORAGE_KEY];
const SNAPSHOT_MANAGED_KEYS = Object.values(STORAGE_KEYS);

export const DATA_CLEAR_GROUPS = Object.freeze({
  "todos-events": [STORAGE_KEYS.todos, STORAGE_KEYS.events],
  "editor-docs": [STORAGE_KEYS.editorDocs],
  "clock-focus": [STORAGE_KEYS.clock, STORAGE_KEYS.focusSessions, STORAGE_KEYS.focusSettings],
  "blog-posts": [STORAGE_KEYS.blogPosts],
  "links-launcher": [STORAGE_KEYS.links, STORAGE_KEYS.launcherRecent],
  "holiday-cache": [STORAGE_KEYS.holidayCache],
  preferences: [STORAGE_KEYS.settings, LANG_STORAGE_KEY, THEME_STORAGE_KEY],
  snapshots: [STORAGE_KEYS.dataSnapshots]
});

function normalizeSnapshot(snapshot) {
  const incoming = typeof snapshot === "object" && snapshot ? snapshot : {};
  const payload = typeof incoming.payload === "object" && incoming.payload ? incoming.payload : {};
  const keys = Array.isArray(incoming.keys)
    ? incoming.keys.map((item) => String(item || "")).filter(Boolean)
    : Object.keys(payload);

  return {
    id: String(incoming.id || uid("snapshot")),
    createdAtISO: toISO(incoming.createdAtISO || new Date().toISOString()),
    version: String(incoming.version || SNAPSHOT_VERSION),
    keys,
    payload
  };
}

function flattenSnapshotHistory(snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  return {
    ...normalized,
    payload: {
      ...normalized.payload,
      [STORAGE_KEYS.dataSnapshots]: []
    }
  };
}

export function getManagedStorageKeys() {
  return [...SNAPSHOT_MANAGED_KEYS, ...EXTRA_MANAGED_KEYS];
}

export function collectManagedPayload() {
  const keys = getManagedStorageKeys();
  const payload = {};

  keys.forEach((key) => {
    if (key === LANG_STORAGE_KEY || key === THEME_STORAGE_KEY) {
      payload[key] = localStorage.getItem(key);
      return;
    }

    if (key === STORAGE_KEYS.settings) {
      payload[key] = normalizeSettings(getState(key, DEFAULT_SETTINGS));
      return;
    }
    if (key === STORAGE_KEYS.clock) {
      payload[key] = normalizeClockState(getState(key, DEFAULT_CLOCK_STATE));
      return;
    }
    if (key === STORAGE_KEYS.focusSettings) {
      payload[key] = {
        ...DEFAULT_FOCUS_SETTINGS,
        ...getState(key, DEFAULT_FOCUS_SETTINGS)
      };
      return;
    }
    if (key === STORAGE_KEYS.dataSnapshots) {
      const snapshots = getState(key, []);
      payload[key] = Array.isArray(snapshots) ? snapshots.map(flattenSnapshotHistory) : [];
      return;
    }

    payload[key] = getState(key, null);
  });

  return payload;
}

export function createSnapshot() {
  return normalizeSnapshot({
    id: uid("snapshot"),
    createdAtISO: new Date().toISOString(),
    version: SNAPSHOT_VERSION,
    keys: getManagedStorageKeys(),
    payload: collectManagedPayload()
  });
}

export function listSnapshots() {
  const snapshots = getState(STORAGE_KEYS.dataSnapshots, []);
  if (!Array.isArray(snapshots)) {
    return [];
  }
  return snapshots
    .map(normalizeSnapshot)
    .sort((a, b) => new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime());
}

export function saveSnapshot(snapshot, limit = SNAPSHOT_RETENTION) {
  const normalized = normalizeSnapshot(snapshot);
  const existing = listSnapshots().filter((item) => item.id !== normalized.id);
  const next = [normalized, ...existing].slice(0, limit);
  setState(STORAGE_KEYS.dataSnapshots, next);
  return normalized;
}

export function createAndSaveSnapshot() {
  return saveSnapshot(createSnapshot(), SNAPSHOT_RETENTION);
}

export function parseSnapshotText(text) {
  return normalizeSnapshot(JSON.parse(String(text || "")));
}

export function snapshotToFileContent(snapshot = createSnapshot()) {
  return JSON.stringify(normalizeSnapshot(snapshot), null, 2);
}

export function validateSnapshot(snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  if (normalized.version !== SNAPSHOT_VERSION) {
    return {
      ok: false,
      error: `Snapshot version mismatch: ${normalized.version}`
    };
  }

  return {
    ok: true,
    snapshot: normalized
  };
}

function writeManagedValue(key, value) {
  if (key === LANG_STORAGE_KEY || key === THEME_STORAGE_KEY) {
    if (value === null || value === undefined || value === "") {
      localStorage.removeItem(key);
      emitStateChanged(key, null);
      return;
    }
    localStorage.setItem(key, String(value));
    emitStateChanged(key, String(value));
    return;
  }

  if (value === null || value === undefined) {
    removeState(key);
    return;
  }

  setState(key, value);
}

export function applySnapshot(snapshot) {
  const validation = validateSnapshot(snapshot);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const normalized = validation.snapshot;
  const payload = normalized.payload || {};

  getManagedStorageKeys().forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      writeManagedValue(key, payload[key]);
    } else {
      writeManagedValue(key, null);
    }
  });

  return normalized;
}

export function clearDataGroup(groupId) {
  const keys = DATA_CLEAR_GROUPS[groupId];
  if (!keys) {
    return false;
  }

  keys.forEach((key) => writeManagedValue(key, null));
  return true;
}
