import { crawlList, download, timestamp, toCsv, toJson } from "../features/exporter";
import { pageKind } from "../site";
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

function buildButtons(): HTMLDivElement {
  const buttons = document.createElement("div");
  buttons.className = "buttons are-small";
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
  return buttons;
}

/**
 * 列表页的导出按钮:
 * - 普通列表页放进站点的 .toolbar
 * - 清单详情页 (/users/list_detail) 没有 toolbar, 放进面包屑
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

  const breadcrumb = document.querySelector<HTMLElement>(".breadcrumb ul");
  if (breadcrumb) {
    const item = document.createElement("li");
    item.append(buildButtons());
    breadcrumb.append(item);
  }
}
