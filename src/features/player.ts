import type { Settings } from "../config";

const BOX_SELECTOR = "#preview-video-box";
const VIDEO_SELECTOR = "#preview-video-box > video";

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
    };

    const applyRate = () => {
      if (!settings.player.autoSpeed) return;
      if (video.dataset.jdkRateApplied === "1") return;
      video.dataset.jdkRateApplied = "1";
      video.playbackRate = targetRate(video.duration, settings);
    };

    video.addEventListener("play", applyMute, { once: true });
    video.addEventListener("loadedmetadata", applyRate);
    // HAVE_METADATA === 1, 有些环境没有 HTMLMediaElement 常量
    if (video.readyState >= 1) applyRate();
  };

  const scan = () => {
    const video = document.querySelector<HTMLVideoElement>(VIDEO_SELECTOR);
    if (video) hook(video);
  };

  scan();
  // 预告片按需加载, 元素可能在点击后才出现或被替换, 只观察 DOM 结构变化
  const observer = new MutationObserver(() => {
    if (document.querySelector(BOX_SELECTOR)) scan();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
