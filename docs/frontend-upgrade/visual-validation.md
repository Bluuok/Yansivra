# 视觉与行为验证记录

## G1 静态门槛

2026-10-02：三页开发样稿已渲染并由主代理查看总览日间、研究夜间reduced、复盘日间截图。12张截图覆盖三页×浅/深×normal/reduced；实际CSS视口与overflow结果在 screenshots/static/viewport.json。图片像素尺寸受本机deviceScaleFactor影响，不当作OS DPI测试。首次预览导入Electron路径错误，导致窗口未创建；只停止本次专属测试进程，修正为内置require('electron')后正常渲染。

取舍：保留有厚度/阴影/金属夹的案卷，删除装饰箭头与每段卡片阴影；中文可读，正文不齐高；研究目录与资料栏有独立层次，复盘原判断比快照/时间轴更突出。无账户请求、无真实收益、fixture显式示例，reduced下同内容可读。通过此静态自检后进入真实数据接入。

## G2 / G3

G1截图只证明样稿。以下将升级前、初测和最终复测分别记录；初测通过的单项不能覆盖已发现的失败。

## 已收集的升级前基线

AGY staffer，模型由插件选择 `gemini-3.8-flash-medium`，通过已登录反重力CLI账户；会话 `824787d5-3e6f-46b3-8745-17265e683096`，job `staffer-mupt8i1i-5029f329`。安装/版本帮助只是探针；以下才是实际业务测试。

| 实际命令 | 基线结果 |
| --- | --- |
| bun run test:ui（原脚本未隔离） | 315 pass / 1 fail / 2 errors，SourceInspector / happy-dom异步清理冲突；当前脚本改为--isolate，等待升级后验证 |
| bun run typecheck | 5个工作区通过 |
| node apps/electron/e2e/desktop-showcase.mjs | 通过，3张fixture截图 |
| node apps/electron/e2e/journal-flow.mjs | 通过：Windows真实文件锁写失败/重试、删源报告后快照/重启 |
| node output/frontend-validation/baseline/evidence-inspector-stress.mjs | 两个目标尺寸各30次，实际CSS1366×768/1921×1080；longtask均0，终态running animations均0 |

旧JS gzip总量412652 bytes。基线脚本开/闭中位数约1950/2010ms，含隐藏窗口Playwright click自动等待开销，**不能称为用户输入或绘制延迟**。升级后沿用同脚本作有限对比，另记录renderer DOM状态变化指标。AGY产物位于本地 `output/frontend-validation/baseline`；不将含系统细节的完整日志或隔离profile提交到Git。

companion提示“AGY修改工作树”是运行前后git status差值；该时段业务文件全部由主代理写入，已核对实际diff，不按提示回滚主代理改动。AGY只写测试output。

## G2 初测与修正（最终修复前）

同一AGY会话，job `staffer-muptw5d2-35b1a653`。主代理检查实际日志/JSON后接受以下单项结果，拒绝报告中“全套通过”“无丢帧”的超范围表述。

| 实际执行 | 结果 |
| --- | --- |
| bun run build | exit0 |
| bun run test:ui（--isolate） | 336 pass / 0 fail，57文件，1130断言；原异步DOM清理冲突消失 |
| bun run test:unit | 1734 pass / 8 skip / 0 fail，188文件，7575断言 |
| bun run typecheck | 失败：matchMedia mock需要unknown中转、NodeList需要Array.from；已修正，等待最终复测 |
| bun run test:desktop | smoke、journal IPC通过；journal flow快照嵌套summary导致严格选择器错误，后续market未执行。改为直接子summary，等待复测 |
| 连续30次侧栏开闭×两个尺寸 | 新/旧包各60次，每个尺寸30+30 DOM记录，failureLogs为空、longtask0、最终running animations0 |

初测JS gzip 416343 bytes，较旧包412652增加3691 bytes；这不是修复后最终体积。新增动画运行时0个。

