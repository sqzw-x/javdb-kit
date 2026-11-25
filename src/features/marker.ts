import type { Settings } from "../config";
import { CARD_SELECTOR, pageKind, parseCard } from "../site";
import type { WatchedIndex } from "../types";

function markItem(item: Element, index: WatchedIndex, settings: Settings) {
  if (item.querySelector(".review")) return;
  const card = parseCard(item);
  if (!card) return;

  const watched = index.urls.has(card.urlId);
  const maybe = !watched && settings.marker.markMaybe && index.numbers.has(card.number);
  if (!watched && !maybe) return;

  const badge = document.createElement("span");
  badge.className = maybe ? "review jdk-maybe" : "review";
  badge.textContent = maybe ? "可能看过" : "看过";
  (item.querySelector(".cover") ?? item).append(badge);
}

/** 给列表页卡片打上本地索引里的看过标记 (「看过」列表本身不需要重复标记) */
export function markList(index: WatchedIndex, settings: Settings) {
  if (!settings.marker.enabled || pageKind() === "watched") return;

  const markAll = () => {
    for (const item of document.querySelectorAll(CARD_SELECTOR)) markItem(item, index, settings);
  };

  markAll();
  // 部分列表是分页加载 / 动态插入的
  const observer = new MutationObserver(markAll);
  observer.observe(document.body, { childList: true, subtree: true });
}
