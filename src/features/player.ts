import type { Settings } from "../config";

const VIDEO_SELECTOR = "video";

/** 按预告片时长算目标倍速 */
export function targetRate(duration: number, settings: Settings): number {
  if (!Number.isFinite(duration) || duration <= 0) return 1;
  if (duration >= settings.player.longAfter) return settings.player.longRate;
  if (duration >= settings.player.mediumAfter) return settings.player.mediumRate;
  return 1;
}

/**
 * 预告片增强:
 * - 首次播放时解除静音
 * - 元数据加载后按 duration 设置一次倍速, 之后不再干预 (用户可自行修改)
 *
 * 站点用 fancybox 打开预告片时可能克隆/移动 video 节点, 所以按元素逐个 hook 而不是只认固定父节点。
 */
export function setupPlayer(settings: Settings) {
  const hooked = new WeakSet<HTMLVideoElement>();

  const hook = (video: HTMLVideoElement) => {
    if (hooked.has(video)) return;
    hooked.add(video);

    const applyMute = () => {
      if (!settings.player.unmute) return;
      video.muted = false;
      if (video.volume === 0) video.volume = 1;
      console.info("[JavDB Kit] 预告片已解除静音");
    };

    const applyRate = () => {
      if (!settings.player.autoSpeed) return;
      if (video.dataset.jdkRateApplied === "1") return;
      const rate = targetRate(video.duration, settings);
      video.dataset.jdkRateApplied = "1";
      video.dataset.jdkRate = String(rate);
      video.playbackRate = rate;
      console.info(`[JavDB Kit] 预告片时长 ${Math.round(video.duration)}s, 倍速 ${rate}x`);
    };

    video.addEventListener("play", applyMute, { once: true });
    video.addEventListener("loadedmetadata", applyRate);
    if (video.readyState >= 1) applyRate();
  };

  const scan = () => {
    for (const video of document.querySelectorAll<HTMLVideoElement>(VIDEO_SELECTOR)) hook(video);
  };

  scan();
  // 预告片按需加载, video 节点可能在点击后才出现或被替换
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
}
