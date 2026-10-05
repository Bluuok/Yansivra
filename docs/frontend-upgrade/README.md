# Yansivra 前端升级：Skills 驱动的视觉与动效统一方案

> 本文是 PR #2、#3 的替代方案与本次范围约定。已安装并核验两个开发Skill，完成检索、样稿、总览/研究/复盘升级和实际验收；[当前截图与历史记录](gallery.md)、[验证记录与边界](visual-validation.md) 可直接复核。
> 核查基线：`Bluuok/Yansivra@8a3bd8407ba02a6b8ba10e1374ca5c81f3673b8f`。本次重新查询 main，仍是 2026-10-01 合并的桌面改版。保留「总览 / 研究 / 复盘 / 资产」四个入口与现有后端。[C1]
> 阅读顺序：本文 → [Skills 安装与执行手册](skills-workflow.md) → [前端规则模板](frontend-rules.template.md)。后续执行者只使用这一组文件。

## 1. 本次依据与纠正

本次依据是用户提供的《7个神级技巧，彻底去除网站的 AI 味儿！》Markdown 全文，共 649 行；已读取七个方法和三个案例的文字内容，不再只有网页公开导语。文章中的图片是外链，本次未成功读取所尝试的外链图片；视频未观看。因此不声称完成了原文效果图或视频的视觉对照。[A]

文章的「方法 5、Agent Skills」明确推荐 **两个** Skill：**Frontend-design** 和 **UI UX Pro Max**，不是五个。Context7、AGENTS.md、图片网站和组件库不是另外三个前端 Skill。此前建议“先安装文章中的五个 Skill”没有原文依据，本方案废止该说法。[A，方法5]

来源分三类：文中的「原文方法」只转述文章；「代码现状」以基线源码为准；「Yansivra 决策」是针对当前桌面产品的设计取舍。原文没有规定两个 Skill 必须同时使用；本轮选择让二者分工，是实施决策，不冒充原作者要求。

**最终目标不是“把界面收敛得更素”，而是：主页面静态时就有完成度，关键交互有清楚而有质感的动态反馈。** 前端变化应明显，后端能力与真实研究闭环不重做。

## 2. 原文七个方法如何进入本项目

| 原文方法 | 原文要点 | 本轮 Yansivra 决策与交付证据 |
| --- | --- | --- |
| 1、让 AI 参考真实网站 | 读取网站、提供截图、截图转代码、参考模板或开源项目 | 设计执行时建立不超过三项的参考板，逐项记录来源、实际可读内容、借鉴的局部及不采用项。不能只抄整站配色或留下几个未读链接。已有代码和同尺寸桌面截图是首要约束。 |
| 2、设计优先开发 | 先做纯静态 Demo，满意后再开发；文中列举 Stitch、Figma、Onlook | 先做三个核心页面的静态样稿，再连接现有状态与 IPC。OpenDesign 已可用时可辅助制作，但不替代两个 Skill，也不要求另外安装全部设计工具。 |
| 3、丰富网站图片 | 按需使用插画、图标、照片、占位图资源 | 总览采用一张正式主视觉；研究和复盘复用同一视觉母题。用实际素材或精制原创图形，不用三个随便旋转的 div 冒充精美插画。资源本地化并登记来源。 |
| 4、提示词约束 | 反向提示、角色设定、具体文案、语境注入、AGENTS.md 复用 | 将适合金融桌面的规则沉淀为前端局部约束，见规则模板。正文可用必要金融术语，不照抄“每句不超过15字”或挑衅式营销文案。 |
| 5、Agent Skills | Frontend-design；UI UX Pro Max 的数据搜索与设计方案工作流 | 两者在开发 Agent 环境可发现、可读取；UI UX Pro Max 做设计检索和规范，frontend-design 做有辨识度的构图、实现与自评。交付实际调用记录，而不只列名称。 |
| 6、反 AI 味儿组件库 | 列举 Aceternity UI、Magic UI 等；建议读官方文档或用 Context7 | 允许按需引入一至两个局部组件并定制，不再一律要求从零写 SVG/CSS。保留 React/Radix 基础，不换框架，不照搬原示例无限循环与默认渐变。 |
| 7、自主配色 | 用 Coolors、Adobe Color 等辅助指定配色 | 延续已实现的暖白、墨蓝基线，明确色彩角色及暗色映射。并非“换一套色值就一定独特”；不再开展一次全产品换肤。 |

