# Handoff: Claude Usage Limits Widget — "Glass Instrument"

## Overview

An **always-on-top desktop overlay widget** (macOS + Windows) that shows the user's Claude usage limits at a glance and expands into a small dashboard. It floats above ALL windows — other apps, browser tabs, and fullscreen apps — pinned to a screen corner of the user's choice.

Core meters (the product's reason to exist):

1. **5-hour session window** — % of the rolling 5-hour session limit used, + time until it resets.
2. **Weekly limit · all models** — % of the weekly cap used, + time until weekly reset.
3. **Agent SDK credits** — third-party app / Agent SDK API spend in dollars against the plan's monthly credit pool (e.g. $12 of $50), + monthly billing restart date.

All tracking functionality is **free**. The ONLY paid feature ($5/month) is cosmetic customization (alternate collapsed styles, colors, panel structures), gated quietly behind lock icons.

## About the Design Files

The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, **not production code to copy directly**. Your task is to **recreate these designs in the target codebase's environment** (e.g. Tauri/Electron + React, Swift/AppKit, etc.) using its established patterns. If no codebase exists yet, choose the most appropriate stack for a tiny always-on-top cross-platform overlay (small footprint matters; Tauri or native are good defaults) and implement the designs there.

The `.dc.html` file opens directly in a browser (keep `support.js` next to it). The authoritative visual reference is **`Glass Instrument Spec.dc.html`** — a Glass-Instrument-only spec board covering every feature in both themes: §1 all collapsed-pill states, §2 interactive expanded panels (dark + light, all tabs + carousel clickable), §3 feature deep dives (card anatomy, hot rule, edit drag/hidden states, pill ring logic), §4 first-run setup, §5 window behavior / motion / auto-theme, §6 export format & data states.

## Fidelity

**Everything in `Glass Instrument Spec.dc.html` is high-fidelity — build pixel-perfect.** Colors, type, spacing, and timings in this README are final. There are no lo-fi references in this bundle; structure, flow, and visual style are all on the spec board.

---

## Theme System (Light / Dark — automatic)

- Two complete themes: **Dark Glass** and **Light Glass**. Token tables below.
- **Mode is automatic, free, and on by default**: follow the **OS appearance setting** (`prefers-color-scheme` / `NSApp.effectiveAppearance` / Windows `AppsUseLightTheme`). When the OS switches (including OS-scheduled night switching), the widget switches **live**, no restart.
- If the OS has no auto-appearance schedule available, fall back to local-time schedule: Light 07:00–19:00, Dark otherwise.
- Transition between themes: 300 ms crossfade on all color properties (`transition: background-color, color, border-color, box-shadow 300ms ease`). Do not animate blur.
- No manual override in v1 (a manual Light/Dark/Auto toggle may live in the paid Theme tab later — out of scope).

## Design Tokens

### Typography (both themes)

| Token | Value |
|---|---|
| UI font | **Instrument Sans** (Google Fonts), weights 400/500/600/700 |
| Numeric/data font | **JetBrains Mono**, weights 400/600/700 — ALL numerals, %, $, dates, file paths |
| Panel title | 14px / 600 / letter-spacing -0.2px |
| Card label | 10px / 500 / UPPERCASE / letter-spacing 1px |
| Card value | 24px / JetBrains Mono 600 (unit suffix 13px at 40–60% opacity) |
| Card meta ("resets in 1h 48m") | 10.5px / 400 |
| Tab label | 12px / 400 (active: 600) |
| Edit row label | 12px / 400 |
| Footer link / path | 11px / 10px JetBrains Mono |
| Pill % numeral | 13px / JetBrains Mono 600 |

### Dark Glass theme

| Token | Value |
|---|---|
| Panel background | `rgba(24,26,33,0.92)` |
| Panel border | `1px solid rgba(255,255,255,0.12)` |
| Panel effects | `backdrop-filter: blur(20px)`; shadow `0 24px 64px rgba(0,0,0,0.55)`, inset top highlight `inset 0 1px 0 rgba(255,255,255,0.07)` |
| Pill background | `rgba(28,30,38,0.85)`, border `rgba(255,255,255,0.12)`, `blur(12px)`, shadow `0 12px 32px rgba(0,0,0,0.45)` + same inset highlight |
| Card background / border | `rgba(255,255,255,0.05)` / `rgba(255,255,255,0.07)` |
| Tab bar container | `rgba(255,255,255,0.05)` |
| Text primary | `#F0F0EE` |
| Text secondary | `rgba(255,255,255,0.45)` (range .35–.55 per spec below) |
| **Accent (warning/brand)** | `#FF8F6B`; glow `0 0 8–10px rgba(255,143,107,0.35–0.5)` |
| Accent tint surfaces | bg `rgba(255,143,107,0.08)`, border `rgba(255,143,107,0.25)` |
| Neutral meter | `#9BA3B5` |
| OK/green meter | `#6BD9A8` |
| Progress track | `rgba(255,255,255,0.10)` |
| Ring track (unfilled arc) | `rgba(255,255,255,0.10)` |
| Ring hole fill | `#1D1F26` (pill), match card bg inside panel |

### Light Glass theme (glassmorphism)

| Token | Value |
|---|---|
| Panel background | `rgba(255,255,255,0.38)` |
| Panel border | `1px solid rgba(255,255,255,0.70)` |
| Panel effects | `backdrop-filter: blur(28px) saturate(1.6)`; shadow `0 24px 64px rgba(28,30,38,0.25)`, inset `0 1px 0 rgba(255,255,255,0.95)` |
| Pill background | `rgba(255,255,255,0.42)`, border `rgba(255,255,255,0.70)`, `blur(18px) saturate(1.6)`, shadow `0 12px 32px rgba(28,30,38,0.20)` + inset `rgba(255,255,255,0.9)` |
| Card background / border | `rgba(255,255,255,0.50)` / `rgba(255,255,255,0.65)` |
| Tab bar container | `rgba(28,30,38,0.05)` |
| Text primary | `#1C1E26` |
| Text secondary | `rgba(28,30,38,0.45)` (range .35–.55) |
| **Accent fill / accent text** | fill `#E06A43`, text-on-light `#D45A33`; glow `0 0 8px rgba(224,106,67,0.3–0.4)` |
| Accent tint surfaces | bg `rgba(224,106,67,0.07)`, border `rgba(224,106,67,0.30)` |
| Neutral meter | `#7A8294` |
| OK/green meter | `#3FA873` |
| Progress track | `rgba(28,30,38,0.08)` |
| Ring track | `rgba(28,30,38,0.10)` |
| Ring hole fill | `#FBFBFD` |

> Light mode only reads as "glass" when real desktop content shows through. In production the OS-level translucency/vibrancy material provides this (NSVisualEffectView / acrylic). The colored blobs in the mock backdrop are **demo scenery, not part of the widget**.

### Radii & spacing scale

| Token | Value |
|---|---|
| Pill radius | 999px (capsule) |
| Panel radius | 18px |
| Card radius | 12px |
| Edit row radius | 10px |
| Icon button radius | 7px |
| Tab segment radius | 8px (container 10px, padding 3px) |
| Chip radius | 999px |
| Progress bar | height 4px, radius 2px |
| Spacing scale | 3 / 4 / 6 / 9 / 10 / 12 / 14 / 16 px (panel padding 16; grid gap 9; card padding 11) |
| Screen-edge margin | **16px** from both edges of the pinned corner (pill AND panel) |

---

## Screens / Views

### 1. Collapsed pill (default state)

Reference: "Collapsed" column in sections 01 / 01·L.

- Capsule, auto width (~76px with 1 ring), height ≈ 38px. Padding `9px 16px 9px 12px`. Layout: horizontal flex, `gap: 10px`, vertically centered.
- **DEFAULT: exactly ONE ring — the worst enabled meter** (highest %; SDK % = spent/pool), auto-selected and re-evaluated whenever values change. Single auto ring is colored by heat only: neutral token when <75%, accent + glow when ≥75% (meter-type colors do NOT apply in single-ring mode).
- Each ring: 20×20px donut — conic fill from 12 o'clock clockwise = meter %, remainder = ring track token; hole = inner 12px circle (inset 4px) filled with ring-hole token.
- **Multi-ring is opt-in:** every meter row in the Edit tab has a ◎/◉ "show in pill" pin toggle (default: all off). When ≥1 meter is pinned, the pill shows pinned rings only, in row order, max 5 (toggle disabled past 5; spec board §3c). Pinned rings use meter-type colors: session → neutral, weekly → accent, SDK → green; any meter ≥75% additionally gets accent + glow. Unpinning all returns to the single auto ring. Ring add/remove animates pill width 200ms ease-out.
- After the ring(s): the **worst shown meter's %** as numeral (13px JetBrains Mono 600, accent color if that meter is hot, else text primary).
- Hover: border brightens (dark: `rgba(255,255,255,0.25)`; light: `rgba(28,30,38,0.22)`), cursor pointer. Tooltip after 600ms: one line per meter — "Weekly: 81% · resets Thu 9:00am".
- **Click → expand. Drag → move** (see Window behavior). 0 enabled meters: show a single dashed ghost ring + "+" that opens the panel on Edit tab.
- Edge cases: 1 meter = 1 ring + its own %; 5+ meters: cap pill at 5 rings, overflow meters live only in the panel.

### 2. Expanded panel

- **336px wide**, padding 16px, radius 18px. Anchored so the panel's corner coincides with where the pill's corner was (grows INTO the screen from the pinned corner).
- **Expand animation:** 240ms `cubic-bezier(0.32, 0.72, 0, 1)`; transform-origin = pinned corner; scale 0.92→1.0 + opacity 0→1; pill crossfades out 120ms. Collapse: reverse, 200ms. Pressing `Esc` or clicking ✕ collapses; clicking outside the panel also collapses.
- **Header row** (margin-bottom 12): title "Claude usage" (left) + two 24×24 icon buttons (right, gap 6): `⤓` (export — see §7) and `✕` (collapse). Icon buttons: 1px border (dark `rgba(255,255,255,0.14)` / light `rgba(28,30,38,0.12)`), radius 7, hover fills bg `rgba(255,255,255,0.08)` / `rgba(28,30,38,0.05)`.
- **Segmented tab bar** (margin-bottom 14): container = tab-bar token bg, radius 10, padding 3; 4 segments flex-grow equally, centered text, white-space nowrap, radius 8, padding `5px 8px`. Tabs: **"Usage limits" · "History" · "Edit" · "🔒 Theme"** (lock glyph + the word — users must see what's locked before caring). Active segment: bg `rgba(255,143,107,0.16)` dark / `rgba(224,106,67,0.13)` light, accent text, weight 600. Inactive: text secondary. Transition 150ms.
- **Content area: min-height 236px** so tab switches don't change panel height.
- **Footer** (top border `rgba(255,255,255,0.08)` dark / `rgba(28,30,38,0.08)` light; padding-top 10, margin-top 13): left — "⤓ Export .md" text button (11px, secondary, hover accent); right — `→ claude-usage.md · 2m ago` (10px JetBrains Mono, ~30–35% opacity) showing log path + minutes since last write.

### 3. Tab: Usage limits (default tab)

2×2 CSS grid, gap 9px. Card = radius 12, padding 11, card bg/border tokens.

| Card | Label | Value | Bar | Meta |
|---|---|---|---|---|
| 1 — 5-hr session | `5-HR SESSION` | `62%` | neutral fill | `resets in 1h 48m` (live countdown, minute precision) |
| 2 — Weekly (hot variant) | `WEEKLY · ALL` | `81%` in accent | accent fill + glow; card uses accent-tint bg/border **only while ≥75%**, else normal card | `resets Thu · 2d 14h` |
| 3 — SDK credits | `SDK CREDITS` | `$12` + `/50` suffix | green fill, width = spent/pool % | `restarts Jul 3` (from setup's monthly restart day) |
| 4 — All-time tokens (present only if added in Edit) | `ALL-TIME TOKENS` | `1.2B` | none | `since Aug 2024` |

Bars: 4px track + fill, radius 2, sits between value and meta (margins 5/6px). Cards added via Edit append in order; grid wraps to extra rows; if only 3 cards, 4th cell stays empty (no filler).

### 4. Tab: History (carousel, 2 pages)

Header row (margin-bottom 10): `‹` and `›` 22×22 icon buttons flanking a centered page title (11px uppercase ls-1px secondary): page 1 `14-DAY USAGE`, page 2 `SDK $ BY APP`. Below content: two 6px dots, gap 6, centered (active = accent, inactive = `rgba(255,255,255,0.2)` dark / `rgba(28,30,38,0.15)` light), clickable. Arrows wrap around (2 pages). Pages slide horizontally 200ms ease-out. Support horizontal trackpad swipe.

**Page 1 — line chart**, in a card (padding 12): daily peak weekly-limit % for last 14 days. 3 horizontal gridlines (no axis labels); line: accent, 2px, round joins/caps; area fill: vertical gradient accent 35%→0% opacity; last point: 3px radius accent dot. Below chart: date range labels (10px mono secondary), left = start date, right = today. Under the card (margin-top 10, 11px): `peak day: Jun 9 · 94%` and `avg: 52%` (labels secondary, values primary 600).

**Page 2 — SDK $ by app**, in a card (padding 13, rows gap 12): one row per app this billing cycle, sorted desc — name (12px) + dollar amount (JetBrains Mono 600) on one line, 4px bar under (width = share of total; colors top→down: accent, neutral, green; >3 apps: all extra rows neutral, or collapse into "Other apps"). Divider, then total row: `this cycle` (11px secondary) / `$12.00 / $50` (mono, primary).

### 5. Tab: Edit

Interaction logic reference: v2 wireframe Edit tab + v1 §3.

- One row per **available** meter (enabled AND hidden), in current order. Row: radius 10, padding `9px 11px`, flex `gap 9`: `⠿` handle (secondary 30%, cursor grab) + label (12px, flex-1) + `◎/◉` **show-in-pill pin** (12px; off = secondary 35%, on = accent ◉; controls multi-ring mode, see Collapsed pill) + `✕` (11px secondary, hover accent).
- **Drag to reorder** (vertical, 7px gaps): dragged row lifts (shadow `0 8px 24px rgba(0,0,0,0.3)`, scale 1.02), drop slot shown as dashed accent outline. Order applies live to pill rings AND Usage-limits grid.
- **✕ toggles hidden**: row stays listed at 40% opacity with strikethrough label and the ✕ becomes filled (re-click to restore). Hidden meters drop out of pill + grid instantly. Removing the last enabled meter is allowed (pill shows ghost ring).
- **Add chips** below (margin-top 11, wrap, gap 6): dashed 1px border, radius 999, padding `4px 11px`, 11px secondary; hover = accent border+text. v1 chips: `+ all-time tokens`, `+ Opus vs Sonnet` (Opus-vs-Sonnet may ship disabled/“soon”). Clicking adds the stat as an enabled row + grid card; chip flips to `✓ all-time tokens` (solid bg) while added.
- **Locked structures strip** (margin-top 11): row card (bg `rgba(255,255,255,0.03)` dark / `rgba(28,30,38,0.025)` light), text `🔒 Panel structures — list · compact` (11px secondary) + right badge `$5/mo` (10px 700, radius 999, accent-tint bg, accent text). Clicking opens the Theme tab. Not functional pre-purchase.

### 6. Tab: 🔒 Theme (the only paid surface)

Two labeled groups (10px uppercase ls-1px secondary labels), each a 3-col grid, gap 7; cards radius 10, padding `7px 3px 6px`, centered 20px-tall mini-preview + 9.5px caption. Free/selected cards: accent border + accent-tint bg + `✓`; locked cards: normal card tokens at **55% opacity**, caption prefixed `🔒` (always show the name — users must see what's locked):

- **"WIDGET STYLE"** — collapsed form factor (7 options, each aimed at a persona):
  1. **Ring pill — free/default.** 20px donut + worst-%.
  2. `🔒 Naked bars` — three 5px label-less bars (62/81/24%), container radius min(skin radius, 8). For minimalists who still want all meters.
  3. `🔒 Status dot` — a single 12px dot, accent-colored by heat, glow when hot; nothing else. Invisible-until-it-matters.
  4. `🔒 Countdown` — `▷ 1h 48m` — clock glyph (13px, neutral) + time-to-reset of the worst meter (JetBrains Mono 12/600 accent). For deadline thinkers who reason in time, not %.
  5. `🔒 Battery` — battery glyph (26×13px body, 1.5px neutral border, radius 3, 2.5×6px nub) with fill = % REMAINING (inverted!) + `19%` numeral. The universally readable metaphor.
  6. `🔒 Sparkline` — 40×16px 7-day line (accent 1.5px stroke) + today's worst-%. For data nerds.
  7. `🔒 Segments` — ten 4×13px segments gap 2 (filled = accent + faint glow, empty = track) + worst-%. Gamer HP bar.
  All styles: same capsule container tokens (padding ~9px 14px), click-to-expand, drag-to-move, tooltip unchanged.
- **"SKINS"** — full-widget palettes (re-tint pill + panel; layout/type/motion stay Glass Instrument):
  1. **Glass — free/default** (the auto light/dark pair).
  2. `🔒 Amber HUD` — bg `#12140C`, border `#4A3F22`, accent `#FFB454`, neutral `#9C9272`, green `#7AE08C`, radius 6 (square chip). Terminal/cockpit crowd.
  3. `🔒 Warm Ledger` — bg `#FBF7F0`, border `#D9CBB4`, accent `#C15F3C`, neutral `#8C8073`, green `#7D8B6F`, track `#EAE1D2`, capsule. Claude-brand warmth.
  4. `🔒 Midnight OLED` — bg `#000000`, border `#1E2630`, accent `#22D3EE`, neutral `#475569`, green `#34D399`, capsule. Night owls / true-black OLED.
  5. `🔒 Paper` — bg `#F7F7F5`, border `#D4D4D0`, accent `#1A1A1A`, neutral `#A3A39E`, green `#6E6E68`, track `#E4E4E0`, radius 3, **no glow anywhere** (e-ink calm; heat communicated by fill only). Distraction-free purists.
  6. `🔒 Synthwave` — bg `#16102E`, border `#5B2E9E`, accent `#FF2EC4`, neutral `#7C5CFF`, green `#00E5A0`, capsule, oversized glow `0 12px 36px rgba(124,46,196,0.45)`. Neon retro / gamers.
  Skin mini-preview on the card = a tiny chip in that skin's bg/border/radius holding a 10px accent donut.
- CTA (margin-top 14, centered): capsule `Unlock themes · $5/mo` — accent fill, text `#1A1410` dark / `#FFF6F2` light, 12px 600, padding `8px 18px`, shadow `0 4px 16px rgba(accent,0.35)`, hover translateY(-1px). Below (margin-top 7, 10.5px ~35%): **"tracking stays free, forever"**.

**Unlocked behavior** (spec board §3d — interactive demo): after purchase the 🔒 glyphs disappear, all cards become selectable, and clicking one applies **instantly** to the live pill + panel — no confirm step; selection persists locally. Any style × any skin combine freely (7 × 6 = 42 combos). Skin swap animates with the same 300ms color crossfade as auto light/dark.

**Skin precedence:** while a non-Glass skin is active it overrides the auto light/dark pair entirely (skins are fixed palettes). Switching back to Glass resumes auto theming.

- Purchase flow itself (payment provider, license) is out of design scope.

### 7. Export (.md)

- The widget **continuously appends** a Markdown usage log at a user-visible path (default `~/Documents/claude-usage.md`), written every 15 min and on session/weekly/billing reset boundaries.
- `⤓` (header) and "Export .md" (footer) both → OS save dialog defaulting to a copy of the current log; footer shows live "· Xm ago" since last write.
- Exact file format:

```markdown
# Claude usage log
<!-- generated by Usage Widget vX.Y — do not hand-edit -->

## 2026-06-11
- 14:12 · session 62% (resets 16:00) · weekly 81% (resets Thu 09:00) · sdk $12.00/$50.00
- 13:57 · session 58% · weekly 80% · sdk $11.80/$50.00

## 2026-06-10
- …
```

### 8. First-run setup (single card)

Layout reference: v1 wireframes §4 (lofi — restyle as a Glass panel, 360px, same tokens). Shown centered on first launch; all values editable later (gear affordance can live in Edit tab footer — developer's choice, keep it subtle).

1. **Your plan** — segmented choice: `Pro` / `Max 5×` / `Max 20×` → sets SDK monthly credit pool (placeholder mapping $10 / $50 / $200 — **confirm real values against Anthropic's published plan credits at build time**).
2. **"When does your monthly plan restart?"** — day-of-month picker ("the 3rd of each month"). Drives SDK card's `restarts <date>` and log resets. The user never sees lifetime totals — **everything is remaining-until-reset**.
3. **Weekly limit resets** — weekday + time pickers (prefill from Claude account data if available).
4. CTA `Start tracking →` (accent capsule). Corner choice is NOT asked — widget spawns bottom-right and the user just drags it.

### 9. Window behavior (always-on-top + corner snap)

- Always-on-top above fullscreen apps; visible on all Spaces/desktops (macOS: non-activating panel, `.canJoinAllSpaces` + `.fullScreenAuxiliary`, status-bar window level; Windows: `WS_EX_TOPMOST | WS_EX_TOOLWINDOW`). Never steals focus on hover; click interaction must not switch the user out of their app.
- Frameless, transparent window, no shadow from OS (shadows are in CSS/material), not in dock/taskbar or Alt-Tab. Menu-bar/tray icon for quit + relaunch setup.
- **Drag anywhere on the pill** (or panel header) to move. While dragging: 4 ghost corner targets fade in (dashed rounded rects). On release: snap (180ms ease-out) to nearest corner at 16px margins. Pinned corner persists; panel expansion direction always grows inward from it.
- **Auto-hide (v1.1, optional):** after 10s without pointer interaction while collapsed, slide to an edge sliver (three 4px bars peeking from screen edge — v1 wireframe §1-D); hover slides pill back out. Ship behind a setting, default OFF.

---

## State Management

```ts
type MeterId = 'session5h' | 'weeklyAll' | 'sdkCredits' | 'allTimeTokens' | 'opusVsSonnet';

interface WidgetState {
  meters: { id: MeterId; enabled: boolean; pinnedToPill: boolean }[];   // array order = display order; pinnedToPill default false
  usage: {
    session5h:  { pct: number; resetsAt: ISO };  // pct 0–100
    weeklyAll:  { pct: number; resetsAt: ISO };
    sdkCredits: { spentUsd: number; poolUsd: number; restartsOn: ISO };
    allTimeTokens: { total: number; since: ISO };
    history14d: { date: ISO; peakWeeklyPct: number }[];
    sdkByApp: { app: string; usd: number }[];
    lastSyncAt: ISO;
  };
  setup: { plan: 'pro'|'max5x'|'max20x'; monthlyResetDay: 1–28; weeklyResetDow: 0–6; weeklyResetTime: 'HH:mm'; completed: boolean };
  ui: { expanded: boolean; tab: 'limits'|'history'|'edit'|'theme'; historyPage: 0|1; corner: 'tl'|'tr'|'bl'|'br'; theme: 'auto' };
  customization: { style: 'ring'|'naked'|'dot'|'countdown'|'battery'|'spark'|'segments'; skin: 'glass'|'amberHud'|'warmLedger'|'midnightOled'|'paper'|'synthwave' };   // defaults: ring + glass; selectable only when entitled
  entitlement: { customizationActive: boolean };
}
```

- Derived: `pillMeters = pinned.length ? pinned (row order, max 5) : [worstEnabled]`; `worstMeter = max(pct of shown)`; `isHot(m) = pct ≥ 75`; SDK pct = `spentUsd/poolUsd*100`.
- Persist everything locally (state survives restart). Countdown strings re-render every minute.
- **Data source for usage values is out of design scope** — wire to whatever Claude usage endpoint/local telemetry is available; the design assumes the values exist. Stale data (>15 min since `lastSyncAt`): footer right side shows `stale · 22m` in accent.

## Interactions & Behavior summary (timings)

| Interaction | Spec |
|---|---|
| Expand / collapse | 240ms / 200ms, `cubic-bezier(0.32,0.72,0,1)`, origin = pinned corner |
| Tab switch | content swap instant; segment highlight 150ms |
| Carousel page | 200ms horizontal slide; dots + ‹ › + swipe |
| Theme (OS) change | 300ms color crossfade |
| Corner snap | 180ms ease-out |
| Hover states | 150ms; all listed per-component above |
| Ring/bar value change | animate fill/conic 400ms ease-out |
| Pill ring add/remove (pin toggled) | pill width + ring 200ms ease-out |
| Hot threshold | ≥75%: accent color + glow on ring, bar, value; weekly card gets accent-tint surface |

## Assets

- Fonts: Instrument Sans + JetBrains Mono (Google Fonts; bundle locally in production).
- No raster images. All glyphs (⤓ ✕ ⠿ ‹ › 🔒 ✓) may be replaced with proper icons from the codebase's icon set (preserve sizes); the lock must stay subtle, not alarming.
- Charts: render with whatever charting/canvas approach fits the stack; match stroke/fill/gridline specs exactly.

## Files

| File | What it is |
|---|---|
| `Glass Instrument Spec.dc.html` | **The complete hi-fi spec board** — Glass Instrument only, dark + light. §1 collapsed states · §2 interactive panels (all tabs) · §3 deep dives · §4 setup · §5 window/motion/theme · §6 export. |
| `README.md` | This document — tokens, measurements, behaviors, state model. |
| `support.js` | Runtime needed to open the `.dc.html` file in a browser. Not part of the design. |
