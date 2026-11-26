import { GM_getValue, GM_setValue } from "vite-plugin-monkey/dist/client";

import type { WatchedIndex, WatchedRecord } from "./types";

const RECORDS_KEY = "jdk:watched:records:v2";

/** v1 的两个平行数组, 只在新格式为空时读取一次做迁移 */
const V1_URLS_KEY = "jdk:watched:urls:v1";
const V1_NUMBERS_KEY = "jdk:watched:numbers:v1";

/** 旧版 JavDB Watched Marker 使用的 localStorage key, 用于一次性迁移 */
const LEGACY_URL_KEY = "javdb-watched-url-set";
const LEGACY_NUM_KEY = "javdb-watched-num-set";

function cleanUrlId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/^.*\/v\//, "").trim();
}

function cleanNumber(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function emptyIndex(): WatchedIndex {
  return { records: [], urls: new Set(), numbers: new Set() };
}

/** 把一条记录并入索引: 有 urlId 时按 urlId 合并并补齐番号, 只有番号时按番号去重 */
export function addRecordToIndex(index: WatchedIndex, input: { urlId?: string; number?: string }): { added: boolean } {
  const urlId = cleanUrlId(input.urlId);
  const number = cleanNumber(input.number);
  if (!urlId && !number) return { added: false };

  if (urlId) {
    index.urls.add(urlId);
    if (number) index.numbers.add(number);
    const existing = index.records.find((record) => record.urlId === urlId);
    if (existing) {
      if (number && !existing.number) {
        existing.number = number;
        return { added: true };
      }
      return { added: false };
    }
    index.records.push(number ? { urlId, number } : { urlId });
    return { added: true };
  }

  if (index.numbers.has(number)) return { added: false };
  index.numbers.add(number);
  const orphan = index.records.find((record) => !record.urlId && record.number === number);
  if (orphan) return { added: false };
  index.records.push({ number });
  return { added: true };
}

function readRecordList(): WatchedRecord[] {
  const stored = GM_getValue<{ records?: unknown } | null>(RECORDS_KEY, null);
  const rows = Array.isArray(stored?.records) ? stored.records : [];
  const records: WatchedRecord[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as { urlId?: unknown; number?: unknown };
    const urlId = cleanUrlId(record.urlId);
    const number = cleanNumber(record.number);
    if (!urlId && !number) continue;
    records.push({ ...(urlId ? { urlId } : {}), ...(number ? { number } : {}) });
  }
  return records;
}

/** v1 的两个数组分别是 url 和番号, 迁移时无法配对, 各自成为单字段记录 */
function migrateFromV1(index: WatchedIndex): number {
  const urls = GM_getValue<string[] | null>(V1_URLS_KEY, null);
  const numbers = GM_getValue<string[] | null>(V1_NUMBERS_KEY, null);
  let added = 0;
  for (const url of Array.isArray(urls) ? urls : []) {
    if (addRecordToIndex(index, { urlId: url }).added) added += 1;
  }
  for (const number of Array.isArray(numbers) ? numbers : []) {
    if (addRecordToIndex(index, { number }).added) added += 1;
  }
  return added;
}

export function loadIndex(): WatchedIndex {
  const index = emptyIndex();
  const records = readRecordList();
  if (records.length > 0) {
    for (const record of records) addRecordToIndex(index, record);
    return index;
  }
  if (migrateFromV1(index) > 0) saveIndex(index);
  return index;
}

export function saveIndex(index: WatchedIndex) {
  GM_setValue(RECORDS_KEY, { version: 2, records: index.records });
}

export function indexSize(index: WatchedIndex): number {
  return index.records.length;
}

/**
 * 索引的记录构成, 三个分类互斥, 相加等于总数。
 * - urlOnly: 只有 urlId
 * - numberOnly: 只有番号
 * - both: 两者都有
 */
export function indexBreakdown(index: WatchedIndex): {
  total: number;
  urlOnly: number;
  numberOnly: number;
  both: number;
} {
  let urlOnly = 0;
  let numberOnly = 0;
  let both = 0;
  for (const record of index.records) {
    if (record.urlId && record.number) both += 1;
    else if (record.urlId) urlOnly += 1;
    else numberOnly += 1;
  }
  return { total: index.records.length, urlOnly, numberOnly, both };
}

/** 首次运行时把旧脚本写在 localStorage 里的数据迁移过来 */
export function migrateLegacyIndex(index: WatchedIndex): number {
  let migrated = 0;
  try {
    const urls = JSON.parse(localStorage.getItem(LEGACY_URL_KEY) ?? "null") as string[] | null;
    const nums = JSON.parse(localStorage.getItem(LEGACY_NUM_KEY) ?? "null") as string[] | null;
    for (const url of urls ?? []) if (addRecordToIndex(index, { urlId: url }).added) migrated += 1;
    for (const num of nums ?? []) if (addRecordToIndex(index, { number: num }).added) migrated += 1;
  } catch (err) {
    console.warn("[JavDB Kit] 迁移旧数据失败", err);
  }
  if (migrated > 0) saveIndex(index);
  return migrated;
}

/** 合并外部导入的记录 (Exporter JSON 里同时有 url 与 number, 可直接组成完整记录) */
export function mergeRecords(index: WatchedIndex, records: unknown): number {
  if (!Array.isArray(records)) return 0;
  let added = 0;
  for (const item of records) {
    if (!item || typeof item !== "object") continue;
    const record = item as { url?: unknown; urlId?: unknown; number?: unknown };
    const urlId = typeof record.urlId === "string" ? record.urlId : typeof record.url === "string" ? record.url : "";
    const number = typeof record.number === "string" ? record.number : "";
    if (addRecordToIndex(index, { urlId, number }).added) added += 1;
  }
  if (added > 0) saveIndex(index);
  return added;
}

/**
 * 手动加入一条记录。
 * 输入可以是详情页 URL、/v/{id}、纯 id, 或番号 (ABC-123)。
 */
export function addRecord(
  index: WatchedIndex,
  rawInput: string,
): { added: boolean; kind: "url" | "number" | "none"; value: string } {
  const input = rawInput.trim();
  if (!input) return { added: false, kind: "none", value: "" };

  const fromUrl = input.match(/\/v\/([^/?#\s]+)/)?.[1];
  const bareId = fromUrl ?? (/^[A-Za-z0-9]{4,10}$/.test(input) ? input : null);
  if (bareId) {
    const { added } = addRecordToIndex(index, { urlId: bareId });
    saveIndex(index);
    return { added, kind: "url", value: bareId };
  }

  const number = input.toUpperCase();
  const { added } = addRecordToIndex(index, { number });
  saveIndex(index);
  return { added, kind: "number", value: number };
}

/** 详情页「看过」成功后调用, 把当前影片写进本地索引 */
export function markCurrentVideo(urlId: string, number = "") {
  const index = loadIndex();
  const { added } = addRecordToIndex(index, { urlId, number });
  saveIndex(index);
  return { added, total: index.records.length };
}

export function exportIndex(index: WatchedIndex) {
  return index.records
    .map((record) => ({
      ...(record.urlId ? { urlId: record.urlId } : {}),
      ...(record.number ? { number: record.number } : {}),
    }))
    .toSorted((a, b) => (a.urlId ?? a.number ?? "").localeCompare(b.urlId ?? b.number ?? ""));
}

export function clearIndex() {
  GM_setValue(RECORDS_KEY, { version: 2, records: [] });
  GM_setValue(V1_URLS_KEY, []);
  GM_setValue(V1_NUMBERS_KEY, []);
}
