/*
  JavDB Kit — 观影标记 / 列表导出 / 预告片增强
*/
import { GM_registerMenuCommand } from "vite-plugin-monkey/dist/client";

import { loadSettings } from "@/config";
import { markList } from "@/features/marker";
import { setupPlayer } from "@/features/player";
import { pageKind, currentVideoId } from "@/site";
import { loadIndex, saveIndex } from "@/store";
import { installListActions, installNavEntry } from "@/ui/entries";
import { openPanel } from "@/ui/mount";
import { toast } from "@/ui/toast";

import "@/styles.css";

function boot() {
  const settings = loadSettings();
  const index = loadIndex();

  if (settings.marker.enabled) markList(index, settings);
  if (pageKind() === "video") setupPlayer(settings);

  installNavEntry();
  installListActions();

  GM_registerMenuCommand("JavDB Kit: 打开面板", openPanel);
  GM_registerMenuCommand("JavDB Kit: 标记当前影片为看过(本地)", () => {
    const id = currentVideoId();
    if (!id) {
      toast("当前页面不是影片详情页", "danger");
      return;
    }
    index.urls.add(id);
    saveIndex(index);
    toast("已加入本地看过索引", "success");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
