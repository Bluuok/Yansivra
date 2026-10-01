# 实际检索与取舍

2026-10-02，通过已安装 UIUX `scripts/search.py` 实际运行，完整原始输出在 [search-results](./search-results/)。它们是检索记录，**不是已采纳的规范**；最终规范只在 `design-system/folio-desk/MASTER.md`。

| 输入 / 参数 | 实际首条结果 | 处理 |
| --- | --- | --- |
| investment research desktop / --design-system -p Folio Desk -f markdown | Portfolio Grid；Swiss Modernism；EB Garamond / Crimson Text | 页面模式误匹配作品集，字体缺中文，不采纳 |
| financial analysis desktop / --design-system（一次窄化重试） | Hero + Features + CTA；Minimalism；绿色 CTA | 仍是营销页；不采纳 CTA、色板、字体。一般留白/网格原则适用 |
| editorial archival asymmetric / --domain style | Editorial Grid / Magazine | 采用不对称布局和内容层次；拒绝首字下沉、滚动视差、强制衬线和翻页 |
| Chinese longform reading / --domain typography | Chinese Simplified：Noto Sans SC | 中文优先；离线 Windows 实际存在微软雅黑，标题/正文采用系统中文无衬线；数据采用 Consolas tabular-nums。无 CDN、无字体下载 |
| rapid animation interrupted / --domain ux | Cancellable State Transitions | 状态立即更新，取消旧动效；不用 animationend 驱动数据；支持 reduced-motion |
| React state preservation / --stack react | useState；React 19 Actions；RSC 安全 | 只接受稳定 useState；后两条不适用于当前 React18/Electron，不升级框架 |
| component key preserve state / --stack react（一次窄化重试） | Stable unique keys；useState；行为测试 | 采用稳定业务 ID；不对表单、AgentPanel、Allotment 加动画 key。基础原则在 React18 通用，版本限定的 API 不采用 |

frontend-design：从真实桌面任务选择“研究案卷”一个视觉记忆点；先 MASTER、三页静态样稿，再接数据。反模板自检：删除重复卡片装饰、全大写眉题、假计数、空心箭头套件；正文采用不同长度的连续章节，不做齐高卡片。

候选动效源码核验见 reference-board；使用原生 SVG/CSS/WAAPI 有限动画，新增动画运行时 0 个。测试按用户原话“测试用反重力”，通过 AGY staffer 一个会话执行，主代理负责业务代码及验收；不把安装和路由探针当业务测试。
