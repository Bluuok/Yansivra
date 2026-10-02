# 素材清单

| 路径 | 来源 / 分发 | 用途 | 体积 |
| --- | --- | --- | --- |
| packages/ui/src/assets/research-archive.svg | 本次原创代码原生插画，无第三方图片；随项目分发 | 总览唯一装饰主图，aria-hidden，静态 | 3030 bytes；SHA256 见最终验证记录 |
| 系统 Microsoft YaHei / PingFang SC / Noto Sans CJK SC | 用户系统已有字体，只引用，不重新分发 | 中文标题/正文 | 下载/打包新增 0 bytes |
| 系统 Consolas / ui-monospace | 用户系统已有字体，只引用，不重新分发 | 金额/数值 | 新增 0 bytes |
| docs/frontend-upgrade/screenshots/static/*.png | 隔离开发样稿 screenshot，全部显式示例数据 | 开发证据，不进入renderer资源包 | 12张，同一实际CSS视口1367×769；原生窗口取整，motion状态在viewport.json |
| docs/frontend-upgrade/screenshots/runtime/*.png | 实际生产Electron renderer/preload/main，隔离示例profile；组件帧另标fixture | 业务与视觉验收，明暗/reduced及前后对照 | 具体尺寸和状态见viewport.json及gallery.md，不进入应用包 |
| docs/frontend-upgrade/videos/*.webm | Playwright本机录屏；journal为真实IPC，flow为生产组件fixture | 依据、写失败/重试和有限动效证据 | 不含账户或在线行情/模型，不作为帧率测量 |

本次不下载文章图片，无CDN、无商业素材、无图片生成调用。用户要求若后续需生成图片，先提供提示词由用户完成；当前SVG无需位图。

主图 SHA256：82a8f10ab2302ed8fc62ad64efc4402f796abcc22ad25111b37c7abe6ce5b566。静态窗口目标1366×768，Windows原生像素取整后的实际CSS视口1367×769（以viewport.json为准）。
