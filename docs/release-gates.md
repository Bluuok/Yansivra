# Yansivra V4 — Release Gates

Release pipeline: `internal` → `beta` → `stable`. V4 ships the first **Beta**
candidate. `bun run release:check` enforces the automated subset of these gates
before a tag may be cut; the interaction, live-provider, privacy and signing
checks described below require separate verification. The automatic release CI
job is currently disabled. A build that fails any applicable gate is
`NOT RELEASEABLE` and must be labeled as an internal/unsigned build (spec §38–40).

## Hard release blockers (any present → not Beta-ready, spec §64)

1. Portfolio corruption / garbled data (parser expecting wrong CLI shape,
   unnormalized numerics, raw vendor output in UI)
2. Skills interactions broken (click → nothing, silent IPC failures)
3. Onboarding cannot complete (clean install, no repo, no .env)
4. Provider cannot reconnect after disconnect/expiry
5. Secrets in logs, bundles, or diagnostics exports
6. White screen (uncaught renderer error outside an error boundary)
7. Packaged resources missing (skills, pi extension, renderer assets)
8. Provider status inaccurate (claims connected while auth broken)
9. Critical action silently fails (no feedback, no error)
10. `bun test`, `bun run typecheck`, or packaged smoke red

## Test pyramid (spec §59–67)

Tests are organized in four levels; each level gates the next. Subagents,
the Lead, and the release pipeline each run exactly the levels their role
requires (see rules below). All levels must be green before a release tag.

### LEVEL 1 — Unit (per-package, in the working tree)

| What | Command |
|---|---|
| Unit/integration tests in one package | `bun test packages/<pkg>` |
| Typecheck one package | `bunx tsc --noEmit` (cwd = package) |

- Runs on every iteration while a package is being changed.
- **Subagent rule (spec §65):** a subagent runs ONLY `bun test packages/<pkg>`
  and `bunx tsc --noEmit` inside its own touched packages. NEVER repo-wide
  gates, NEVER launches Electron/Yansivra, no formatters/linters.
- Whole-repo variant: `bun run test:unit`.

### LEVEL 2 — Integration (repo-wide, in the working tree)

| What | Command |
|---|---|
| Repo-wide unit/integration | `bun run test:unit` |
| Repo-wide typecheck | `bun run typecheck` |
| UI component tests | `bun run test:ui` (`bun test packages/ui`) |

- `bun run test:integration` = test + typecheck in one command.
- **Lead/CI rule (spec §66):** the Lead runs LEVEL 2 + LEVEL 3 after merging;
  nothing below that is a release gate by itself.

### LEVEL 3 — Hidden Electron E2E (real app, window never shown)

| What | Command |
|---|---|
| Golden path A–H | `bun run test:e2e` |
| Interaction contract sweep | `cd apps/electron && bun run test:interactions` |
| Skills interactions | `cd apps/electron && bun run test:skills-interactions` |
| Packaged app smoke | `bun run test:package-smoke` |
| Fresh-install onboarding | `cd apps/electron && bun run test:fresh-install` |

- Every harness launches the real Electron app **hidden**: it sets
  `FINAGENT_E2E=1` and `FINAGENT_E2E_HIDDEN=1` in the spawn env.
- **Hidden mode is real, not simulated (spec §61):** `FINAGENT_E2E_HIDDEN=1`
  only sets `show: false` on the BrowserWindow (see `createWindow` in
  apps/electron/src/main/index.ts). The window is still created, the renderer
  loads and runs, and `--remote-debugging-port` keeps exposing it to CDP — the
  full DOM + IPC surface is exercisable while nothing appears on the desktop.
- The updated golden-path/V5 runners use dynamic CDP ports and temporary
  profiles, and stop only the child they own. Playwright owns the lifecycle in
  packaged smoke and fresh onboarding. No broad process-name/port kill is used there.

### LEVEL 4 — Visible / Release (manual debugging + release gates)

| What | Command |
|---|---|
| Visible E2E (manual debugging) | `bun run test:e2e:visible` |
| Release gate suite | `bun run test:release` → `bun run release:check` |

- `FINAGENT_E2E_VISIBLE=1` forces the window on for manual debugging only;
  it takes precedence over `FINAGENT_E2E_HIDDEN=1`. Automated runs must stay
  hidden.
- `release:check` already includes native packaging, packaged smoke and
  fresh onboarding; do not repeat those gates. Windows uses the unpacked EXE
  and ZIP; macOS uses the app and DMG. Public release also requires the online
  business, licensing and signing checks below.

### E2E flag contract

