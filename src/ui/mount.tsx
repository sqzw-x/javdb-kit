import { createRoot } from "react-dom/client";

import { App } from "./App";

let rootMounted = false;
let openRef: (() => void) | null = null;

const registerOpen = (fn: () => void) => {
  openRef = fn;
};

/** 首次调用才把 React 面板挂进页面, 之后只做打开动作 */
export function openPanel() {
  if (!rootMounted) {
    rootMounted = true;
    const host = document.createElement("div");
    host.id = "jdk-root";
    document.body.append(host);
    createRoot(host).render(<App defaultOpen registerOpen={registerOpen} />);
    return;
  }
  openRef?.();
}