初测renderer click→MutationObserver均值：旧包打开5.92/6.80ms、关闭5.70/6.08ms；初版打开8.13/11.07ms、关闭7.38/10.62ms（1366/1920两个目标尺寸）。该指标是DOM可见性变化，**不是首次绘制、输入设备延迟或帧率**；本轮有数毫秒变化，不能写成零影响。driver点击耗时仍约2秒，包含自动等待。

初版矩阵只采样总览/研究，遗漏复盘组合；native zoom与CDP viewport同时除法造成重复缩放；窄窗口截图标题与当时页面/主题不符。`body.scrollWidth`取整1367而`innerWidth`1366导致小于1px的误报；主代理实际定位到原生CSS宽1366.605、document.scrollWidth1366、总览内容正常。最终脚本比较document/clientWidth和实际内容scrollWidth，并使用native content sizing，不能用overflow:hidden掩盖真实问题。

主代理实际查看初版PNG还发现`matrix-journal-light.png`仍是研究页，属于隐藏窗口捕获旧帧；初版图片不作为最终before/after。最终矩阵使用当前page的CDP截图并核对页面、主题及动效状态；图片存在本身不证明画面正确。

初版流图JSON记录present:false，不能把关键帧命名或退出码当流图通过。最终脚本将实际存储的、显式示例partial运行绑定到示例报告，断言真实IPC读取后FlowMap及66%采集进度；这与真实在线研究/实时动画应分别说明。planned=0、集合冲突/外来ID、终态/隐藏/reduced和新旧完成差异另由实际组件与纯函数单测验证。

主代理另外修正：旧不一致结果被纠正时不补播历史动效、报告切换后关闭依据回到当前标题、返回今日正确回总览、资料栏使用同一中文字体/色彩变量、暗色主按钮与表单用直接语义色、新运行终态继续显示、紧凑报告行单行摘要。实现阶段提交 `5a51422`；最终复测在同一AGY会话中进行。

CLI本轮曾返回ERROR500元数据并交付非空报告；主代理依据实际日志和产物评估，不把传输状态当作业务测试结论，也没有静默改用API Key或其他模型。

## 修复后业务回归（已核对保留日志）

源提交 `5a51422cc19749740d5dd8e406330cd73833b7c1`，AGY job `staffer-mupvsxl6-bde62e8f`。主代理从保留的 `final/*.log` 核对以下结果。该 invocation 在后续截图阶段中断并标记 crashed，不能将前面的单项通过扩展成全部验收通过。

| 实际命令 | 核对结果 |
| --- | --- |
| bun run build | 完成；renderer、preload、main 均生成 |
| bun run typecheck | core / i18n / shared / ui / electron 全部 exit0 |
| bun run test:ui | 338 pass / 0 fail；58文件、1136断言 |
| bun run test:unit | 1736 pass / 8 skip / 0 fail；189文件、7581断言 |
| bun run test:desktop | 完整四段链完成：smoke、journal IPC、journal flow、desktop market |

桌面链覆盖真实 renderer/preload/main、13个投资Skill、四个主路由、助手草稿保留、研究开始/取消与持久化、历史报告选择、Windows 文件锁导致写入失败及重试、重启和删除源报告后的独立快照/追加复盘、关注与K线周期及未配置状态的重试入口。行情/LLM 使用 local provider 与明确标注的示例，不能称为本轮在线供应商验收。

8项跳过：7项依赖真实长桥 CLI / 本地账户捕获fixture，1项 Windows 当前权限无法创建符号链接。未读取账户内容，也没有为测试改变系统权限。

截图脚本原来没有给 `Page.captureScreenshot` 设置超时，隐藏窗口在第一张图后停滞。主代理将协议调用限制为15秒、关闭和视频保存分别加上限，改为捕获非surface并逐项落盘；这些是测试采集修正，不修改产品以迁就截图。用户明确要求继续后，仍在同一个AGY会话中补跑未完成项。

## 剩余项初次复测与采集修正

同一会话 job `staffer-muqdjbfg-059af35f`。资料栏压力与Windows包验收通过；主代理核查JSON和实际图片后保留两项失败，继续修正采集。

