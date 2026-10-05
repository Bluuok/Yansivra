# Yansivra：Skills 安装与执行手册

> 服务于[统一前端方案](README.md)。这些是后续开发执行步骤，不是本次已经替用户完成的安装、设计搜索或页面实现。
> 区分：文章原文推荐；2026-10-01 查询到的官方使用方式；本项目规定的执行分工。

## 1. 到底需要哪几个

原文「方法 5」只介绍 frontend-design 和 UI UX Pro Max 两个 Skill。下面不是“五个必须安装的 Skill”，也不是全部必须新增的项目依赖。[A]

| 项目 | 类型 | 本轮用途与要求 |
| --- | --- | --- |
| `frontend-design` | Anthropic 的开发 Skill | 作为本轮设计/实现工作流的一环。先读实际 SKILL.md，提出有主题依据的构图、排版和一次自评，不是装完就自动变好看。 |
| `ui-ux-pro-max` | 可执行本地设计搜索的开发 Skill | 作为本轮规范与 UX 检索环节。按实际技术栈查询，保留输出及采用/拒绝理由，不把通用 SaaS 建议直接当定稿。 |
| OpenDesign / Stitch / Figma 等 | 设计工具；有些环境封装为 Skill/MCP | 已有工具可选用来制作静态稿；不用为本轮全装，也不能拿它替代前述两个 Skill 后声称完成了文章工作流。 |
| Context7 或官方文档读取 | 文档检索工具 | 可选。查当前组件与 API；没有 Context7 时直接读取官方文档即可。 |
| Magic UI / Aceternity UI / Motion | 组件源码或运行时依赖 | 按统一方案选择少量组件后才决定安装；不是 Skill，也不因为文章提到了就整库装入。 |
| `AGENTS.md` | 项目指令文件 | 用来固化经产品适配的前端约束，不是软件安装包；本 PR 提供模板，不覆盖现有全局配置。 |

两个开发 Skill 应位于 Codex/Claude 的开发配置中。**不要放进 Yansivra 的投资技能目录 `skills/`，不要加入 SkillHub，不要打包到 Electron。** 用户最终运行桌面应用不需要安装这些设计 Skill。

## 2. 先检查现有安装

在实际负责实现的本地 Codex 会话中检查：Skill 列表是否可见；同名 Skill 实际路径；SKILL.md 是否可读取；UI UX Pro Max 的 scripts、data、references 是否完整；Python 是否可运行；来源及版本是否可确认。

本次无法从网页端确认用户本地安装状态，因此不能说“你已经装好了”。复用已存在且完整的版本，不同时在用户级、项目级复制多个同名入口，也不覆盖用户的全局 AGENTS.md、模型配置或已有 Skills。

当前 Codex 官方文档将仓库的 `.agents/skills` 与用户的 `$HOME/.agents/skills` 列为本地发现位置；同名 Skill 不会自动合并。它也支持使用内置 `$skill-installer` 从其他仓库安装。以下按当前官方方式编写，不把文章中的 Claude `/plugin` 命令拿来当 PowerShell/Codex 命令。[D1]

### 2.1 frontend-design：使用 Codex 的安装器

在 Codex 对话中发送以下安装请求，而不是在 Windows 终端执行：

```text
使用 $skill-installer，从
https://github.com/anthropics/skills/tree/main/skills/frontend-design
安装 frontend-design。先检查是否已有同名 Skill；有则读取并复用，不重复覆盖。
保留 LICENSE.txt 和该目录的必需资源，不安装整个 example-skills 集合。
完成后报告实际发现路径，并确认当前会话能读取它的 SKILL.md。
不要改全局 AGENTS.md、模型路由或本项目的投资 skills/。
```

安装器不存在或下载失败时如实报告该步骤失败；不要仅创建一个名字相同的空壳 SKILL.md 充数。手动安装也必须来自同一官方目录，保留资源和许可。若新 Skill 没有出现在当前会话，按实际客户端提示刷新或重启。[D1][D2]

### 2.2 UI UX Pro Max：注意原文与当前命令不同

文章原文写的是：

