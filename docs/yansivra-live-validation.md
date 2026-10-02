# Yansivra 真实在线流程验收

验收日期：2026-10-02，Windows 包版本 `0.5.0-beta.1`。反重力负责隔离的本地测试、类型检查、构建与打包；真实账户调用由主代理在本机完成，没有向外部测试代理传递 API Key 或用户账户资料。

测试使用单独的本机资料目录，复用必要的既有加密凭据与连接配置。判断与复盘均为验收记录，未写入用户原有资料。没有调用交易或下单接口。

| 实际验收项 | 结果与证据 |
| --- | --- |
| Windows 包启动 | 实际 Yansivra 窗口，Pi runtime，选中 `deepseek/deepseek-flash` |
| 在线 Flash 聊天 | Agent 实际 completed，收到“2 加 3 等于 5”；后续研究复验复用这项已验证结果 |
| 公共行情 | 实际报价、日 K 线、公司资料、新闻、市场状态返回数据；主源 Massive，备用 Longbridge |
| 在线研究 | 从界面发起 AAPL.US 研究，16 项公共研究能力成功，报告状态 completed；核查持久化 synthesis 事件及对应 Agent 任务 |
| 报告导出 | 通过包内 IPC 实际生成 Markdown |
| 判断与复盘 | 通过真实界面保存判断及一条复盘，不替换 IPC 或存储实现 |
| 重启恢复 | 关闭并重开包内程序，报告正文、判断快照、复盘及 Flash 模型选择保持一致 |
| 时间修复 | 新包核对真实 K 线与成交序列，marketTime 等于最新原始 timestamp × 1000；直接对 Longbridge 返回的 20 条真实 K 线重复核查最新时间 |
| 本地验证 | 反重力：1739 pass、8 skip、0 fail；类型检查、完整构建、Windows 包内验收通过 |

16 项成功的公共研究能力：`market.quote`、`market.kline`、`market.intraday`、`market.depth`、`market.trades`、`market.capitalFlow`、`market.sentiment`、`market.status`、`company.profile`、`company.valuation`、`company.financials`、`company.dividends`、`company.earnings`、`company.ratings`、`research.news`、`research.events`。成功表示本次接口调用返回有效数据，不表示每个分析维度都能形成确定结论，也不表示所有股票与数据套餐都已验证。

首次验收定位并处理的情况：

- Pi 首次通过 bunx 下载运行时，超过默认 5 秒健康检查期限；本机首次依赖安装完成后，Flash 聊天和研究均成功。此次验收不证明全新电脑免安装运行时。
- Massive 首次连接测试被限流，等待后复测恢复 `connected/healthy`；新包最终验收的 Longbridge 与 Massive 连接测试均为 healthy。Massive 套餐不支持的快照走现有日线回退，日线数据的实际日期保留，不能视为实时流。
- 原源码使用历史序列第一条作为 provider 的市场时间，覆盖了 K 线最新时间；本次改为取最大有效时间。逐笔成交的秒级时间也已转换为毫秒，并按最新一笔生成摘要。
- 新的本地启动器补齐原启动器的资料目录、`deepseek-flash`、禁用演示数据及环境设置；没有更换模型为 Pro。

**券商持仓读取未通过。** Longbridge 授权有效，但授权状态没有券商账户；真实 portfolio CLI 返回权限拒绝。测试没有改动券商权限，也没有输出账户标识、持仓或余额。公共行情、研究和复盘的上述通过结果与这项账户权限限制分别记录。

真实测试日志、结果和界面截图保存在本机任务输出目录 `live-20261002` 与 `live-fixed-20261002`，均为 Git 忽略资料。GitHub 记录不包含用户凭据、运行时资料或账户数据。
