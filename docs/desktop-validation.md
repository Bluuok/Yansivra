# Folio Desk 验证记录

环境：Windows 10.0.26200，Bun 1.4.0，Node 24.21.0，Electron 39.8.9。所有桌面测试使用独立临时 profile、隐藏窗口和本地 provider，不读取用户现有账户资料。

## 基线 `2e5dba5`

由 AGY 反重力执行，主代理核对日志：

| 命令 | 结果 |
| --- | --- |
| `bun run typecheck` | 5 个工作区通过 |
| `bun run build` | UI、renderer、preload、main 构建通过 |
| `bun run test:unit` | 1678 pass / 8 skip / 0 fail；182 文件 |
| `bun run eval:smoke` | 15/15 pass；fixture 模式 |
| `electron-builder --win --x64 --dir` | 失败：签名工具包内 macOS 软链接解压需要宿主权限 |

原有 E2E 脚本硬编码 macOS 路径与 Unix 命令，未作为 Windows 通过依据。8 个跳过用例来自原有平台保护和后续阶段预置用例。

## 阶段 1：视觉底座与导航

AGY 首轮发现旧文案断言和初始面板可见性问题；主代理已同步预期文案并显式隐藏面板内容，组件继续挂载以保留草稿。

- `bun run typecheck`：5 个工作区通过。
- `bun test --isolate packages/ui/src/atoms/workspaceAtoms.test.ts packages/ui/src/components/today/TodayView.test.tsx packages/ui/src/atoms/commandPaletteAtoms.test.ts packages/i18n`：修复后 **51 pass / 0 fail**，7 文件。
- `bun run build:electron`：生产 renderer、实际 preload `.cjs` 和 main `.js` 通过。
- `node apps/electron/e2e/desktop-smoke.mjs`：真实 Electron IPC 与 13 项技能加载、四个主入口、总览默认进入、助手默认收起、布局切换后草稿保留；1366×768、1920×1080 及 Electron 125%/150% zoom 无页面横向溢出，隐藏窗口截图成功。

缩放通过项是 Electron zoom 模拟的内容缩放，不等同于逐个验证 Windows 系统显示设置与多显示器 DPI 切换。真实行情/LLM、Pi 外部运行时和 Windows 打包运行将在各自完成验证时另行记录。