以上七种方法及三个案例的来源均为用户提供的文章；案例的意义是方法组合，不是要求金融桌面使用代码雨、健身落地页或 Svelte 组件库。[A]

### 不直接复制文章规则的地方

文章的禁止清单是作者的提示词示例，不是普适标准。本项目允许图表和正文使用干净纯色底；纹理限于装饰区域；同宽列在数据比较时仍有用途。保留现有 Lucide/Radix，不因为文章举例 Iconify 就混用另一套图标，也不把示例中列出的所有库装进项目。

原文将 ease-in-out 放在“线性动画”的括号中。这里明确区分：CSS 的 linear 是匀速，ease-in-out 是缓入缓出；本轮按反馈用途定义曲线，不因该表述机械禁止合法缓动。[A，方法4；D5]

## 3. 相对旧 PR 的实质变化

| 旧方案 | 新方案 |
| --- | --- |
| 页面构想先行，Skill 的执行没有成为交付门槛 | 先检查 Skills → 搜索设计依据 → 定稿设计系统 → 静态样稿 → 现有链路接线 → 视觉和行为回归。 |
| 统一禁止新增动效库，要求主要自行实现 | 默认轻量复用，但允许经过源码、许可证、依赖和性能核验的单组件引入。需要时最多新增一种动画运行时。 |
| “暖白、档案、编号、箭头”容易成为另一种模板 | 颜色沿用产品基线；辨识度来自真实的研究、依据、判断关系。移除无意义编号、装饰性英文小标题、所有按钮后统一加箭头等习惯。 |
| 档案插画只给了结构概念 | 增加正式素材选择、层级、资源预算、无动效截图和素材失败回退的验收。 |
| 静态与动效分在两个并列 PR 中 | 一份主计划、一个设计系统、一个实施顺序；不允许两个执行者分别决定不同配色和组件风格。 |

保留旧方案有价值的部分：总览主次关系、研报与依据联动、判断档案、真实运行状态、不可变快照、失败保留输入、Allotment 常驻及 Windows 回归。这些保护不是要减少视觉完成度，而是防止改漂亮后功能退化。[C2][C3]

## 4. 设计流程与进入下一阶段的条件

### G0：准备，不直接改业务页面

读取仓库现有规则、package.json、本文及两个 Skill 的实际入口。确认它们是开发 Agent 的技能，不是 Yansivra 内置投资 Skill，不放入应用的 `skills/`，也不打进 Electron 资源。

记录可发现路径、来源/版本、调用方式与 Python 可用性。缺失就按执行手册补齐；已经存在则复用并核对，不重复安装多个同名副本。本次安装证据见 [skill-installation.md](skill-installation.md)，实际检索见 [skill-run-log.md](skill-run-log.md)。

### G1：先产生设计系统与静态样稿

UI UX Pro Max 用已检测到的 Electron + React 技术栈检索，不能默认生成 Next.js 网站。检索结果需检查匹配程度，剔除投资开户转化、收益承诺、营销落地页模板。frontend-design 根据筛选结果和产品真实内容提出构图，并完成一次反模板自评。[D1][D2]

本次已产出以下材料；原始检索、自评和实际验收分别保存，便于复核：

```text
design-system/yansivra-desk/MASTER.md
  pages/overview.md
  pages/research.md
  pages/journal.md
docs/frontend-upgrade/reference-board.md
docs/frontend-upgrade/skill-run-log.md
docs/frontend-upgrade/asset-manifest.md
docs/frontend-upgrade/visual-validation.md
```

MASTER 只保留一套定稿规范，搜索原始结果另存，不把未经筛选的自动输出直接覆盖现有设计。已有同名文件先读再增量合并，不用 --force。

静态 Demo 位于 `preview/index.html`，是开发专用样稿。固定且明确标注的示例覆盖总览、研究、复盘，不触发真实行情/LLM 请求，也没有成为生产环境错误回退。

