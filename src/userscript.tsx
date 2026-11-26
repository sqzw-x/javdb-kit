/*
  JavDB Kit — 观影标记 / 列表导出 / 预告片增强
*/
import { GM_registerMenuCommand } from "vite-plugin-monkey/dist/client";

import { setupDetailPage, bootCommon } from "@/features/detail";
import { pageKind } from "@/site";
import { openPanel } from "@/ui/mount";

import "@/styles.css";

function boot() {
  bootCommon();
  if (pageKind() === "video") setupDetailPage();

  GM_registerMenuCommand("JavDB Kit: 打开面板", openPanel);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
