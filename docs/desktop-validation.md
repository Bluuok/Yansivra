# Folio Desk 验证记录

环境：Windows 10.0.26200，Bun 1.4.0，Node 24.21.0，Electron 39.8.9。阶段回归使用独立临时 profile、隐藏窗口和本地 provider。文末的 DeepSeek 补充验收使用用户授权的真实 API Key 和项目内独立 profile。

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

## 阶段 3：研究与复盘闭环

- 类型检查 5 个工作区通过；生产 renderer、preload、main 构建通过。
- 研究、总览和 journal 针对性测试：**19 pass / 0 fail**，95 断言。
- `node apps/electron/e2e/journal-flow.mjs`：真实界面选择旧报告 A、查看证据与不可用状态、关闭脏表单确认、按当前报告留档、总览待复盘入口、跨页面草稿保留、纯文本脚本不执行均通过。
- 使用 Windows 读共享文件句柄阻止原子替换，实际触发 `STORAGE_WRITE_FAILED`；没有成功提示或记录损失，输入保留，解除句柄后原请求可重试成功。
- 实际关闭重开，删除隔离 profile 内源报告后，独立快照可阅读，原判断保持不变，人工复盘可以继续追加。

新增翻译 namespace 已注册；报告变化仅在 `currentReportId` 与当前阅读报告相同时显示，快照模式不加载最新变化。原投资论点保存接口兼容 symbol 调用，同时支持报告 ID，避免旧报告阅读动作误存最新报告。

## 阶段 4：Windows 回归与交付整理

版本 `0.5.0-beta.1`，产物显示名 Folio Desk。应用 ID、内部配置命名和旧 Folio 数据目录保持兼容。已更新中英文 README、窗口图标和真实产品截图。

| 检查 | 最终结果 |
| --- | --- |
| `bun run typecheck` | 5 个工作区通过 |
| `bun run build` | UI 工作区、生产 renderer、preload、main 通过 |
| `bun run test:unit`（AGY） | **1697 pass / 8 skip / 0 fail**，183 文件、7467 断言 |
| `bun run eval:smoke`（AGY） | **15/15 pass**，fixture 模式，综合分 0.768 |
| `bun run i18n:check`（AGY） | 中英文各 1571 个键、0 差异 |
| `bun run package:windows` | x64 运行目录和 ZIP 成功生成 |
| `node apps/electron/e2e/windows-package.mjs` | ZIP 在源码外中文/空格路径解压启动；真实生产页面、IPC、安全选项、13 个包内技能、两个扩展路径、金融工具和完成的本地 Agent 运行通过 |
| `bun run test:desktop` 的组成脚本 | 主导航、投资论点入口、助手草稿、真实研究启动/取消、1366×768 / 1920×1080 与 100% / 125% / 150% 的六组组合；右栏开启时两栏完整可见；journal IPC 与界面闭环通过 |
| 最终 ZIP 上的 `desktop-market.mjs` | 自选选择、K 线周期切换、未连接行情的 `CONFIG_MISSING` 与真实重试入口通过；没有将错误态当作在线报价成功 |
| 最终 ZIP 上的 `journal-flow.mjs` | 再次通过旧报告 ID、真实 Windows 写入失败/重试、纯文本不执行、关闭重开、源报告删除后快照与追加复盘 |

AGY 首轮类型检查发现新增资源测试的 `delete` 属性类型不兼容；主代理改用 `Reflect.deleteProperty`，相关 6 项测试与全工作区类型检查复验通过。没有删除用例或降低业务断言。8 个跳过项与基线相同：1 个宿主软链接权限保护、7 个原有后续阶段预置用例。

隐藏窗口 CDP resize 曾出现 promise 被回收，测试已保留 promise 生命周期，完整桌面回归随后通过。截图时允许页面绘制并明确断言原生窗口仍隐藏，避免将旧渲染帧作为产品截图；没有修改页面数据或编辑截图像素。

补齐六组尺寸/缩放组合后，将窄屏图标栏断点由 900px 调整为 1000px，避免 1366×768 在 150% 内容缩放、右栏开启时最小面板宽度超出可见区。最终六组均检查中心/右栏最小可用宽度和右侧边界。

本机验收进程的管理员角色检查为 `False`。打包应用从 `E:\temp\Folio 中文 解压 ...` 启动，使用独立中文/空格 profile；没有开发服务器、管理员安装或用户真实账户数据。

最终本地产物：

```text
dist/electron/Folio-Desk-0.5.0-beta.1-win-x64.zip
141296688 bytes
SHA256 7f55ccd0073ac4f5c9164d38187578829bd03a12bbe7d7f55ae6cfdbe575c0f6
```

这是上述阶段的未签名可解压运行包。EXE 元数据编辑被跳过，Explorer 属性/图标可能保留 Electron；应用窗口显示新品牌。在线行情、真实 LLM、Pi 外部运行时、签名、安装器、自动更新和 Windows 多显示器 DPI 切换未作为上述阶段通过项。源码按阶段推送到 `Bluuok/folio` 的 `desktop/redevelopment` 分支；没有自动发布二进制 Release。

## 2026-10-01：DeepSeek Flash 补充验收

使用官方 `https://api.deepseek.com/v1`，模型固定为 `deepseek-flash`，没有调用 Pro。真实 Pi CLI 版本为 `0.73.1`。Key 通过 Folio 的自定义 provider IPC 写入 Windows `safeStorage` 加密存储；凭据、profile、启动入口、测试脚本和截图留在被 Git 忽略的 `output/`，未写入源码或提交。

