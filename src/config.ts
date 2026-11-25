import { GM_getValue, GM_setValue } from "vite-plugin-monkey/dist/client";

export interface Settings {
  player: {
    /** 打开预告片时自动解除静音 */
    unmute: boolean;
    /** 根据预告片时长自动设置一次倍速 */
    autoSpeed: boolean;
    /** 时长阈值 (秒) 与对应倍速 */
    mediumAfter: number;
    mediumRate: number;
    longAfter: number;
    longRate: number;
  };
  marker: {
    /** 列表页标记看过的影片 */
    enabled: boolean;
    /** 番号命中但 url 未命中时显示「可能看过」 */
    markMaybe: boolean;
  };
  exporter: {
    /** 翻页抓取间隔 (毫秒) */
    interval: number;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  player: { unmute: true, autoSpeed: true, mediumAfter: 90, mediumRate: 1.5, longAfter: 180, longRate: 2 },
  marker: { enabled: true, markMaybe: true },
  exporter: { interval: 400 },
};

const SETTINGS_KEY = "jdk:settings:v1";

export function loadSettings(): Settings {
  const raw = GM_getValue<Partial<Settings> | null>(SETTINGS_KEY, null);
  if (!raw) return structuredClone(DEFAULT_SETTINGS);
  return {
    player: { ...DEFAULT_SETTINGS.player, ...raw.player },
    marker: { ...DEFAULT_SETTINGS.marker, ...raw.marker },
    exporter: { ...DEFAULT_SETTINGS.exporter, ...raw.exporter },
  };
}

export function saveSettings(next: Settings) {
  GM_setValue(SETTINGS_KEY, next);
}