门槛：三个页面的同尺寸截图、正常与减弱动态对照、正式主视觉、已选字体及状态层级；由执行 Agent 对照本文自评修正，不自动宣称用户已经批准。若用户没有要求逐屏审批，按既定方向继续，不因等待反馈让全部工作停住。

### G2：接线，再加入动态

优先复用已有数据加载与事件，不为样式新增数据源。静态组件通过门槛后，先接总览与研究，再接复盘，最后加状态驱动动效。每批次单独提交，可回退展示层而不回退业务内核。

### G3：拿截图、录屏和实际测试验收

不能用“已经调用了 Skill”代替视觉验收，也不能把原 PR #1 的测试数量写成本轮结果。具体矩阵见第 10 节。

## 5. 视觉主线：可回看的投资研究桌

### 5.1 基线与风格

延续背景 `#F6F5F1`、正文 `#202A37`、强调色 `#304B78`、边框 `#DEDED7`；这些来自现有 renderer 样式，不是本次新选出的检索结果。[C4]

本轮视觉主角是一件精制“研究档案”静物：墨蓝封套、暖白纸页、半透明书签或窄金属夹。仅这一处允许较明显的材质、阴影、局部光感；真正的报告内容保持易读。它应是产品主视觉，不是随机财务图形拼贴。

当前 frontend-design 官方规则也提醒，暖奶油底、衬线标题或报纸式分栏同样可能成为默认套路。因此不把“去蓝紫”当作完成：保留当前配色是兼容决策，独特性由正文、依据与原判断的实际关系承担。[D1]

文字系统以中文阅读为先：标题目标 28–32px，正文 14–16px，辅助信息通常不小于12px；这些是设计目标，不是声称完成了无障碍测量。标题字族通过 Skill 检索后在 Windows 实际截图中验证；可用一款有授权的标题字与现有正文字体组合，不为“去 Inter”换掉所有控件字体。数字保持 tabular-nums。

### 5.2 正式素材门槛

总览主视觉优先评估文章所列插画资源，再选择能与现有产品匹配的许可素材或原创设计。unDraw、Pexels、Iconify、Picsum 是文章举例，不是必须全部采用的供应商。[A，方法3]

设计产物必须看得出纸页厚度、遮挡、光源和书签层级；不接受生硬通用机器人、随机山水照片、仅有占位框或三块粗糙矩形。若采用图片，业务文字保持 DOM，不烘焙进图片。不能使用未取得授权的文章效果图作为应用素材。

建议预算：主视觉 WebP/AVIF 不超过约 200KB，或优化 SVG 不超过约 60KB；首版新增装饰素材合计不超过约 400KB。预算可随实测有理由调整，不为压缩而损坏画质。正式图本地打包，指定宽高/比例，失败时保留纸面和可操作文案，不留空白或破图。

记录素材来源、作者/许可、使用范围、改动、大小、本地路径和 SHA；字体、组件分别登记。不保留运行时随机图片 URL，不引入外部字体 CDN，不在每次启动重新找图。暗色主题使用适配后的素材/颜色，不把整图反相。

## 6. 三个核心页面如何改变

### 6.1 总览：研究焦点，而不是 Hero 加三卡片

当前 TodayView 已有 recent research 跨两列、待复盘占一列的结构；不是从零缺一个 bento。[C5]

新构图把顶部日期与动作收紧，研究焦点占约 2/3，待复盘占约 1/3；最新报告与正式主视觉同处一个焦点区域，其他报告变成下方紧凑列表。资产概览和自选变化用一条数据带或列表组织，事件保留时间线；不再在主卡下面复制三块同尺寸功能卡。

```text
总览 / 日期                                      发起研究
┌───────────────────────────────┬────────────────┐
│ 最近研究                       │ 待复盘          │
│ 标的 / 摘要 / 状态               │ 真实判断条目     │
│ 阅读报告        正式档案主视觉    │ 复盘日期及入口   │
└───────────────────────────────┴────────────────┘
其他研究：紧凑条目，带生成时间和状态
资产与自选数据带                  近期事件时间线
简报、市场脉搏、提醒：保留功能，降低视觉权重
```

主焦点参考高度 220–260px，允许随内容增高；1366×768 下仍能看到后续入口。主视觉占焦点区域约三分之一，不覆盖摘要、状态或按钮。若容器变窄，先缩减装饰，再将待复盘排到下方。