| Flag | Set by | Effect |
|---|---|---|
| `FINAGENT_E2E=1` | every harness (spawn env) | Marks the process as an E2E harness run. Contract: main-process code MAY use it to distinguish test runs from real usage; today it carries no behavioral effect — hidden/visible is controlled by the two flags below. |
| `FINAGENT_E2E_HIDDEN=1` | every harness (spawn env) | BrowserWindow created with `show: false` — renderer + CDP fully functional, nothing on screen. Default for all automated harnesses. |
| `FINAGENT_E2E_VISIBLE=1` | manual debugging only | Forces the window visible even with `FINAGENT_E2E_HIDDEN=1` (visible = `VISIBLE==='1' || HIDDEN!=='1'`). Never set by automated runs. |
| `FINAGENT_E2E_KEEP_OPEN=1` | debugging only | Harness does NOT kill the app when it finishes; it prints `KEEP_OPEN` + the CDP port and leaves the app running so you can attach. **NEVER set in automated runs or CI** (see caveat). |

### KEEP_OPEN caveat (spec §63)

`FINAGENT_E2E_KEEP_OPEN=1` is for manual debugging only. Golden-path/V5
runners print the owned PID/CDP port and retain that instance. Automated
runs must leave it off; `release:check` explicitly sets `0`. Clean up only
the confirmed PID of your own test instance, avoiding other applications.

## Quality gates (run repeatedly, never only at the end, spec §69)

| Gate | Command | Required |
|---|---|---|
| Unit/integration | `bun run test:unit` | 0 fail |
| Typecheck | `bun run typecheck` | clean |
| Build | `bun run build`, then `bun run build:extension` in `apps/electron` | renderer, preload, main and both extensions built |
| Electron E2E | `bun run test:e2e` | golden path A–H green |
| Packaged smoke | `bun run test:package-smoke` | green (from outside repo) |
| Offline fresh onboarding | `bun run test:fresh-install` in `apps/electron` | clean profile, disclaimers, AI skip, workbench and restart persistence; full online flow is separate |
| Interaction audit | Playwright button-contract suite | every control: behavior OR disabled OR removed |
| Provider smoke | connect Longbridge → status accurate → quote/kline/news/portfolio via router | green |
| Secret scan | no keys/tokens in artifacts or bundle | clean |

## Beta release gate (spec §70 final acceptance)

Simulate a real new user — no git repo, no `.env`, no terminal:

1. Install Beta → Welcome → accept privacy/disclaimer (one-time)
2. Connect AI (provider + credential + model + test)
3. Connect Longbridge (in-app flow; no shell)
4. Connection test passes; capability matrix shows real coverage
5. Health check: AI ✓ Market Data ✓ Skills ✓ Agent Runtime ✓
6. Enter Today → open NVDA → quote/chart render with freshness info
7. Deep Research → evidence report → save thesis
8. Portfolio renders: numbers, names (unicode), currencies, PnL — no NaN/
   undefined/[object Object]
9. Skills: disable Technical → state changes immediately → re-enable →
   state changes immediately → open detail → all controls functional
10. Quit → relaunch: connections, portfolio, skills, sessions, research,
    thesis all preserved

## Release channel / versioning

- SemVer in root `package.json` + `apps/electron/package.json`
- Channel in `apps/electron/package.json` (`yansivra.channel`):
  `internal` | `beta` | `stable`
- About view shows version + build (git SHA) + channel
- Local `release:package` stages the current version ZIP (Windows) or DMG (macOS) plus SHA256SUMS.txt in `dist/release`.
- The GitHub Release workflow is disabled; tags/manual dispatch do not authorize uploading or publishing.

## Signing and validation scope

- The current Windows ZIP is unsigned and is not declared ready for public distribution. macOS signing/notarization needs separate setup and real verification.
- Public beta/stable distribution still requires licensing, each target platform's signing requirements and the full online business flow.
- `release:check` stops at the first failed gate and uses `--isolate` for Bun tests. Build and extension gates run once; packaging consumes those outputs, and Node crypto writes checksums.
- Golden-path A–H and V5 still depend on real financial data; a local Agent is not proof of offline execution. Set `FINAGENT_AGENT_PROVIDER=local` in the process environment first.
- `test:desktop`, packaged smoke and fresh onboarding use isolated profiles/credentials. Their offline results do not validate Longbridge, external Pi, paid models or live research.
- Interaction audits, provider smoke and artifact secret review remain acceptance requirements above; `release:check` does not automatically run those independent checks. Older interaction/visual audit entries retain platform and UI prerequisites that require separate verification.
- Local builds do not publish. Passing local gates does not establish licensing, signing or full Beta readiness.
