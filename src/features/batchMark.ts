import { GM_xmlhttpRequest } from "vite-plugin-monkey/dist/client";

import { delay } from "../net";

export interface BatchResult {
  ok: number;
  failed: { urlId: string; reason: string }[];
  stopped: boolean;
}

function currentToken(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "";
}

/** 提交单条「看过」。返回 true 表示成功或被接受。 */
function submitWatched(urlId: string, token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      "video_review[status]": "watched",
      authenticity_token: token,
    }).toString();

    GM_xmlhttpRequest({
      method: "POST",
      url: `${location.origin}/v/${urlId}/reviews`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRF-Token": token,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "text/javascript, application/javascript, */*",
      },
      data: body,
      timeout: 20_000,
      onload: (res) => {
        if (res.status >= 200 && res.status < 400) resolve();
        else reject(new Error(`HTTP ${res.status}`));
      },
      onerror: () => reject(new Error("网络错误")),
      ontimeout: () => reject(new Error("请求超时")),
    });
  });
}

/**
 * 批量标记为看过。
 * 逐条串行提交, 落后于页面自身频率, 失败不中断, 结束后汇总。
 */
export async function batchMarkWatched(
  urlIds: string[],
  options: { interval?: number; onProgress?: (done: number, total: number) => void; shouldStop?: () => boolean } = {},
): Promise<BatchResult> {
  const interval = options.interval ?? 600;
  const token = currentToken();
  const result: BatchResult = { ok: 0, failed: [], stopped: false };

  if (!token) {
    throw new Error("未找到 CSRF token, 请确认已登录并刷新页面");
  }

  for (const [index, urlId] of urlIds.entries()) {
    if (options.shouldStop?.()) {
      result.stopped = true;
      break;
    }
    try {
      await submitWatched(urlId, token);
      result.ok += 1;
    } catch (err) {
      result.failed.push({ urlId, reason: (err as Error).message });
    }
    options.onProgress?.(index + 1, urlIds.length);
    await delay(interval);
  }

  return result;
}
