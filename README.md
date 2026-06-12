# Claude Usage Widget

An always-on-top desktop widget that shows your Claude usage limits at a
glance — the 5-hour session window, the weekly cap, and Agent SDK credits —
snapped to a corner of your screen. Click to expand into a small dashboard.

**Tracking is free, forever.** The only paid feature ($5/mo) is cosmetic
customization: alternate collapsed widget styles and skins.

Design: **Glass Instrument** — see `design/` handoff bundle (spec board +
README are the source of truth for pixels and timings; deliberate deviations
are commented at the point of change).

## Status

- ✅ **Native menu-bar app (macOS)**: accessory process (no Dock icon), tray
  donut with live %, frameless transparent pill above fullscreen apps,
  deterministic drag with corner snapping (in-app live self-test:
  `CUW_SELFTEST=1`, 9 scenarios, pixel-exact assertions), content-fit window,
  panel-only desktop blur. Windows build via CI (untested by hand).
- ✅ **Live data, no demo values.** Two ToS-compliant local sources:
  1. *Session + weekly %*: a statusline shim (bundled: the app binary itself
     runs as `--statusline`; dev: `scripts/claude-statusline-shim.sh`)
     captures Claude Code's own `rate_limits.{five_hour,seven_day}` payload.
     Registered via `statusLine` in `~/.claude/settings.json`. Never calls
     the banned `/api/oauth/usage` endpoint, never touches the OAuth token.
     Percentages refresh on terminal Claude turns only (the desktop app
     doesn't run statuslines); between turns the last value is shown as an
     honest floor until its window resets, labeled with its sync age.
  2. *Local history / SDK credits / by-app / all-time tokens*: reconstructed
     from `~/.claude/projects/**/*.jsonl` (dedup by requestId, `entrypoint`
     classifies the SDK pool, cost derived from vendored pricing).
- ✅ **Pill model**: every meter you keep (✕ in Edit toggles) rings in the
  collapsed pill; cards always stay in the expanded grid. Default = the
  5-hr session ring.
- ✅ **History**: 14-day chart of real daily tokens from your transcripts
  (populated on first launch) with observed weekly-peak overlay, plus
  Agent-SDK-$ by app.
- ✅ **Ambient insights** (`src/data/insights.ts`, pure + unit-tested):
  cache-read share, dominant-project flag, weekly climb rate on the card,
  SDK pool pace alert ("~empty Jun 19 at this pace"), billing-cycle day in
  the footer, and a one-click weekly digest built to be handed to Claude.
- ✅ **Skills tab**: starter pack of token-saving skills (context diet,
  cache hygiene, model routing, compact discipline, plan-first) exported as
  `.md` for `~/.claude/skills/` — the actionable half of "reduce my usage".
- ✅ **Exportable report**: `~/Documents/claude-usage.md` is a compact
  current-month report (daily token mix, cache-read share, model/project
  splits, pool usage, limit peaks) regenerated in place — built to be sent
  to Claude for token-saving analysis. Auto-resets monthly.
- ✅ **Licensing**: Stripe checkout + Cloudflare Worker email validation
  (`workers/license`), 3-day revalidation, 14-day offline grace. Paid theme
  content lives in a private repo (`src/paid/`, gitignored); public builds
  fall back to Glass + Ring gracefully.
- ⚠️ **Calibration:** the plan→SDK-pool mapping ($10/$50/$200) and the
  $-figures are API-equivalent *estimates* of Anthropic's metering, labeled
  "est." in the UI — validate against real billing.

## Run

```sh
bun install
bun run dev        # browser dev mode at http://127.0.0.1:4733 (demo backdrop)
bun run tauri:dev  # desktop widget shell (needs Rust toolchain)
bun run tauri build  # release .app/.dmg (full build required to re-embed dist/)
```

## Setup: live limit data (one step)

The 5-hr/weekly percentages come from Claude Code's own statusline. Register
the bundled capture shim once:

```sh
./scripts/install.sh   # merges statusLine into ~/.claude/settings.json (backs it up,
                       # chains any statusline you already have), then restart Claude Code
```

After your next Claude turn in a terminal, the widget shows your real
percentages. Until then it shows honest "waiting for first Claude turn"
states — never demo numbers. (SDK credits, History, and the report work
immediately: they read your local transcripts.)

## Building from source vs official downloads

A source build includes the free **Glass** theme and **Ring** style — fully
functional tracking, forever. The paid theme pack (5 skins + 6 collapsed
styles, $5/mo) ships only in official release downloads and unlocks via
license; the Theme tab in a source build shows previews. See
[docs/monetization.md](docs/monetization.md).

## Layout

```
src/
  state/      WidgetState model + reducer + persistence
  theme/      Design tokens (Dark/Light Glass) + auto OS theming + paid-pack loader
  data/       statusline capture parsing, transcript scanner, pricing, formatting
  widget/     Pill, Panel, 5 tabs, SetupCard, drag/snap + in-app self-test
  export/     Monthly usage report generator (~/Documents/claude-usage.md)
  platform/   Tauri window/drag/fs bridges (pure geometry unit-tested)
src-tauri/    Tauri v2 shell: tray, window level, native commands, --statusline mode
workers/      license validation (Cloudflare Worker + Stripe)
```

## Privacy

Everything stays on this device. The usage report (`claude-usage.md`) is
written locally and exported only by explicit user action. License
activation sends only your checkout email to the validation endpoint.
