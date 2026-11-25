/** 轻量的站点风格提示, 不引入额外 UI 库 */
export function toast(message: string, kind: "info" | "success" | "danger" = "info") {
  const el = document.createElement("div");
  el.className = `jdk-toast notification is-light is-${kind}`;
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.classList.add("jdk-toast--leaving"), 2200);
  setTimeout(() => el.remove(), 2600);
}