使用 TodayView 已加载并按时间排序的报告，不再请求一次。点击历史报告沿用 activeSymbol、researchReport、researchOrigin 和导航状态，带正确 reportId。按钮直接叫“阅读报告”“开始研究”“查看复盘”，不加无依据的效率或胜率宣传。

loading 显示固定几何占位；空态是“还没有研究记录”与“开始研究”；错误显示失败和重试；partial、demo、delayed 标记常驻。`journal.list` 的 limit=5 结果不等于待复盘总数，无完整计数不设计大数字。不得因页面要饱满而添加假收益、随机 K 线和虚构报告。

### 6.2 研究：内容、依据与动作组成阅读版式

ResearchReportView 的标的和摘要成为抬头主角，模型立场、置信度、生成时间、实际运行状态分开展示；“记录判断”为主动作，导出为次动作。置信度不是胜率，不用环形大数字制造确定性。[C6]

章节依据内容长短选择单列正文或适度对照；看多/看空可以并列，但不要把每一段都装进相同的圆角卡。章节编号只在确有阅读顺序时采用，不给所有块装饰性编号。正文建议宽 680–760px，以实际内容容器响应，而不是仅按整窗宽度。

目录宽时可 sticky，窄时改成章节菜单；滚动容器是 `.yansivra-pilot-research-content`，不要误绑 window。锚点包含组件实例前缀、reportId 与安全编码后的 section key，避免正文和同一报告快照共存时重复 ID。

EvidenceInspector 做成资料侧栏：当前章节、claim、摘要、能力名称、执行状态、采集时间。现有证据是能力执行记录及摘要，不是财报 PDF 原文；不能画虚构页码、原文高亮或“已核实”印章。用 `runId + capabilityId` 关联执行；重复引用不等于独立多源证据。[C7]

保留历史 diff 的 `currentReportId === report.id` 限制。snapshotMode 不读取最新 diff、不注入新行情、不允许再次记录判断。样式和锚点从传入的报告派生，不能被当前全局标的覆盖。[C6]

### 6.3 复盘：原判断、快照附页、后续记录

保持 JournalView 左侧索引、右侧详情。索引选中态用窄墨蓝标记和轻纸面；右侧原始判断是主纸面，报告快照是可展开的附页，复盘是带时间戳的追加时间线。原判断时间、原报告时间和计划复盘日期必须可区分。[C8]

复盘评价保持 still_valid、weakened、invalidated、insufficient_data 的实际含义。不存在自动判定就不做“AI 已验证”徽章，不能把市场涨跌直接当判断质量。

表单仍使用原 drafts、requestId、busy 防重与失败保留策略。视觉上的“追加一页”只能发生在 journal.addReview 成功之后。没有复盘记录时可复用总览主视觉的一小部分，不再画第二套大型插画。[C9]

资产页及其他辅助页面本轮只做 token 和控件一致性收尾，不新建第四套完整设计、不改图表或金额计算。

## 7. 组件取用：按需引入，而非全部从零或整库替换

| 对象 | 本轮选择 | 进入代码前的条件 |
| --- | --- | --- |
| Magic UI Animated Beam | 研究采集到报告的局部汇聚效果首选候选 | 读当前文档及源码；确认使用版本的 repeat 控制、渐变色、卸载与隐藏行为；不照搬样例 Logo。 |
| Aceternity UI Background Lines | 主视觉局部线稿/光路备选，不是第二个必装项 | 只在总览装饰区测试；若存在持续循环、难以停止或夺取正文注意，则只参考静态构图或不采用。不能假定 duration 参数等于停止开关。 |
| 既有 ContentReveal / visibility hooks | 依据切换、复盘反馈和隐藏暂停优先复用 | 检查初次渲染 reduced-motion 与 Pane 的实际可见状态。 |
| 既有 Radix / Lucide / 图表 | 保留并定制 | 不引入另一整套基础组件、Iconify 运行时或新的图表库，只为“显得用了文章工具”。 |

Magic UI 当前文档列出 Animated Beam 的 repeat 默认是 Infinity，并提供路径与渐变颜色参数；实施时应核对锁定版本并改为有限次数，不默认沿用彩色循环。[D3] Aceternity Background Lines 的文档描述的是动画 SVG 路径；本次只确认候选机制，不声称已在 Yansivra 试用。[D4]

