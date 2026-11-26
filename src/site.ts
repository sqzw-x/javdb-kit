import type { PageKind, VideoCard } from "./types";

/** 列表页的卡片容器: 首页 / 排行榜 / 演员页 / 看过 / 想看 / 清单都用 .item */
export const CARD_SELECTOR = ".item";

export function pageKind(path = location.pathname): PageKind {
  if (/^\/v\/[^/?#]+/.test(path)) return "video";
  if (path.startsWith("/users/watched_videos")) return "watched";
  if (path.startsWith("/users/want_watch_videos")) return "want";
  if (path.startsWith("/users/list_detail")) return "list-detail";
  if (path.startsWith("/lists")) return "list";
  return "other";
}

export function currentVideoId(path = location.pathname): string | null {
  return path.match(/^\/v\/([^/?#]+)/)?.[1] ?? null;
}

/** 详情页标题里的番号, 例如 <h2 class="title is-4"><strong>PGD-298</strong>... */
export function currentVideoNumber(root: ParentNode = document): string {
  const strong = root.querySelector<HTMLElement>("h2.title strong, .video-title strong");
  return strong?.textContent?.trim() ?? "";
}

export function paginationNext(root: ParentNode = document): string | null {
  return root.querySelector<HTMLAnchorElement>("a.pagination-next")?.getAttribute("href") ?? null;
}

function parseNumber(value: string | undefined | null): number | null {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function parseCard(el: Element): VideoCard | null {
  const anchor = el.querySelector<HTMLAnchorElement>('a[href^="/v/"]');
  const href = anchor?.getAttribute("href") ?? "";
  const urlId = el.id.startsWith("video-") ? el.id.slice("video-".length) : (href.match(/^\/v\/([^/?#]+)/)?.[1] ?? "");
  if (!urlId) return null;

  const titleEl = el.querySelector(".video-title");
  const number = titleEl?.querySelector("strong")?.textContent?.trim() ?? "";
  const fullTitle = titleEl?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const title = number && fullTitle.startsWith(number) ? fullTitle.slice(number.length).trim() : fullTitle;

  const value = el.querySelector(".value")?.textContent?.trim() ?? "";
  const score = parseNumber(value.match(/([0-9]+(?:\.[0-9]+)?)\s*分/)?.[1]);
  const scoreCount = parseNumber(value.match(/([0-9]+)\s*人/)?.[1]);

  return {
    urlId,
    number,
    title,
    score,
    scoreCount,
    premiered: el.querySelector(".meta")?.textContent?.trim() ?? "",
    hasMagnet: Boolean(el.querySelector("span.tag")),
    playable: Boolean(el.querySelector(".tag-can-play")),
    href: href || `/v/${urlId}`,
  };
}

export function parseCards(root: ParentNode = document): VideoCard[] {
  return [...root.querySelectorAll(CARD_SELECTOR)].map(parseCard).filter((card): card is VideoCard => card !== null);
}

export function findToolbar(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(".toolbar");
}
