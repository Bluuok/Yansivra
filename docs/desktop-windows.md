# Folio Desk：Windows x64

当前版本 `0.5.0-beta.1`，首版交付目录/ZIP。没有安装器、签名、自动更新或公共 Release 上传步骤。

## 构建

```powershell
bun install
bun run package:windows
bun run test:windows-package
```

输出：`dist/electron/win-unpacked/Folio Desk.exe` 和 `dist/electron/Folio-Desk-0.5.0-beta.1-win-x64.zip`。必须完整解压后运行；renderer、preload、main 位于 `resources/app.asar`，技能和两个扩展 bundle 在 `resources/skills`、`resources/extensions`。

Windows `afterPack` 会移除自定义 Electron 发行目录遗留的 `resources/default_app.asar`，确保启动 Folio，而不是 Electron 默认页面；ZIP 验收检查该文件不存在。

Windows `resources` 与 macOS `Resources` 使用同一资源定位逻辑，必须同时满足真实资源目录与 packaged 标志。启动不依赖当前工作目录或开发服务器。

本机基线的签名工具包解压被 macOS 软链接权限阻断。此未签名目录/ZIP 配置使用 builder 支持的 `signAndEditExecutable: false`，跳过签名和 EXE 元数据编辑；应用窗口显示 Folio Desk 图标，Explorer 的可执行文件图标/属性仍可能保留 Electron。没有变更宿主开发者模式、系统权限或全局配置。

## 运行与数据兼容

运行解压目录中的 `Folio Desk.exe`。Electron 运行环境在包内；行情 CLI、Pi 外部运行时及模型账户不在包内。普通使用不要求管理员权限。

- 显示品牌：Folio Desk；窗口和关于页版本为 `0.5.0-beta.1`。
- 应用 ID 保留 `com.finagent.app`。
- Windows 默认已打包数据目录固定为 `%APPDATA%\Folio`，避免更改 `productName` 后产生新空 profile。
- 开发模式的数据目录沿用原行为；测试使用独立 `FINAGENT_USER_DATA_DIR`。
- 判断记录存于该 profile 的 `journal/entries.json`；已有研究、会话、配置等路径不迁移。
- 内部包名、环境变量和配置键保留兼容。

未签名产物可能出现系统提示。本轮没有验证签名、安装/卸载、自动更新或多显示器 DPI 切换。

## 实际验收方法

`e2e/windows-package.mjs` 将 ZIP 解压到系统临时目录的中文/空格路径，从该目录外的独立临时 profile 启动真实包。检查 `app.isPackaged`、版本、生产页面、IPC、安全选项、包内技能、扩展路径、金融工具及确定性本地 Agent 完成状态。保留临时测试文件便于复核，不删除用户资料。

`e2e/journal-ipc.mjs` 和 `e2e/journal-flow.mjs` 验证旧报告 ID、关闭重开、源报告删除、追加复盘、并发和重复请求；界面脚本使用 Windows 文件共享句柄实际阻止落盘，解除后同一请求成功重试。

`e2e/desktop-smoke.mjs` 检查主导航、原论点入口、助手草稿、研究启动/取消，以及 1366×768、1920×1080 和 Electron 125%/150% zoom。内容缩放不等于操作系统 DPI 设置切换。

日志位于忽略的 `output/`，真实通过项及未验证层见 [验证记录](desktop-validation.md)。本机已补充验证 Massive 真实日线与公司资料、Pi 与官方 DeepSeek Flash 的研究报告、判断、复盘和重启持久化；长桥完整财务、新闻与券商账户数据仍未验证。本地 provider 是确定性测试路径。

## 本机已配置的运行入口

双击 `output/启动 Folio.cmd`，使用 `output/Folio` 中已加密保存的账户配置、独立 Pi 配置目录和 `deepseek-flash`。启动入口还将本机安装的官方 Longbridge CLI `0.28.7` 加入该进程的 PATH；没有修改全局 PATH。这个入口、CLI 和凭据被 Git 忽略，不包含在公共 ZIP 中。

Massive 已设为主数据源，免费套餐的实时快照请求被拒绝时，报价改用实际最近两个日线收盘价计算涨跌，并保留延迟标记。没有购买套餐或充值。

长桥注册完成后，在 Folio 的“设置 → 连接”中找到 Longbridge，点击“连接”或“重新连接”，在浏览器中由账户本人完成授权。如果账户提示未启用，可先在官方[开发者中心](https://open.longbridge.com/docs/qa/general)按说明启用模拟账户。账户实际权限以连接后的请求结果为准，注册本身不代表已经授权 Folio。