组件 CLI 可能写入 aliases、全局样式与依赖。先在临时目录检查产物，再按现有 `packages/ui` 路径接入；不让 shadcn 初始化覆盖整个工程。读取实际 imports，最多新增一种兼容 React 18 的动画运行时，并记录 lockfile 与构建体积变化；若无收益则使用本地 SVG/CSS 版本并注明原因。

不引入 WebGL 背景、全局鼠标跟随或滚动劫持。限制的是长期资源开销和交互破坏，不是禁止精致材质与所有开源动效。

## 8. 动效：保留三个完整交互，增加可选封面效果

### 8.1 研究时：证据汇聚

替换 RunProgressCard 的展示层，不替换研究执行器。将行情、财务、估值、事件分组连接到报告纸页；未知能力保留“其他数据”。展示的是能力分组，不是四个 Agent，也不暗示串行执行。[C10]

状态适配先做纯函数，建议新增 `researchFlowPresentation.ts`，图形组件建议 `ResearchFlowMap.tsx`。以下均为待实现路径，不是现有 API：

- 以去重的 planned 集合作为本轮范围。只统计范围内的成功和失败；外来 ID 或成功/失败重叠视为不一致并明确标记，不能算出超过100%的进度。
- 准备阶段 planned=0 显示“准备中”，不显示100%；数据采集完成也不代表报告综合完成。
- 摘要只提供计划/已完成/失败时，剩余项叫“待完成”，不能精确断言某个工具正在运行。
- 同类别有成功和失败时保留两类数量；partial 不播放全量成功。失败、取消、中断优先显示并停止装饰。
- 首次加载或恢复已有成果只静态显示。只对之后新增的成功集合播放一次 360–460ms 汇聚；同组批量完成合并一次，最多两条线同时移动，不排长动画队列。
- runId 改变、终态、隐藏或卸载即清理；动画结束不能驱动业务进度。沿用当前轮询，不另设假进度定时器。

### 8.2 看依据：正文与侧栏对应

沿用现有 evidenceSelectionAtom、inspectorModeAtom、agentPanelVisibleAtom。点击后正文出现选中标记，侧栏内部内容约 180–220ms、8px 内位移淡入；即时更新语义数据，快速连点以最新选择为准。

不动画 Allotment 栏宽，不给整个 shell 增加 reportId/路由 key，不重挂载 AgentPanel，不做整篇文字缩放。新旧依据不能为了过场同时停留成两份可交互内容。关闭不改变正文阅读位置。

键盘触发时可转移到侧栏标题，关闭返回仍存在的触发按钮；按钮已卸载则回到当前报告标题。非模态侧栏不强行 focus trap；暗色、长中文、异常文本、无证据态同样可用。[C6][C7][C11]

### 8.3 写复盘：成功后追加

只有成功响应中出现之前没有的 review.id，才以180–220ms轻微淡入时间线并显示“已保存”。首次 hydration、分页、重复响应与重进档案不补播。失败不清输入、不提前插入伪成功条目、不更新 requestId 来掩盖失败。[C8][C9]

用户已切换 entry 时不抢回焦点或自动滚回旧记录。form 不因动画 key 重建。减弱动态下直接展示最终状态。

### 8.4 总览封面：可选，不挤占业务反馈

正式档案素材可拆最多三层，首次进入做约280ms纸页归位；图形可以有很轻的局部光泽，但正文第一帧可读可操作。无需每张卡入场、无限漂浮、数字滚动、文字打字机。时间不足先删这一项，而不是删掉正式静态素材。

### 8.5 优先消除现有 ambient 组合风险

基线 renderer 中 `--motion-ambient: 180ms` 仍被 halo 的 `infinite alternate` 引用；AgentAmbientField 在 complete/partial 也会渲染装饰。若这些规则实际生效，循环会采用过短周期。这是源码组合风险，未在本环境复现屏幕闪烁。[C4][C12]

将交互时长与环境周期拆开；本轮默认将旧 halo 变成静态或仅在 active 阶段受控显示，终态停止。不要把所有变量恢复成旧大粒子参数，也不要为修一个规则全局重写 motion 模块。

