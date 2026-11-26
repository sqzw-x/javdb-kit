import { loadIndex, saveIndex } from "@/store";

import { batchMarkWatched } from "../features/batchMark";
import { crawlList, download, timestamp, toCsv, toJson } from "../features/exporter";
import { pageKind, parseCards } from "../site";
import { openPanel } from "./mount";
import { toast } from "./toast";

const NAV_ID = "jdk-nav-entry";
const ACTIONS_FLAG = "jdkActions";

/** 顶栏用户菜单里的入口, 与「跟随系统 / 简体中文 / 用户」并排 */
export function installNavEntry() {
  const end = document.querySelector<HTMLElement>("#navbar-menu-user .navbar-end");
  if (!end || document.getElementById(NAV_ID)) return;

  const link = document.createElement("a");
  link.id = NAV_ID;
  link.className = "navbar-item";
  link.href = "#";
  link.textContent = "JavDB Kit";
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openPanel();
  });
  end.prepend(link);
}

async function exportCurrentList(format: "json" | "csv") {
  toast("开始抓取列表…");
  try {
    const result = await crawlList(location.href, {
      interval: 400,
      onProgress: ({ page, cards }) => toast(`第 ${page} 页 / ${cards} 条`, "info"),
    });
    const content = format === "json" ? toJson(result.cards) : toCsv(result.cards);
    download(
      `javdb-${pageKind()}-${timestamp()}.${format}`,
      content,
      format === "json" ? "application/json" : "text/csv",
    );
    toast(`已导出 ${result.cards.length} 条`, "success");
  } catch (err) {
    toast(`导出失败: ${(err as Error).message}`, "danger");
  }
}

function buildButtons(containerClass = "buttons are-small"): HTMLDivElement {
  const buttons = document.createElement("div");
  buttons.className = containerClass;
  buttons.dataset[ACTIONS_FLAG] = "1";

  const make = (label: string, onClick: () => void) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button is-small";
    button.textContent = label;
    button.addEventListener("click", onClick);
    buttons.append(button);
  };

  make("导出 JSON", () => void exportCurrentList("json"));
  make("CSV", () => void exportCurrentList("csv"));
  // 「看过」列表本身不需要批量标记
  if (pageKind() !== "watched") {
    make("标记为看过", () => void markListAsWatched(buttons));
  }
  return buttons;
}

/**
 * 列表页的导出按钮, 位置优先级:
 * 1. 站点 .toolbar 末尾 (普通列表页, 首页 / 演员 / 搜索 / 看过 ...)
 * 2. 「批量管理」按钮后面 (清单详情页等没有 toolbar 的列表)
 * 3. 面包屑 (最终兜底)
 */
export function installListActions() {
  if (!document.querySelector(".item") || document.querySelector("[data-jdk-actions]")) return;

  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  if (toolbar) {
    const group = document.createElement("div");
    group.className = "button-group";
    group.append(buildButtons());
    toolbar.append(group);
    return;
  }

  const batchManage = document.querySelector<HTMLElement>('[data-batch-select-target="manage"]');
  if (batchManage) {
    batchManage.insertAdjacentElement("afterend", buildButtons("jdk-inline-actions"));
    return;
  }

  const breadcrumb = document.querySelector<HTMLElement>(".breadcrumb ul");
  if (breadcrumb) {
    const item = document.createElement("li");
    item.append(buildButtons("jdk-inline-actions"));
    breadcrumb.append(item);
  }
}
/** 把当前列表页的所有影片标记为看过, 并同步写入本地索引 */
async function markListAsWatched(container: HTMLElement) {
  const cards = parseCards(document);
  if (cards.length === 0) {
    toast("当前页面没有可标记的影片", "danger");
    return;
  }
  if (!window.confirm(`把当前页的 ${cards.length} 部影片标记为看过?`)) return;

  const buttons = [...container.querySelectorAll("button")];
  for (const button of buttons) button.disabled = true;

  const index = loadIndex();
  try {
    const result = await batchMarkWatched(
      cards.map((card) => card.urlId),
      { interval: 600, onProgress: (done, total) => toast(`标记中 ${done}/${total}`, "info") },
    );
    for (const card of cards) index.urls.add(card.urlId);
    saveIndex(index);
    toast(
      result.failed.length === 0 ? `已标记 ${result.ok} 部` : `已标记 ${result.ok} 部, ${result.failed.length} 部失败`,
      result.failed.length === 0 ? "success" : "danger",
    );
  } catch (err) {
    toast(`批量标记失败: ${(err as Error).message}`, "danger");
  } finally {
    for (const button of buttons) button.disabled = false;
  }
}
