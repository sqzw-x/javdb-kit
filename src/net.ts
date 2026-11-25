import { GM_xmlhttpRequest } from "vite-plugin-monkey/dist/client";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

let queue: Promise<unknown> = Promise.resolve();

export interface GetOptions {
  /** 请求间隔, 默认 400ms */
  interval?: number;
  /** 失败重试次数 */
  retries?: number;
}

function requestOnce(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      headers: { Accept: "text/html,application/xhtml+xml" },
      timeout: 20_000,
      onload: (res) => {
        if (res.status >= 200 && res.status < 300) {
          resolve(res.responseText);
          return;
        }
        reject(new Error(`HTTP ${res.status} ${url}`));
      },
      onerror: () => reject(new Error(`网络错误 ${url}`)),
      ontimeout: () => reject(new Error(`请求超时 ${url}`)),
    });
  });
}

/** 串行 + 限速抓取页面 HTML, 避免把站点打爆 */
export function getHtml(url: string, options: GetOptions = {}): Promise<string> {
  const interval = options.interval ?? 400;
  const retries = options.retries ?? 2;

  const task = async () => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const html = await requestOnce(url);
        await delay(interval);
        return html;
      } catch (err) {
        lastError = err;
        await delay(interval * (attempt + 1));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  };

  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

export function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}
