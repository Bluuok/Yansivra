# Folio Desk

<p align="center"><img src="packages/ui/src/assets/desk-logo.svg" alt="Folio Desk" width="88" /></p>

English · [简体中文](README.md) · [Upstream Folio](https://github.com/helsome/folio) · [Validation record](docs/desktop-validation.md)

**A local-first desktop workspace for AI investment research and personal review.** Follow a security from market context through research and supporting evidence, record your own reasoning, then revisit its assumptions with later observations.

Desktop version: **0.5.0-beta.1**. Warm white surfaces and ink-blue actions, with green mainly reserved for financial changes. Overview, Research, Review and Assets are the primary routes; watchlists, comparisons, events, alerts and advanced tools remain accessible.

## Product workflow

- **Overview:** recent reports, due judgments awaiting a first review, portfolio context, watchlist activity and events.
- **Market and portfolio:** existing watchlists, charts, statements, news, security comparisons and portfolio risk. Live data requires configured connections; samples and unavailable states remain visible.
- **Deep research:** existing strategies, progress, cancellation/recovery, reports and export. Select a historical report and inspect its generation time and partial completion status.
- **Evidence inspector:** recorded claims, collection times, execution outcomes and missing data. Evidence and the assistant share a side pane; hiding it preserves the assistant draft.
- **Agent and skills:** existing contextual sessions, finance tools, skill readiness, provider settings and evaluation views. External data and models require user configuration.
- **Judgment archive:** your stance, rationale, up to three assumptions and invalidation conditions, and an optional review date. Snapshots bind to the report you are reading, including an older report.
- **Manual review:** append later observations and lessons without rewriting the original judgment. Choose still valid, weakened, invalidated or insufficient data. Snapshots and reviews remain usable after restart or source report deletion.

Saving waits for persistence. Repeated requests are idempotent, and failures preserve input. Review drafts survive page navigation during the current application session; unsaved drafts do not survive restart.

## Screenshots

![Research-first overview](docs/screenshots/desktop-overview.png)

![Historical report and evidence](docs/screenshots/desktop-research.png)

![Judgment and manual review](docs/screenshots/desktop-journal.png)

Captured from real Windows Electron windows. Sample quotes carry badges; research and journal content use explicitly labeled offline acceptance fixtures, not live research results.

## Windows x64

The local artifact is an **unsigned unpacked directory / ZIP**, without an installer or updater:

```text
dist/electron/Folio-Desk-0.5.0-beta.1-win-x64.zip
dist/electron/win-unpacked/Folio Desk.exe
```

Extract the entire ZIP and run `Folio Desk.exe`, keeping its adjacent resource files. This branch contains source and build commands; it does not automatically publish a GitHub Release.

The legacy Folio data directory, `com.finagent.app`, internal package names and environment variables remain compatible. No automatic migration is performed. This unsigned build skips executable metadata editing, so Explorer properties and the executable icon can still identify Electron. The application window uses the new icon. See [Windows notes](docs/desktop-windows.md).

## Development

Install Bun, Node.js and workspace dependencies. Windows dependency installation requires an environment that can create symbolic links.

```powershell
git clone --branch desktop/redevelopment https://github.com/Bluuok/folio.git
cd folio
bun install
bun run dev
```

For deterministic local Agent runs without an external model:

```powershell
$env:FINAGENT_AGENT_PROVIDER = 'local'
bun run dev
```

| Command | Purpose |
| --- | --- |
| `bun run typecheck` | Workspace type checks |
| `bun run build` | Workspace and production desktop build |
| `bun run test:unit` | Isolated unit tests |
| `bun run eval:smoke` | Fixture smoke evaluations |
| `bun run i18n:check` | Locale key and interpolation checks |
| `bun run test:desktop` | Real Electron layout, journal IPC and UI flow |
| `bun run package:windows` | Windows x64 directory and ZIP |
| `bun run test:windows-package` | Launch the extracted ZIP outside source in a path containing spaces and Chinese characters |

Acceptance tests use isolated profiles, hidden windows and the local provider. Exact counts and limits are documented in the [validation record](docs/desktop-validation.md).

## Integration boundaries

Existing Longbridge / Massive data providers and Pi / model configuration remain available. Data CLIs, account access, model credentials and the external Pi runtime are not bundled in the ZIP. Live acceptance passed all 16 financial capabilities, a complete DeepSeek Flash report, judgment/review entry, and persistence after restart. That run used Longbridge data with a delayed Massive daily quote fallback because the Longbridge quote lacked its market timestamp. Earlier external timeouts correctly produced partial reports. Brokerage portfolio access remains denied by the provider; see the [validation record](docs/desktop-validation.md).

Archived judgments and manual reviews require neither market nor model calls. The current release does not add PDF page navigation, scheduled reassessment, full-text search or trading. Evidence shows only fields retained by the report.

## Upstream and scope

Based on [helsome/folio](https://github.com/helsome/folio) and existing local contributions. This redevelopment covers desktop presentation/navigation, the journal service, report/review integration and Windows packaging validation. Existing market, Agent, research, portfolio, thesis, alerts and evaluation features are upstream capabilities; describing the complete product does not imply sole authorship.

Existing copyright and third-party notices are retained. The upstream baseline has no standard root LICENSE; this branch does not assign it a new MIT/Apache license. Confirm applicable authorization before further distribution.

[Scope](docs/desktop-redevelopment.md) · [Validation](docs/desktop-validation.md) · [Windows](docs/desktop-windows.md) · [Architecture](docs/architecture.md) · [Contributing](CONTRIBUTING.md)
