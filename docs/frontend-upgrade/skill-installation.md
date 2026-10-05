# 开发技能安装记录

2026-10-02，工作区 `E:/zzzz/yansivra`。这两个技能只在 `.agents/skills` 中使用，受 `.gitignore` 排除；不放入投资 `skills/`，不进入 Electron extraResources，不改变全局代理路由。当前执行者已直接阅读技能文件；安装器所说的重启仅用于后续自动发现。

| 技能 | 官方来源和固定版本 | 本地 SKILL.md SHA256 | 许可 |
| --- | --- | --- | --- |
| frontend-design | anthropics/skills @ 8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4 | d91970639e9f5c37682ac7ab60094d35f1c7c1f38d731bd56396563aee10c1d3 | Apache-2.0，保留 LICENSE.txt |
| ui-ux-pro-max | 官方 README 指定的 ui-ux-pro-max-cli @ 2.15.0，bundled template | 5905a2b470ca86077daf03f3c13361b949a702ae9f98399515abc55882cb9aa3 | MIT，补存官方仓库 09170eec67eefd46a7ae85de61b40c194020f997 的 LICENSE |

UIUX search.py SHA256：`8373e2dd2d560d9853ec116140de0e0d5bee45a6abe5e041173c84e1c36a7f87`。
CLI npm integrity：`sha512-D0J/C40xrzzi5si6ZLtRGbEE5v3QjL7d4wJNnasmP3yfDSrGiuqVCdwQiqCNnIkbqOuVoA/uonR2o1WKXh3urw==`。官方 README 的 `--dry-run` 在该发行版实际报 unknown option；先查 `init --help`，再安装，没有使用 force/global。

```powershell
python <codex-skill-installer>/scripts/install-skill-from-github.py --repo anthropics/skills --ref 8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4 --path skills/frontend-design --dest E:/zzzz/yansivra/.agents/skills
npx --yes ui-ux-pro-max-cli@2.15.0 init --ai universal
```

搜索使用既有 Python 3.12.14、标准库，本机运行，不发送投资数据；输入与结果保存在 search-results。搜索推荐不是项目依赖安装指令。
