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

## 阶段 2：判断记录服务与契约

- `bun test packages/shared/src/journal/service.test.ts`：**16 pass / 0 fail**，76 断言。覆盖旧报告 ID、独立快照、重开/源报告删除、只追加复盘、摘要分页、到期语义、创建/复盘幂等冲突、跨 Repository 实例 20 条并发复盘、输入边界、UTF-8 快照上限、损坏数据保留、失败写入与队列恢复。
- `bun run typecheck`：5 个工作区通过；原有会话测试 fixture 已补齐新的客户端契约。
- `bun run build:electron`：生产 renderer、preload 和 main 构建通过，实际 `.cjs` 已重新生成。
- `node apps/electron/e2e/journal-ipc.mjs`：通过真实四个 journal IPC 留档旧报告 A；重复创建和非法路径输入校验；摘要不携带完整报告；实际关闭重开、删除隔离测试报告后仍可读取快照；重复复盘只保存一次，6 个同时 IPC 请求均保留；原判断保持不变。

新增 journal 使用现有 `JsonFileStore` 和主进程单实例约束，按规范化存储路径串行化完整读改写。同进程约束不代表多进程事务或防篡改审计。桌面 IPC 测试使用明确标注的离线准备报告，不代表在线行情或 LLM 研究成功。
