import { getHtml, parseHtml } from "../net";
import { paginationNext, parseCards } from "../site";
import type { VideoCard, WatchedIndex } from "../types";

export interface CrawlOptions {
  interval: number;
  onProgress?: (info: { page: number; cards: number }) => void;
  shouldStop?: () => boolean;
  /** 每解析完一页回调一次, 便于边翻页边处理 */
  onPage?: (cards: VideoCard[], page: number) => void | Promise<void>;
}

export interface CrawlResult {
  cards: VideoCard[];
  pages: number;
  stopped: boolean;
}

function absolute(href: string): string {
  return new URL(href, location.origin).href;
}

/** 从当前页开始, 顺着 .pagination-next 抓取全部列表页 */
export async function crawlList(startUrl: string, options: CrawlOptions): Promise<CrawlResult> {
  const cards: VideoCard[] = [];
  let url: string | null = startUrl;
  let page = 0;
  let stopped = false;

  while (url) {
    page += 1;
    const isCurrent = url === location.href;
    const doc = isCurrent ? document : parseHtml(await getHtml(url, { interval: options.interval }));
    const pageCards = parseCards(doc);
    cards.push(...pageCards);
    options.onProgress?.({ page, cards: cards.length });
    await options.onPage?.(pageCards, page);

    if (options.shouldStop?.()) {
      stopped = true;
      break;
    }

    const next = paginationNext(doc);
    url = next ? absolute(next) : null;
  }

  return { cards, pages: page, stopped };
}

export function toJson(cards: VideoCard[]): string {
  return JSON.stringify(
    cards.map((card) => ({
      number: card.number,
      hasMagnet: card.hasMagnet,
      title: card.title,
      score: card.score,
      scoreNumber: card.scoreCount,
      premiered: card.premiered,
      url: card.urlId,
      playable: card.playable,
    })),
    null,
    2,
  );
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(cards: VideoCard[]): string {
  const header = ["number", "title", "score", "scoreNumber", "premiered", "url", "hasMagnet", "playable"];
  const rows = cards.map((card) =>
    [card.number, card.title, card.score, card.scoreCount, card.premiered, card.urlId, card.hasMagnet, card.playable]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function download(fileName: string, content: string, mime = "application/json") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

/** 抓取站点「看过」列表, 补齐本地索引 */
export async function syncWatched(
  index: WatchedIndex,
  options: CrawlOptions,
): Promise<{ pages: number; added: number; stopped: boolean }> {
  const start = "https://javdb.com/users/watched_videos";
  const { cards, pages, stopped } = await crawlList(start, options);
  let added = 0;
  for (const card of cards) {
    if (!index.urls.has(card.urlId)) {
      index.urls.add(card.urlId);
      added += 1;
    }
    index.numbers.add(card.number);
  }
  return { pages, added, stopped };
}
