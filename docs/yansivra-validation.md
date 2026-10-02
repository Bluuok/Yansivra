# Yansivra Windows 验证记录

## 2026-10-02 真实流程续验与时间修复

反重力使用同一会话完成修复后的类型检查、完整单元测试、构建打包与 Windows 包验收：**1739 pass、8 skip、0 fail**，7588 expect calls，189 files。新增加的 3 个回归用例覆盖逐笔成交的毫秒时间、空成交序列与正反排序 K 线的最新时间。桌面 UI 未改，复用当天已再次通过的 4 组桌面流程。

最新 Windows ZIP 为 141,235,580 字节，SHA256：`247DFDE77F4AEF43892B12DC774E406C059D5ADEC6451FA8F4AC3B35E495C525`；主代理已独立计算核对。实际包内标题 Yansivra、本地 Agent completed、中文/空格路径解压验收均通过。反重力的最终日志位于本地忽略目录 `output/yansivra-time-*.log`。

主代理另外在本机隔离资料中使用真实 Longbridge / Massive / DeepSeek Flash，完成 16 项公共研究能力、报告生成与导出、界面记录判断、保存复盘、重启恢复，并核查真实行情时间。完整范围、环境问题与券商账户权限限制见 [在线验收记录](yansivra-live-validation.md)。

## 首次改名包验证（保留记录）

验证日期：2026-10-02。环境为 Windows 11 10.0.26200.0、Bun 1.4.0（34cbb9a40）、Node.js v24.21.0、Electron 39.8.9。

测试通过已登录的 Antigravity CLI 执行，模型为插件默认的 Gemini 3.8 Flash Medium。复测使用同一会话。生产源码与打包配置对应 `c60d2b4`；后续至 `f571f53` 的修改仅涉及测试断言、测试等待逻辑、示例链接与说明文档，因此沿用该版本的构建和打包产物。

| 实际命令 | 结果 |
| --- | --- |
| `bun install --frozen-lockfile` | exit 0；547 packages；锁文件未变 |
| `bun run typecheck` | exit 0；5 个 workspace 通过 |
| `bun run test:unit` | 复测 exit 0；1736 pass、8 skip、0 fail；7581 expect calls、189 files |
| `bun run i18n:check` | exit 0；en-US / zh-CN 各 1589 keys、0 issues |
| `bun run build` | exit 0；renderer、preload、main 与工作区构建通过 |
| `bun run test:desktop` | exit 0；真实 Electron、journal IPC、journal flow、market 四组验证通过 |
| `bun run package:windows` | exit 0；生成 Windows x64 运行目录和 ZIP |
| `bun run test:windows-package` | 复测 exit 0；解压至源码外中文/空格路径并运行包内程序 |

单元测试跳过的 7 项需要真实账户采集的长桥 fixture，另外 1 项需要 Windows 创建符号链接的权限。没有通过降低断言或调整账户权限消除跳过项。

包内验收确认窗口标题为 **Yansivra**，版本为 `0.5.0-beta.1`，13 个 skills、扩展资源路径和金融工具可用；`sandbox=true`、`contextIsolation=true`、`nodeIntegration=false`。通过真实 IPC 轮询确认本地 Agent 状态达到 `completed`，并检查版本与 About 信息。

产物：`dist/electron/Yansivra-0.5.0-beta.1-win-x64.zip`，141,235,198 字节。

SHA256：`9F0C5CA10F9228853181734C13464BF3422EB126736844FF0A5321D14222222C`。主代理独立计算并核对该值。

测试使用独立 profile 与本地 provider。本轮未再次验证 Longbridge / Massive / DeepSeek 在线服务，也未读取真实用户配置。结果证明当前源码的离线逻辑、桌面流程与 Windows 包可运行，不代表券商账户或所有在线集成都通过。

完整命令输出保存在本地忽略目录 `output/yansivra-*.log` 与 `output/yansivra-retest-*.log`。测试结束时工作区干净，未修改锁文件或生产源码。