| 实际命令 | 结果 |
| --- | --- |
| node apps/electron/e2e/frontend-design.mjs | exit1；键盘4项、partial流图通过，第二组组合因隐藏窗口未推进5个有限过渡时钟而中断；图片实际为黑帧，不用作视觉证据 |
| node apps/electron/e2e/frontend-motion.mjs | exit1；fixture位于Electron目录，未解析到UI包的react-i18next，未进入组件断言 |
| node output/frontend-validation/final/evidence-inspector-stress.mjs | exit0；两尺寸各30次、各30/30 DOM样本；failureLogs为空，longtask0，终态running0 |
| bun run test:windows-package（第一次生成的包） | exit0；中文目录解压、隔离profile、13个Skill、金融工具、沙箱、资源路径、本地Agent完成均通过 |
| node apps/electron/e2e/journal-flow.mjs（录屏） | exit0；Windows文件锁失败/重试、重启/删源快照均通过；主代理实际查看录屏12秒处为研究页，非黑帧 |

最终压力测试的renderer DOM均值（打开/关闭）：1366目标6.21/5.92ms，1920目标5.95/5.45ms。旧包同指标5.92/5.70ms与6.80/6.08ms。只支持这批样本的DOM变化对比，不能声称零影响、绘制延迟或60fps。该样本的源是`5a51422`；之后`7a670aa`只调整两条CSS规则，没有重复整个业务套件或此压力采样。

修正方式：矩阵窗口启用Playwright录屏以推进隐藏窗口绘制，继续要求所有有限过渡自然结束，再用有15秒上限的surface截图。没有过滤有限动效、主动finish/cancel或放松running=0断言。主代理用隔离采集诊断得到正确的连续总览/研究两帧，两个页面800ms后running均为空；该诊断不冒充AGY正式验收。实际组件fixture移至`packages/ui/e2e`，从UI包解析依赖。

`7a670aa`补齐总览榜单/操作/11px辅助文字为12px，并让资料栏显式使用本地语义背景和边线。主代理重新构建完成exit0；新版包重新生成后再交AGY验收。测试代码、图片和录屏均不进入生产资源。

## 最终验收与可复现边界

环境：Bun **1.4.0**、Node **24.21.0**、Windows **10.0.26200 x64**、Electron **39.8.9** / Chromium **142.0.7444.265**。AGY保持同一个已登录CLI会话和插件默认模型。业务源由主代理写入，AGY执行实际验收；runtime截图目录由主代理复制。末次AGY还修改了测试采集的isVisible读取，主代理已核对实际diff：只对“garbage collected”协议错误最多重试3次、间隔60ms，其余错误照常抛出，原窗口隐藏断言保留；该可逆测试修正纳入G3，没有修改生产代码。

`staffer-muqe7b46-86d3bbe9`：`frontend-motion.mjs` exit0，7项实际组件检查全部通过，5帧与`flow-motion.webm`已生成。组件直接使用生产ResearchFlowMap，验证最多2条420ms单次WAAPI、partial取消、reduced无实例、真实IntersectionObserver离屏取消、旧冲突结果纠正不补播、全失败不冒充综合成功。它是明确标注的组件fixture，**不是在线研究运行录像**。

同一job最新`bun run test:windows-package` exit0。最终ZIP **141241992 bytes**，SHA256 **84c08335cc65b19713e209910cf76a1e8d6df2246e448971297a746d2edafec6**。它在源码之外的中文目录解压，以新的中文资料目录运行，验证sandbox=true、contextIsolation=true、nodeIntegration=false、13个内置投资Skill、包内扩展/金融工具以及真实local Agent完成。包为既有`0.5.0-beta.1`身份的未签名ZIP；开发Skill不进入资源。

该job矩阵60个DOM组合通过，22图非黑，但主代理发现总览图停留在“加载中”，因此**不接受这些总览图作为正式主视觉证据**。既有TodayView在行情加载后才读取报告，650ms固定等待不足；测试补为等待真实报告列表项，再测量与捕获。不修改产品加载行为，不以测试fixture替换生产数据。最后只重跑这个受影响的矩阵，并用与旧基线同一脚本、fixture和默认窗口生成三页可比较截图。

