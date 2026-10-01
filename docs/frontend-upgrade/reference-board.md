# 参考板与候选源码核验

只使用以下3项，2026-10-02实际读取；不下载或复制文章图片/商品素材。

1. 本仓库 `docs/screenshots/desktop-overview.png`、`desktop-research.png`、`desktop-journal.png` 和真实 TodayView/ResearchReportView/JournalView。基线截图由反重力从隔离fixture重新生成。保留导航、报告选择、证据/复盘动作和金融信息标记；改善齐高卡片、薄弱正文层次、重复小字。截图是现有产品，不作为新增素材。
2. [Magic UI Animated Beam](https://magicui.design/docs/components/animated-beam)及官方 `apps/www/registry/magicui/animated-beam.tsx`。查看参数/源码：默认 repeat Infinity、motion/svg、两端测量和ResizeObserver。借用“证据分类汇入综合”的表达；不复制组件、不安装Motion，使用固定拓扑SVG+420ms单次WAAPI，最多2条，有限且可取消。
3. [Aceternity Background Lines](https://ui.aceternity.com/components/background-lines)。实际读取官方组件页：用于营销hero的波状SVG、默认10秒路径、svgOptions只展示duration。不是当前产品需要的状态表达，拒绝接入，也不据展示页假称核验全部源码。

技术校核：[React preserving and resetting state](https://react.dev/learn/preserving-and-resetting-state)实际读取，保持shell、AgentPanel、Allotment、表单业务identity；这是实现依据，不增加第4个视觉参考。

原创案卷SVG采用路径透视、内页厚度、阴影、书签透光和金属高光，作为代码原生插画。它不是模仿任何参考图片，也不需要imagegen生成位图。反模板自检移除重复装饰箭头和额外卡片阴影；案卷是唯一视觉主角，状态动效不承担装饰。