## 9. 代码边界与两三天实施顺序

| 阶段 | 工作 | 主要落点 |
| --- | --- | --- |
| 第一天前段 | Skills 检查、设计检索、参考板与 MASTER、三页静态样稿 | 开发技能目录；design-system；开发专用 preview，不接真实服务 |
| 第一天后段至第二天 | 总览焦点、研究正文/依据、复盘材质，复用现有接线 | TodayView、ResearchReportView、EvidenceInspector、JournalView；局部样式与 i18n |
| 第二天后段 | 运行状态适配、汇聚图、依据联动、保存反馈 | ResearchPanel、motion、ReviewForm 的显示层 |
| 第三天/余量 | 视觉差异修正、Windows/暗色/缩放、真实错误与回归 | 既有 Electron e2e 和相关 UI 测试；validation 文档 |

这是范围安排，不是已完成状态或无条件工期保证。优先保持总览和研究两页有明显变化；紧张时复盘先完成排版一致性，砍掉背景线和封面动画，不砍正式素材、真实状态、快照保护与回归。

只保留一个 MASTER。前端设计与实现可由一个执行者承担，独立审查者检查实际截图、状态和回归；不要多人同时改 renderer 大样式文件。不改变现有全局模型路由或安装所有工具。

目前相关文件：

```text
packages/ui/src/components/today/TodayView.tsx
packages/ui/src/components/research/ResearchPanel.tsx
packages/ui/src/components/research/ResearchReportView.tsx
packages/ui/src/components/research/EvidenceInspector.tsx
packages/ui/src/components/journal/JournalView.tsx
packages/ui/src/components/journal/ReviewForm.tsx
packages/ui/src/components/layout/WorkbenchShell.tsx
packages/ui/src/components/motion/*
packages/ui/src/styles/index.css
apps/electron/src/renderer/styles/index.css
packages/i18n/src/locales/{zh-CN,en-US}/*
```

先确认两个 CSS 入口的实际使用方与覆盖顺序，再抽出局部共享规则；不能继续叠加高特异性和大量 !important，也不在本轮顺手全量重构。WorkbenchShell 主要作为保护边界，非必须不改。

禁止范围：Pi RPC、Agent 生命周期、行情 Provider、金额与时间戳计算、journal 存储、API 密钥、现有数据目录、后端数据库、交易能力、Windows 打包身份。发现非视觉业务缺陷另记问题，不夹带大修。

## 10. 验收条件

### 设计与流程证据

- [x] 两个 Skill 的真实路径、版本/来源、调用和输出有记录；无法调用的内容明确标缺失，没有伪造搜索结果。
- [x] 参考板逐项注明实际已读文字/已查看图片；失效页面不写成已经提取视觉规范。
- [x] 三页先完成静态样稿；动画禁用时仍有正式素材、明确层级和完整操作。
- [x] 总览以案卷主视觉和紧凑报告索引区分主次；研究为连续章节，保留有用途的导航箭头。
- [x] 素材来源、许可、大小与本地路径可追踪；CDP实际字体为Microsoft YaHei与Consolas，图标沿用Lucide。

### 业务与状态

- [x] 保留loading、empty、error、partial、demo、delayed；新流图区分采集与综合，未改变金融/模型数据。
- [x] 历史reportId、快照、依据匹配与diff条件受实际UI/桌面测试保护，多份报告选择通过。
- [x] planned=0、部分/全失败、综合、取消/中断和不一致集合由纯函数、UI单测及实际组件验证。
- [x] Windows真实写锁失败保留输入，解锁重试只追加一条；成功状态来自实际IPC返回。
- [x] 实际smoke验证助手草稿保留；源码未改变Allotment/AgentPanel/图表身份，目录在现有滚动容器工作。

### 桌面、可访问性与性能

