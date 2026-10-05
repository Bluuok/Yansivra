# Yansivra：Windows x64

当前版本 `0.5.0-beta.1`，首版交付目录/ZIP。没有安装器、签名、自动更新或公共 Release 上传步骤。

## 构建

```powershell
bun install
bun run package:windows
bun run test:windows-package
```

输出：`dist/electron/win-unpacked/Yansivra.exe` 和 `dist/electron/Yansivra-0.5.0-beta.1-win-x64.zip`。必须完整解压后运行；renderer、preload、main 位于 `resources/app.asar`，技能和两个扩展 bundle 在 `resources/skills`、`resources/extensions`。

Windows `afterPack` 会移除自定义 Electron 发行目录遗留的 `resources/default_app.asar`，确保启动 Yansivra，而不是 Electron 默认页面；ZIP 验收检查该文件不存在。

Windows `resources` 与 macOS `Resources` 使用同一资源定位逻辑，必须同时满足真实资源目录与 packaged 标志。启动不依赖当前工作目录或开发服务器。

本机基线的签名工具包解压被 macOS 软链接权限阻断。此未签名目录/ZIP 配置使用 builder 支持的 `signAndEditExecutable: false`，跳过签名和 EXE 元数据编辑；应用窗口显示 Yansivra 图标，Explorer 的可执行文件图标/属性仍可能保留 Electron。没有变更宿主开发者模式、系统权限或全局配置。

## 运行与数据兼容

运行解压目录中的 `Yansivra.exe`。Electron 运行环境在包内；行情 CLI、Pi 外部运行时及模型账户不在包内。普通使用不要求管理员权限。

- 显示品牌：Yansivra；窗口和关于页版本为 `0.5.0-beta.1`。
- 应用 ID 保留 `com.finagent.app`。
- Windows 默认已打包数据目录为 `%APPDATA%\Yansivra`。首次升级会从旧目录复制资料，再升级结构化记录中的品牌标识；原目录保留为备份。
- 开发模式的数据目录沿用原行为；测试使用独立 `FINAGENT_USER_DATA_DIR`。
- 判断记录存于该 profile 的 `journal/entries.json`；研究、会话、评测及偏好一并保留。加密凭据原样复制，不解密、不改写。
- 已有新目录不会被覆盖或合并。转换失败不会发布半成品目录，原资料仍可恢复；未完成的暂存副本留待排查。
- 页面首次加载会将旧主题、导航及引导偏好键升级为 `yansivra.*`，优先保留已有新键值。内部包名、环境变量及应用 ID 保持兼容。
- 自定义 `FINAGENT_USER_DATA_DIR` 直接使用指定资料目录，不自动猜测其他位置。关闭应用后可执行 `bun scripts/upgrade-profile.ts <旧目录> <新目录>`，成功后再更新启动入口；目标必须是独立的新目录。

未签名产物可能出现系统提示。本轮没有验证签名、安装/卸载、自动更新或多显示器 DPI 切换。

## 实际验收方法

`e2e/windows-package.mjs` 将 ZIP 解压到系统临时目录的中文/空格路径，从该目录外的独立临时 profile 启动真实包。检查 `app.isPackaged`、版本、生产页面、IPC、安全选项、包内技能、扩展路径、金融工具及确定性本地 Agent 完成状态。保留临时测试文件便于复核，不删除用户资料。

`e2e/journal-ipc.mjs` 和 `e2e/journal-flow.mjs` 验证旧报告 ID、关闭重开、源报告删除、追加复盘、并发和重复请求；界面脚本使用 Windows 文件共享句柄实际阻止落盘，解除后同一请求成功重试。

`e2e/desktop-smoke.mjs` 检查主导航、原论点入口、助手草稿、研究启动/取消，以及 1366×768、1920×1080 和 Electron 125%/150% zoom。内容缩放不等于操作系统 DPI 设置切换。

日志位于忽略的 `output/`，真实通过项及未验证层见 [验证记录](desktop-validation.md)。本机已补充验证长桥财务、新闻等数据与 Massive 备用日线进入完整 DeepSeek Flash 研究报告，以及判断、复盘和重启持久化。券商持仓和现金读取仍被服务端拒绝。本地 provider 是确定性测试路径。

## 连接配置

用户可以在“设置 → 连接”中切换主源和备用源。Massive 实时快照请求被拒绝时，报价改用实际最近两个日线收盘价计算涨跌，并保留延迟标记。

授权后会同时出现 Longbridge（行情、财务与新闻）和 Longbridge Account（持仓与现金），两者共用长桥登录。Massive 的“配置”按钮用于修改 API Key 和端点，已连接时无需再次填写。登录成功不代表已有可读取的券商账户；空账户信息不会显示为 `null` 或“投资组合 ✓”。

长桥注册完成后，在 Yansivra 的“设置 → 连接”中找到 Longbridge，点击“连接”或“重新连接”，在浏览器中由账户本人完成授权。如果账户提示未启用，可先在官方[开发者中心](https://open.longbridge.com/docs/qa/general)按说明启用模拟账户。账户实际权限以连接后的请求结果为准，注册本身不代表已经授权 Yansivra。
