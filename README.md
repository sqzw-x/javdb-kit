# JavDB Kit

> JavDB 增强插件: 观影标记 / 列表导出 / 预告片增强

## 功能

- **观影标记**: 列表页按本地索引给卡片打「看过」/「可能看过」标记, 与站点自带样式一致
- **列表导出**: 列表页工具栏里一键导出 JSON / CSV, 自动顺着分页抓完全部页面
- **预告片**: 自动解除静音; 按时长设置一次倍速 (≤90s 1×, 90–180s 1.5×, >180s 2×), 之后不干预用户手动调整
- **索引同步**: 逐页读取站点的「看过」列表补齐本地索引, 只读不改数据

## 入口

- 油猴菜单: `JavDB Kit: 打开面板` / `标记当前影片为看过(本地)`
- 顶栏用户菜单: 与「跟随系统 / 简体中文 / 用户」并排的 `JavDB Kit`
- 列表页工具栏: `导出 JSON` / `CSV` / `JavDB Kit`

## 开发

```bash
pnpm install
pnpm dev
pnpm build      # 构建 dist/javdb-kit.user.js
pnpm typecheck
pnpm check      # oxlint + oxfmt
```

## 目录

```
src/
  config.ts         设置项 (GM 存储)
  store.ts          本地看过索引 + 旧数据迁移
  site.ts           站点选择器与卡片解析
  net.ts            限速 / 重试的 GM 请求封装
  features/
    player.ts       预告片静音与倍速
    marker.ts       列表页徽标
    exporter.ts     列表抓取与导出
  ui/               面板 / 顶栏入口 / 工具栏按钮
```
