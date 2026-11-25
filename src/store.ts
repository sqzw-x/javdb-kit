import { GM_getValue, GM_setValue } from "vite-plugin-monkey/dist/client";

import type { WatchedIndex } from "./types";

const URLS_KEY = "jdk:watched:urls:v1";
const NUMS_KEY = "jdk:watched:numbers:v1";

/** 旧版 JavDB Watched Marker 使用的 localStorage key, 用于一次性迁移 */
const LEGACY_URL_KEY = "javdb-watched-url-set";
const LEGACY_NUM_KEY = "javdb-watched-num-set";

function readList(key: string): string[] {
  const value = GM_getValue<string[] | null>(key, null);
  return Array.isArray(value) ? value : [];
}

export function loadIndex(): WatchedIndex {
  return { urls: new Set(readList(URLS_KEY)), numbers: new Set(readList(NUMS_KEY)) };
}

export function saveIndex(index: WatchedIndex) {
  GM_setValue(URLS_KEY, [...index.urls]);
  GM_setValue(NUMS_KEY, [...index.numbers]);
}

export function indexSize(index: WatchedIndex): number {
  return index.urls.size;
}

/** 首次运行时把旧脚本写在 localStorage 里的数据迁移过来 */
export function migrateLegacyIndex(index: WatchedIndex): number {
  let migrated = 0;
  try {
    const urls = JSON.parse(localStorage.getItem(LEGACY_URL_KEY) ?? "null") as string[] | null;
    const nums = JSON.parse(localStorage.getItem(LEGACY_NUM_KEY) ?? "null") as string[] | null;
    for (const url of urls ?? []) {
      if (!index.urls.has(url)) {
        index.urls.add(url);
        migrated += 1;
      }
    }
    for (const num of nums ?? []) index.numbers.add(num);
  } catch (err) {
    console.warn("[JavDB Kit] 迁移旧数据失败", err);
  }
  if (migrated > 0) saveIndex(index);
  return migrated;
}

/** 合并外部导入的记录 (Exporter JSON 或本插件导出格式) */
export function mergeRecords(index: WatchedIndex, records: unknown): number {
  if (!Array.isArray(records)) return 0;
  let added = 0;
  for (const item of records) {
    if (!item || typeof item !== "object") continue;
    const record = item as { url?: unknown; urlId?: unknown; number?: unknown };
    const urlId = typeof record.urlId === "string" ? record.urlId : typeof record.url === "string" ? record.url : "";
    const number = typeof record.number === "string" ? record.number : "";
    const cleanUrl = urlId.replace(/^.*\/v\//, "").trim();
    if (cleanUrl && !index.urls.has(cleanUrl)) {
      index.urls.add(cleanUrl);
      added += 1;
    }
    if (number && !index.numbers.has(number)) index.numbers.add(number);
  }
  if (added > 0) saveIndex(index);
  return added;
}

export function exportIndex(index: WatchedIndex) {
  return [...index.urls].toSorted().map((urlId) => ({ urlId }));
}

export function clearIndex() {
  GM_setValue(URLS_KEY, []);
  GM_setValue(NUMS_KEY, []);
}