```text
npm install -g uipro-cli
uipro init --ai cursor
```

这是原文的 Cursor 示例，不是本文推荐照抄的 Codex 安装步骤。[A，方法5]

当前上游 README 使用 **`ui-ux-pro-max-cli`** 作为 npm 包名，命令仍是 `uipro`，并说明旧 `uipro-cli` 版本已过时；它列出 codex 与 universal 安装目标。为避免依赖旧发现目录，本轮新安装优先选择生成 `.agents/skills/` 的 universal 目标。已有能被 Codex 发现的 codex 安装不必迁移。[D3]

在 **Yansivra 仓库根目录的 PowerShell** 中可按以下步骤预览。此代码是待执行配方，本次未运行：

```powershell
# 先查看官方包元信息并取得确切版本；不要直接给整个应用升级依赖。
npm view ui-ux-pro-max-cli version repository.url dist.integrity
$version = (npm view ui-ux-pro-max-cli version).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($version)) {
    throw '无法确认 Skill CLI 版本，停止安装。'
}

# 先预览写入位置，检查是否撞上现有 Skills。
npx --yes "ui-ux-pro-max-cli@$version" init --ai universal --dry-run
if ($LASTEXITCODE -ne 0) { throw 'Skill 安装预览失败。' }

# 确认预览没有覆盖现有配置后，再单独执行这一行。
npx --yes "ui-ux-pro-max-cli@$version" init --ai universal
```

选择一次安装目标即可，不同时使用 `--ai all`、`--global` 和多个本地副本。不要自动提权、修改系统设置、重装 Python 或覆盖既有技能。安装成功的标准是能读取真实 SKILL.md 并运行 search.py，而不是终端只显示了一个绿色勾。

需要记录 resolved version、安装目标、实际路径和日志。若安装产物路径不同，以下脚本必须使用实际完整路径，不能假定安装一定写在某个文件夹。

## 3. 两个 Skill 怎么分工

**读取约束 → UI UX Pro Max 检索 → frontend-design 构图与自评 → 静态 Demo → 截图检验 → 接现有状态 → 按需组件 → UX 与业务回归。**

这不是让两个 Skill 各自生成一套完整页面再拼起来。UI UX Pro Max 提供可核验的设计候选及 UX 约束；frontend-design 负责最终视觉判断和具体实现；MASTER 记录唯一的定稿。组件库和设计工具服从这一套决定。[D2][D4]

需要特别提防：暖白背景、衬线标题、报纸式分栏、满页编号也可能成为新的模板。当前 frontend-design 的指导明确要求从实际主题出发，并把表现力集中在关键位置。本轮保持暖白/墨蓝，是为了延续已完成产品；不是把它们包装成某个万能去 AI 味配方。[D2]

## 4. UI UX Pro Max 的具体检索任务

先通过 package.json 确认 Electron/React 18/Radix/Jotai 等当前栈；实现检索使用 react，不默认 nextjs，也不把搜索结果中的 JavaFX/WPF 套到 Electron 上。

以下示例按 universal 安装到项目根目录；实际脚本在别处时，将 `$search` 改为安装回执中的绝对路径。Windows Python 启动器可用时执行：

```powershell
$root = (git rev-parse --show-toplevel).Trim()
$search = Join-Path $root '.agents/skills/ui-ux-pro-max/scripts/search.py'
if (-not (Test-Path -LiteralPath $search)) {
    throw '未找到 search.py；请使用已确认的实际 Skill 路径。'
}
py -3 --version
if ($LASTEXITCODE -ne 0) { throw 'Python 不可用，尚未执行设计检索。' }

# 先查询，不立即覆盖项目设计文件。
py -3 "$search" "investment research desktop" --design-system -p "Yansivra" -f markdown
py -3 "$search" "editorial archival asymmetric" --domain style
py -3 "$search" "Chinese longform reading" --domain typography
py -3 "$search" "rapid animation interrupted" --domain ux
py -3 "$search" "React 18 state preservation" --stack react
```