实际请求从 Windows 程序的聊天输入框发送，经过 renderer、preload、主进程、Pi RPC 和官方 DeepSeek 服务。运行 `09a9d934-5aad-495b-879a-e102e28d291a` 为 `completed`，界面与持久化回答均为“DeepSeek 已连接，2 加 3 等于 5。”测试脚本耗时 6434ms；Pi 最终消息为 `stop`，报告 7307 输入 token、60 输出 token。关闭重开后，provider 仍为 `deepseek`，model 仍为 `deepseek-flash`。自定义模型未配置价格，Pi 的零成本字段仅是未定价的跟踪值，不代表实际账单为零。

实测修复：

- 补齐 Pi 扩展注册自定义模型时必需的输入类型、成本结构及默认限额，保留显式字段。
- 将最终 assistant 消息中的 provider 错误转换为 `PI_PROVIDER_ERROR`，避免空回答被记成完成；普通和流式 RPC 均覆盖。
- Windows `afterPack` 移除自定义 Electron 发行目录遗留的 `default_app.asar`，避免加载默认 Electron 页面；ZIP 验收增加对应断言。

38 项相关测试通过，全工作区类型检查通过。已有会话清理测试首次受到沙箱 `/tmp` 写权限限制，以本机临时目录权限重跑该文件的 19 项测试后全部通过。最终 ZIP 再次解压到源码外的中文/空格路径，真实 renderer、preload、main、13 个技能、扩展、工具、本地 Agent 和安全选项均通过。没有重跑全量单元测试，也没有调用 Pro 或其他模型。

本机默认 `%APPDATA%\Folio` 目录的 Node 同目录重命名报 `EXDEV`，独立无凭据探针复现。因此本次配置使用 `output/Folio`；本机双击 `output/启动 Folio.cmd` 会选择该 profile、独立 Pi 配置目录和 Flash 模型。直接启动 EXE 不会自动选择这次配置目录。

更新后的 ZIP：141214071 bytes，SHA256 `f69eb9f8b7b6695820728519f3be1e317b508e5f76f07d59cbf50f1317e6cd62`。真实结果见本机 `output/deepseek-live-result.json` 和 `output/deepseek-live.png`。本次只验证 LLM 连通与聊天持久化，在线行情和完整金融研究仍未验证。

## 2026-10-01：真实 Massive 数据与 Flash 研究闭环

用户提供的 Massive Key 已通过实际桌面 IPC 保存到 Windows `safeStorage` 加密凭据存储，凭据文件仍在忽略的 `output/Folio` 中。Massive 设为主数据源；没有充值、购买套餐、注册新账户或执行交易。官方 Longbridge CLI `0.28.7` 已校验发布方 SHA256 后安装到本机忽略的 `output/runtime/longbridge`，仅由本机启动入口添加进程 PATH；账户本人尚未完成长桥授权。

实测发现并修复：

- Windows 缺少 CLI 时，`cmd.exe` 只返回退出码 1 与本地语言错误，原实现误报未知错误。新增可执行候选检查，仅将确认不存在的命令识别为未安装；保留已安装程序的退出码 1 错误。
- 长桥当前版本的财报日历子命令为 `report`。已有 `financial` 输入兼容映射到该命令，实际 CLI 帮助/响应 schema 确认参数有效；未把参数检查当作已授权日历数据成功。
- Massive 免费套餐拒绝实时 snapshot，原报价路径无法使用已配置的免费账户。权限不足时改为请求最近两个真实日线，按收盘价计算涨跌并保留延迟标记；鉴权失败或限流不走此回退，缺少两根日线时不制造昨收。
- K 线返回数量超过请求上限时，只保留最近指定数量的日线。
- 研究能力的 K 线与公司资料原先丢失路由来源，错标为 Longbridge。现在与报价一样传递实际提供方、时间、延迟和备用源记录；离线演示仍明确标为 demo。
- 顶部行情提示原先只检查长桥。现在检查实际启用的行情连接并订阅连接变更；真实 Massive 连接成功、停用、重新启用均已通过实际界面验收。

最终实际运行 `research-1c14ef3a-3bf2-4c38-b5f5-09b76d560f6d`，模型身份为 `deepseek / deepseek-flash`，没有调用 Pro；`FINAGENT_DEMO_DATA=0`。`market.quote`、`market.kline`、`company.profile` 三项成功，checkpoint 中实际来源均为 Massive 且 `delayed=true`。报价为 2026-09-30 日线收盘 333.02 USD、上一根日线收盘 329.40 USD；报价与 K 线最后一根收盘价、行情时间相同。数据是账户实际 API 响应，不是内置演示或离线 fixture。

该研究生成结构化报告并保留 `partial`：其余 13 项能力因长桥尚未授权而失败。真实界面已保存该报告的人工判断、追加“数据不足”复盘；实际关闭重开后，报告快照、原判断和复盘记录保持一致。接口结果与日志见本机 `output/live-flow-result.json`、`output/live-ready-result.json`；截图仍留在忽略目录，不替换 README 中明确标注的离线准备截图。

最终源码全量单元测试 **1714 pass / 8 skip / 0 fail**，184 文件、7503 断言；5 个工作区类型检查通过，Longbridge 工具包独立类型检查也通过。UI 修复后另有 **321 pass / 0 fail**。研究、路由来源、延迟标记与 demo 兼容的新增针对性用例通过。

当前 ZIP 为 **141220436 bytes**，SHA256 `f41a52968acece01a7d8fcb0e00efc16c341fd5363ddad7ef32816d0832aa9a1`。再次解压到源码外中文/空格路径启动，真实生产页面、IPC、安全配置、13 个技能、包内扩展、金融工具和本地 Agent 均通过。完整金融数据覆盖、长桥财务/新闻/账户权限和券商账户真实集成仍未通过。实际行情 → Flash 报告 → 判断 → 复盘 → 重启留存的主流程已通过，不能据此声称全部项目功能均已跑通。
