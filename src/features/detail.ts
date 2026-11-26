import { GM_registerMenuCommand } from "vite-plugin-monkey/dist/client";

import { loadSettings } from "@/config";
import { markList } from "@/features/marker";
import { setupPlayer } from "@/features/player";
import { currentVideoId, pageKind } from "@/site";
import { loadIndex, markCurrentVideo, saveIndex } from "@/store";
import { installListActions, installNavEntry } from "@/ui/entries";
import { toast } from "@/ui/toast";

/**
 * 详情页「看过」状态同步。
 * 站点在收藏成功后会改写 .review-buttons 区域, 这里监听变化把影片写进本地索引。
 */
function watchDetailState(index: ReturnType<typeof loadIndex>) {
  const videoId = currentVideoId();
  if (!videoId) return;

  const applyIfWatched = () => {
    const marked = document.querySelector(".review-title .tag.is-success");
    if (!marked) return;
    if (index.urls.has(videoId)) return;
    index.urls.add(videoId);
    saveIndex(index);
    console.info(`[JavDB Kit] 已加入本地看过索引: ${videoId}`);
    toast("已加入本地看过索引", "success");
  };

  applyIfWatched();

  const target = document.querySelector(".review-buttons") ?? document.body;
  const observer = new MutationObserver(() => applyIfWatched());
  observer.observe(target, { childList: true, subtree: true });
}

export function setupDetailPage() {
  const index = loadIndex();
  watchDetailState(index);

  GM_registerMenuCommand("JavDB Kit: 标记当前影片为看过(本地)", () => {
    const id = currentVideoId();
    if (!id) {
      toast("当前页面不是影片详情页", "danger");
      return;
    }
    const result = markCurrentVideo(id);
    toast(result.added ? "已加入本地看过索引" : "该影片已在索引中", result.added ? "success" : "info");
  });
}

export function bootCommon() {
  const settings = loadSettings();
  const index = loadIndex();
  if (settings.marker.enabled) markList(index, settings);
  if (pageKind() === "video") setupPlayer(settings);
  installNavEntry();
  installListActions();
}
