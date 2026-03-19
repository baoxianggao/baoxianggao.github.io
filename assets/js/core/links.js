import { STORAGE_KEYS, getState, normalizeTags, setState, toISO, uid } from "./store.js";

function normalizeUrl(url) {
  const value = String(url || "").trim();
  if (!value) {
    return "";
  }
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(value)) {
    return value;
  }
  return `https://${value}`;
}

function normalizeLink(link) {
  const incoming = typeof link === "object" && link ? link : {};
  const nowISO = new Date().toISOString();
  return {
    id: String(incoming.id || uid("link")),
    title: String(incoming.title || "Untitled Link").trim() || "Untitled Link",
    url: normalizeUrl(incoming.url),
    category: String(incoming.category || "general").trim() || "general",
    tags: normalizeTags(incoming.tags, 12),
    description: String(incoming.description || "").trim(),
    pinned: Boolean(incoming.pinned),
    showOnHome: Boolean(incoming.showOnHome),
    showInLauncher: incoming.showInLauncher !== false,
    createdAtISO: toISO(incoming.createdAtISO || nowISO),
    updatedAtISO: toISO(incoming.updatedAtISO || nowISO)
  };
}

function readLinks() {
  const links = getState(STORAGE_KEYS.links, []);
  if (!Array.isArray(links)) {
    return [];
  }
  return links.map(normalizeLink);
}

function persistLinks(links) {
  setState(
    STORAGE_KEYS.links,
    links.map(normalizeLink)
  );
}

export function listLinks(filter = {}) {
  const search = String(filter.search || "").trim().toLowerCase();
  const category = String(filter.category || "").trim().toLowerCase();

  return readLinks()
    .filter((link) => (filter.showOnHomeOnly ? link.showOnHome : true))
    .filter((link) => (filter.showInLauncherOnly ? link.showInLauncher : true))
    .filter((link) => (filter.pinnedOnly ? link.pinned : true))
    .filter((link) => (category ? link.category.toLowerCase() === category : true))
    .filter((link) => {
      if (!search) {
        return true;
      }
      return `${link.title} ${link.url} ${link.category} ${link.description} ${link.tags.join(" ")}`
        .toLowerCase()
        .includes(search);
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.updatedAtISO).getTime() - new Date(a.updatedAtISO).getTime();
    });
}

export function getLinkById(id) {
  return readLinks().find((link) => link.id === id) || null;
}

export function upsertLink(link) {
  const next = normalizeLink(link);
  const links = readLinks();
  const index = links.findIndex((item) => item.id === next.id);
  const withUpdateTime = {
    ...next,
    updatedAtISO: new Date().toISOString()
  };

  if (index >= 0) {
    links[index] = {
      ...links[index],
      ...withUpdateTime,
      createdAtISO: links[index].createdAtISO
    };
  } else {
    links.unshift(withUpdateTime);
  }

  persistLinks(links);
  return withUpdateTime;
}

export function removeLink(id) {
  persistLinks(readLinks().filter((link) => link.id !== id));
}

export function buildQuickLinkMarkdown(link) {
  const item = normalizeLink(link);
  return `[${item.title}](${item.url})`;
}
