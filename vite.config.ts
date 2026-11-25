import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import vitePluginMonkey from "vite-plugin-monkey";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  build: {
    minify: true,
  },
  plugins: [
    react(),
    vitePluginMonkey({
      entry: "src/userscript.tsx",
      userscript: {
        name: "JavDB Kit",
        namespace: "https://github.com/sqzw-x",
        description: "JavDB 增强插件: 观影标记 / 列表导出 / 预告片增强",
        match: ["https://javdb.com/*", "https://*.javdb.com/*"],
        "run-at": "document-idle",
      },
      build: {
        externalGlobals: {},
      },
      server: {},
    }),
  ],
});