| 原生内容目标 / 应用zoom | 实测CSS视口 | devicePixelRatio |
| --- | --- | --- |
| 1366×768 / 1 | 1367×769 | 1.3625 |
| 1920×1080 / 1 | 1921×1081 | 1.3625 |
| 窄窗口请求800×768 / 1 | 901×771，受原生minWidth900限制 | 1.3625 |
| 1366×768 / 1.25 | 1094×615 | 1.703125 |
| 1366×768 / 1.5 | 911×514 | 2.04375 |

矩阵是5尺寸×3页×2主题×normal/reduced共60组合，使用实际原生content sizing及zoom，不再用CDP重复除宽高；检查document/clientWidth与内容scrollWidth、终态running=0。CDP platform fonts实际返回中文 **Microsoft YaHei** 和数字 **Consolas**，均为系统字体。键盘4项：打开/ESC还原触发点、切换报告后回当前标题、返回总览、目录在实际阅读容器滚动并聚焦；没有宣称每个旧表单的全部Tab路径都手工重测。

体积使用同一种算法：**Node24.21 zlib gzipSync，level6**。旧JS 412652 bytes；当前`apps/electron/dist/renderer/assets/index-DQD8Hcyx.js` raw1458391 / gzip416415 bytes，增量 **3763 bytes**。AGY末次报告的419059使用了另一种压缩计算，与基线不可直接比较，原报告保留，复核值另存`renderer-assets-comparable.json`。新增动画运行时0项；主图3030 bytes。

复现：先`bun run build`；业务套件为`bun run typecheck`、`bun run test:ui`、`bun run test:unit`、`bun run test:desktop`。新视觉/组件验证分别`node apps/electron/e2e/frontend-design.mjs`、`node apps/electron/e2e/frontend-motion.mjs`。Windows包先生成ZIP，再设置`FINAGENT_TEST_ARCHIVE`并运行`bun run test:windows-package`。所有测试只使用freshProfile和明确示例，输出在忽略的output目录。

未覆盖：本轮未再调用在线DeepSeek或账户行情；未改变Windows系统125%/150%显示设置（这里只测应用native zoom）；没有设备输入到首帧、帧率或GPU能耗测量；真实最小化取消由document.hidden单测覆盖，未把组件fixture当作全套OS窗口事件验收。7个依赖真实CLI/account fixture的测试和1个符号链接测试仍跳过。没有“生产验收100%/零告警”结论：构建存在既有chunk大小及package description/author提示，AGY传输曾有ERROR500元数据。

交付包位于本机`dist/electron-frontend-skills`，新入口`output/启动 Folio 新界面.cmd`只沿用旧入口的Longbridge PATH、pi-runtime及`output/Folio`用户目录，没有写入/覆盖密钥与模型设置。需先退出旧Folio窗口，再用新入口，以免同一资料目录的single-instance锁将启动转回旧窗口。

### 最后加载态复核

job `staffer-muqeo6ex-33bdbd39`：加载后矩阵exit0，60组合、22图、4项键盘和partial流图均通过；原生窗口隐藏读取遇GC协议错误的早期尝试失败已保留，最后只重试相关读取且原断言不变。`desktop-showcase.mjs` exit0，得到3张与升级前同脚本/fixture/默认窗口的对照图。主代理实际查看最终总览（主图与两份报告已加载）、研究/依据、复盘，以及窄窗口图，均与文件名对应。正式证据见[gallery.md](gallery.md)，viewport.json保留完整60行及真实字体字段。

录屏已经实际抽帧核验：journal 27秒处有真实磁盘保存失败且输入仍在，30秒处一条追加及“复盘已保存”；flow组件视频1秒处为实际生产组件；依据片段15.6秒处为真实检视栏。视频为本机隐藏窗口录屏和无重编码的片段，不宣称画面帧率或输入到绘制延迟。
