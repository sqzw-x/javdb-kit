import { crawlList, download, timestamp, toCsv, toJson } from "../features/exporter";
import { pageKind } from "../site";
import { openPanel } from "./mount";
import { toast } from "./toast";

const NAV_ID = "jdk-nav-entry";
const TOOLBAR_FLAG = "jdkToolbar";

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

/** 列表页工具栏里的导入/导出按钮, 沿用站点的 button-group 结构 */
export function installToolbar() {
  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  if (!toolbar || toolbar.dataset[TOOLBAR_FLAG] === "1") return;
  toolbar.dataset[TOOLBAR_FLAG] = "1";

  const group = document.createElement("div");
  group.className = "button-group";

  const buttons = document.createElement("div");
  buttons.className = "buttons has-addons";

  const makeButton = (label: string, onClick: () => void, extraClass = "") => {
    const button = document.createElement("button");
    button.className = `button is-small ${extraClass}`.trim();
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    buttons.append(button);
  };

  makeButton("导出 JSON", () => void exportCurrentList("json"));
  makeButton("CSV", () => void exportCurrentList("csv"));
  makeButton("JavDB Kit", openPanel, "is-light");

  group.append(buttons);
  toolbar.append(group);
}
