# 素材清单

| 路径 | 来源 / 分发 | 用途 | 体积 |
| --- | --- | --- | --- |
| packages/ui/src/assets/research-archive.svg | 本次原创代码原生插画，无第三方图片；随项目分发 | 总览唯一装饰主图，aria-hidden，静态 | 3030 bytes；SHA256 见最终验证记录 |
| 系统 Microsoft YaHei / PingFang SC / Noto Sans CJK SC | 用户系统已有字体，只引用，不重新分发 | 中文标题/正文 | 下载/打包新增 0 bytes |
| 系统 Consolas / ui-monospace | 用户系统已有字体，只引用，不重新分发 | 金额/数值 | 新增 0 bytes |
| docs/frontend-upgrade/screenshots/static/viewport.json | 旧开发样稿的视口记录 | 旧品牌样稿图片已清理，只保留尺寸记录 | 不作为当前产品截图 |

本次不下载文章图片，无CDN、无商业素材、无图片生成调用。用户要求若后续需生成图片，先提供提示词由用户完成；当前SVG无需位图。

主图 SHA256：82a8f10ab2302ed8fc62ad64efc4402f796abcc22ad25111b37c7abe6ce5b566。静态窗口目标1366×768，Windows原生像素取整后的实际CSS视口1367×769（以viewport.json为准）。