- [ ] 原生内容尺寸与应用125%/150% zoom已测并记录实际CSS；未改变Windows系统显示设置，故不勾选完整OS DPI验收。
- [ ] 新增依据/回退/目录的4项实际键盘检查通过；旧判断和复盘表单的全部Tab路径未完整复测。
- [ ] reduced从首帧与真实IO离屏取消已验证；document.hidden/卸载/关闭取消有单测，OS最小化事件未做完整实机覆盖。
- [x] 源码未增加行情/模型请求或轮询；60组合终态无常驻动画，线路只按新结果播放。
- [x] 无新增动画运行时，主图3030 bytes；同一Node gzip level6计算JS增加3763 bytes，低于50KB预算。
- [x] 两个尺寸各30次资料栏开闭，记录DOM响应、longtask与终态动画；不宣称绘制延迟、60fps或零影响。
- [x] 本轮338 UI / 1736单元通过，8跳过；5工作区typecheck、完整桌面链、实际动效组件和最新版Windows包通过。源版本与复测范围见验证记录。

实现 PR 附总览/研究/复盘明暗截图，以及研究状态变化、依据联动、写入失败后重试成功的短录屏。样例数据明确标 demo；静态预览不等于 Windows Electron 集成通过。

## 11. 核验范围与来源

原规划阶段已完成：上传全文阅读；旧 #2/#3 文档与 PR 状态读取；main SHA 复核；两个官方 Skill 入口和组件文档核对。本次执行的安装、检索、样稿和实际测试另有可复核记录：[安装](skill-installation.md)、[检索](skill-run-log.md)、[规范](../../design-system/yansivra-desk/MASTER.md)、[验证](visual-validation.md)。文章外链效果图与视频仍未审阅；不将当前页面当作原文效果图的复刻。

原文章及其图片不复制进仓库；以下仅保留出处和与实施有关的转述。旧 PR 用不可变提交链接保存来源，新执行者无需读取旧分支。

[A]: https://ai.codefather.cn/library/2026205153777963010
[C1]: https://github.com/Bluuok/Yansivra/commit/8a3bd8407ba02a6b8ba10e1374ca5c81f3673b8f
[C2]: https://github.com/Bluuok/Yansivra/blob/e7e8dd985475f22c1fb92b972a4e0c19f158bd14/docs/frontend-upgrade/01-editorial-visual-design.md
[C3]: https://github.com/Bluuok/Yansivra/blob/ab48d8f05225bfca1fe66d9aa070d8ea50c0e497/docs/frontend-upgrade/02-motion-interaction-plan.md
[C4]: https://github.com/Bluuok/Yansivra/blob/8a3bd8407ba02a6b8ba10e1374ca5c81f3673b8f/apps/electron/src/renderer/styles/index.css
[C5]: https://github.com/Bluuok/Yansivra/blob/8a3bd8407ba02a6b8ba10e1374ca5c81f3673b8f/packages/ui/src/components/today/TodayView.tsx
[C6]: https://github.com/Bluuok/Yansivra/blob/8a3bd8407ba02a6b8ba10e1374ca5c81f3673b8f/packages/ui/src/components/research/ResearchReportView.tsx
[C7]: https://github.com/Bluuok/Yansivra/blob/8a3bd8407ba02a6b8ba10e1374ca5c81f3673b8f/packages/ui/src/components/research/EvidenceInspector.tsx
[C8]: https://github.com/Bluuok/Yansivra/blob/8a3bd8407ba02a6b8ba10e1374ca5c81f3673b8f/packages/ui/src/components/journal/JournalView.tsx
[C9]: https://github.com/Bluuok/Yansivra/blob/8a3bd8407ba02a6b8ba10e1374ca5c81f3673b8f/packages/ui/src/components/journal/ReviewForm.tsx
[C10]: https://github.com/Bluuok/Yansivra/blob/8a3bd8407ba02a6b8ba10e1374ca5c81f3673b8f/packages/ui/src/components/research/ResearchPanel.tsx
[C11]: https://github.com/Bluuok/Yansivra/blob/8a3bd8407ba02a6b8ba10e1374ca5c81f3673b8f/packages/ui/src/components/layout/WorkbenchShell.tsx
[C12]: https://github.com/Bluuok/Yansivra/blob/8a3bd8407ba02a6b8ba10e1374ca5c81f3673b8f/packages/ui/src/components/motion/AgentAmbientField.tsx
[D1]: https://github.com/anthropics/skills/tree/main/skills/frontend-design
[D2]: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
[D3]: https://magicui.design/docs/components/animated-beam
[D4]: https://ui.aceternity.com/components/background-lines
[D5]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timing-function