这些是为 Yansivra 编写的待执行查询，不是声称已经从数据库得到匹配。每个查询保持单一意图；返回空或离题时最多收窄重试一次，仍无匹配就记录“无验证匹配”，不要伪造查询结果、伪造推荐字体或不断改关键词直到凑到想要的答案。[D4]

对图表、表单、键盘焦点、长标签等问题，按实际发现的缺陷另做一个明确 domain 查询，不一开始就加载所有规则或几十个 Skill。搜索中不带用户持仓、API 密钥、报告全文等私有资料。

结果筛选必须回答：是否适合长期阅读的桌面研究环境？是否错误地套用了营销 Hero、开户 CTA 或交易界面？是否与现有暖白/墨蓝及已完成导航冲突？是否提供中文/缩放/暗色适配的可信依据？

可保存的有效结果再使用上游支持的 `--persist --output-dir`；先检查并阅读既有 MASTER，不用 --force。最终 MASTER 应由执行者合并检索结果、用户要求和当前代码约束，而不是原样复制不合适的自动建议。[D4]

## 5. 每个阶段必须留下什么

| 阶段 | 使用方式 | 必要记录 |
| --- | --- | --- |
| 设计方向 | UI UX Pro Max 检索；frontend-design 精简计划与反模板自评 | 真实查询和输出摘要；采用/不采用理由；MASTER；参考板 |
| 总览静态稿 | frontend-design 实现正式素材、主次构图与版式 | 同尺寸前后截图；资源来源、大小、许可与本地路径 |
| 研究与复盘静态稿 | 同一 MASTER 下的页面规则；按需 UX/React 查询 | 历史报告、原判断、依据、长文本、空/错状态的样稿 |
| 动效接入 | 读官方组件源码；必要时 Context7；复用既有 hooks | 组件版本/来源；参数核对；依赖、体积与 cleanup 检查 |
| 验收 | frontend-design 视觉自评；UI UX Pro Max 针对发现的问题查询 | 真实 Electron 截图/录屏、测试命令及结果、未验证边界 |

`skill-run-log.md` 每次记录：阶段、Skill 名称、实际路径/版本、输入、是否执行成功、输出文件、采用/拒绝理由。写“按需调用两个 Skill”但没有输入和输出记录，不算完成。

## 6. 给 Codex 的一次性执行指令

```text
读取 docs/frontend-upgrade/README.md、skills-workflow.md 和
frontend-rules.template.md，以当前 main 为基线实施前端升级，不执行旧 PR #2/#3。
先核验 frontend-design 与 ui-ux-pro-max 的实际可发现路径；缺失按手册安装，
已有则复用。不得声称未执行的 Skill 已运行，不得改 Yansivra 的投资 skills/。
先运行适合 Electron/React 的设计检索，保留输入、真实输出和筛选理由，
由 frontend-design 建立一套 MASTER，做总览、研究、复盘的静态样稿并截图自评。
静态稿达标后，复用现有数据与 IPC 接线，再实现受真实状态驱动的汇聚、
依据联动与成功落档。允许按需使用已核验的 Magic UI/Aceternity 局部组件，
不要整库替换，不要默认复制无限动画或新增多套动画运行时。
不改后端、持久化、行情、凭据、全局模型路由和桌面打包身份。
按主计划分阶段提交；保护历史 reportId、snapshotMode、草稿、防重、失败重试
与 Allotment 常驻。最后提交截图、录屏、实际测试结果及未验证事项。
```

这段指令不代表已经批准系统级安装、读取凭据或覆盖其他项目配置。遇到资源或工具缺失先完成可完成的设计/静态部分，清楚记录阻碍；不能悄悄退回“裸写页面”后仍宣布 Skills 流程完成。

## 来源与验证范围

本次已阅读两个上游 SKILL.md 的可取得内容，并核对官方 README 与 Codex 文档；没有在用户 Windows 或规划环境执行安装、search.py、静态 Demo 或 E2E。安装命令和参数是2026-10-01查询到的方式，后续执行仍需核对实际锁定版本。

[A]: https://ai.codefather.cn/library/2026205153777963010
[D1]: https://developers.openai.com/codex/skills/
[D2]: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
[D3]: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill#installation
[D4]: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md
