# Claude Usage Widget

_Started 2026-06-10 23:38 UTC_

---

## User

I want to create a award-winning designed widget that connects to Claude's usage limits and it just sticks to the corners of the user's screen.

It goes in front of the tabs. Even if a user goes into a new tab or full screen, it still shows in front, and this needs to show a few usage bars. The same ones inside of Claude's Usage Limits, where it says Current Session as well as the Weekly Limit All Models bar. I think it should also show a third bar, which is Third Party Apps. In this third bar, it's basically going to show the new billing structure that Claude has just provided, where different plan holders have different amounts of dollars in API credits, and it gets API billed. 

Then I think the user should have the ability to click on the widget to expand it and be able to look more deeply at the additional statistics that we can provide. 

I think when setting up the widget, we need to ask the user questions like "When does your monthly plan restart?" so we know when to reset, because the user doesn't care about the total combined usage. It only cares about the reset.

I think maybe in the expanded version we can show potentially additional, like how many tokens the user has ever used. Would be cool.

I think there could also be an edit button when expanded where the user is able to edit. They can see the widget when it's minimised, and they're able to edit by just dragging and dropping the different usage bars that they would like to see. They can add additional usage bars, or they can cross out usage bars or statistics, or whatever it is that we can show. 

So it becomes custom to the user. 

I also think we could include a small paid section. Now, note that we can include a. I think that in the expanded section, there should be a customization tab. If the user wants to customise, they can pay a small $5/month fee, and we let them change the colours and all that sort of stuff. But this is gated behind a paywall, and the entire functionality of the app is completely free.

## Assistant

_[tool: list_files]_

_[tool: questions_v2]_

## User

Questions answered:
- platform: Native desktop overlay app (always-on-top, macOS/Windows)
- minimized_density: Explore a few options
- expand_behavior: Click → grows in place from the corner
- expanded_stats: Time until each reset (countdown), Daily usage sparkline / history graph, Third-party API $ spend breakdown by app
- edit_mode: Inline: bars get drag handles + X right in the expanded panel
- setup_flow: Yes — single quick setup card
- paywall: Quiet: a locked 'Customize' tab with a small lock icon
- variations: 4
- explore_focus: Layout & information density
- corners: User drags it to any corner, it snaps, Auto-hide to a sliver, slide out on hover
- anything_else: The key components that we need to show are:
1. The five-hour session window
2. The weekly usage that's left
Those are the two key ones that we need to show: how much of the five-hour session window is left and how much of the weekly session window is left. The third one is the new agent SDK usage. I think we also show a percentage for that as well.

## Assistant

_[tool: update_todos]_

The design system project linked here is empty, so I'm going full lo-fi wireframe mode — sketchy, B&W with one marker color, exploring breadth. Building now:

_[tool: dc_write]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Wireframes are up — one sketchy board mapping the full design space:

1. **Collapsed states (A–D)**: slim labeled stack → naked bars → ring pill → auto-hiding edge sliver, each shown in a mini-screen + zoom detail
2. **Expanded layouts (E1–E3)**: stacked list, dashboard grid, tabbed compact — all with your three meters (5-hr session, weekly, Agent SDK $), reset countdowns, 7-day history, $ by app
3. **Edit mode**: inline drag handles, ✕-to-remove (strikethrough), "add a stat" tray, live collapsed preview
4. **Setup card** ("when does your monthly plan restart?"), drag-to-snap corner ghosts, and the quiet 🔒 Theme tab paywall ($5/mo, looks only)

Pick a collapsed direction + an expanded layout (e.g. "A + E3") and I'll build the interactive prototype next.

## User

1. One collapsed corner states: I like the ring pill; however, I think in the themes tab we could allow the user to unlock additional styles like Slim Stack, Naked Bar, Edge Sliver, for example.
2. For the two expanded panel, I like the dashboard grid Number 2. Edit mode looks great. It should be one of the tabs, so there should be a tab called Edit mode. I think there will be a section that is also locked in Edit mode, which is like different themes or structures.

## Assistant

_[tool: dc_write]_

Great picks — I'll fold that into a **v2 interactive wireframe**: ring pill collapsed → click → dashboard-grid panel with tabs **Meters · History · Apps · Edit · 🔒 Theme**, where Edit is a tab (with its own locked "structures" section) and Theme unlocks the other collapsed styles. Still sketchy/lo-fi, but clickable so you can feel the flow.

_[tool: done]_

_[tool: fork_verifier_agent]_

**v2 is live and clickable** — try it on the mock desktop:

- **Ring pill** in the corner (worst meter wins the ring) → click to expand into the **dashboard grid**
- Tabs: **Meters · History · Apps · ✎ Edit · 🔒 Theme**
- **Edit tab**: ✕ a meter and the grid *and* the ring update live; "add a stat" chips (all-time tokens works); locked **Panel structures** section at the bottom ($5/mo)
- **Theme tab**: Ring pill marked free ✓, with **Slim stack / Naked bars / Edge sliver** as locked unlockables + locked colors

A verifier is double-checking the interactions in the background. v1 board is still there for reference. Next step when you're happy: hi-fi pass with real visual design.

## User

No issues found

## Assistant

Verified — all interactions work. Whenever you're ready, say the word and I'll take this into a hi-fi design pass (real typography, color, motion for the expand animation). If you have brand preferences — e.g. match Claude's own aesthetic vs. something distinct — let me know then.

## User

looks good. For the Claude usage in metres, the edit component I think what would work is if users added, and then it would show multiple circles. since thats the free circle component

Now can we actually design it how does the UI look?

I want 3 alternatives

We can rename metres to usage limits. History can show a line graph rather than a bar graph. I think we can merge apps into history. As they kind of do the same thing, it could be potentially a carousel. Users can go next to see the SDK by apps instead of the graph. 

There should also be an export button because the widget is going to track your usage and it's going to write it in a.md file. so users can export that.

## Assistant

_[tool: read_skill_prompt]_

_[tool: snip]_

_[tool: snip]_

_[tool: snip]_

_[tool: dc_write]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Three hi-fi directions are live, all clickable (tabs + the ‹ › History carousel):

**01 · Glass Instrument** — dark translucent glass, JetBrains Mono numerals, terracotta glow on the hot ring. Feels like a native macOS utility.

**02 · Warm Ledger** — ivory + terracotta with Newsreader serif; rings carry little verdicts ("fine / careful / plenty"). Feels like Claude's own brand sitting on your desktop.

**03 · Amber HUD** — cockpit-instrument mono aesthetic: square chip, segmented phosphor bars, scanlines, `CLAUDE://USAGE`. For the terminal crowd.

All three carry your changes: **Usage limits** naming, multi-circle collapsed pill (one ring per enabled limit), History = line graph ⇄ SDK-by-app carousel, and an **Export .md** action (header icon + footer "writing to claude-usage.md").

Tell me which direction wins (or what to hybridize — e.g. "02's layout with 01's dark glass") and I'll build the full prototype: collapse/expand animation, working edit mode feeding the rings, and corner snapping.

## User

Can I see Glass Instrument in a light tone?

## Assistant

_[tool: dc_js_str_replace]_

Adding a light-tone twin of Glass Instrument (01·L) right below the dark one so you can compare directly — same layout, frosted light glass.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now the light section itself, inserted right after the dark Glass Instrument:

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done — **01·L Glass Instrument — Light** now sits directly under the dark version: same layout and JetBrains Mono numerals, but frosted white glass on a bright wallpaper, with a slightly deepened terracotta (#E06A43) so the hot ring still reads at small sizes. Fully clickable like the others.

A verifier is checking contrast and the tab/carousel interactions in the background. Compare 01 vs 01·L side by side and tell me which way you lean — or if the final widget should ship with auto light/dark following the OS.

## User

Found issues — fixing…

## Assistant

_[tool: dc_js_str_replace]_

The style-attribute holes only resolve on first render — I'll move the dynamic tab/dot styling into rendered elements (which do update), exposed by name. First the logic:

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

Now swap the template's static spans/dots for the live elements:

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Fixed — tab highlights and carousel dots are now rendered as live elements instead of one-shot style bindings, so the active tab pill and active dot follow your clicks in all four directions. A verifier is re-checking each section now; I'll confirm when it reports back.

## User

Can we give the Glass Instrument light, more of that glassmorphism transparency? Can we also give AmberHUD a lighter, a light version with that glassmorphism transparency as well?

## Assistant

_[tool: dc_js_str_replace]_

Two upgrades: real glassmorphism for 01·L (more transparency + colorful backdrop blobs so the blur actually reads), and a new **03·L Amber HUD — Light** glass variant. Logic first:

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now the new 03·L Amber HUD — Light section:

_[tool: done]_

_[tool: fork_verifier_agent]_

Both done:

- **01·L Glass Instrument — Light** is now genuinely glassmorphic: panel and pill dropped to ~40% white opacity with `blur + saturate` frosting, inner cards are translucent white, and I added soft color blobs (violet, terracotta, green, amber) behind the widget so the glass actually has something to refract.
- **03·L Amber HUD — Light** added right after the dark HUD: same cockpit language (mono, square corners, segmented bars, scanlines, `CLAUDE://USAGE`) but on sun-lit warm glass with deepened amber (#D98414/#A6690F) for contrast. Fully interactive like the rest.

That's five live directions on the board now. A verifier is checking contrast and interactions on the two new ones. Once you've picked your winner, I'll build it out as the full widget prototype — expand/collapse animation, working edit mode driving the rings, corner snapping.

## User

Let's implement Glass Instrument, and I think there should be a light and a dark mode, which is just auto connected to the user's display settings. When it gets darker or it hits night time, it turns dark. When it's daytime, it turns bright. Let's lock in Glass Instrument. 

Now create the wireframes for me to hand this off to Claude. Be very specific. Leave no room for ambiguity.

## Assistant

_[tool: read_skill_prompt]_

Glass Instrument locked. Before I build the spec, let me check the handoff skill so the output is in the right shape for Claude Code:

_[tool: list_files]_

_[tool: copy_files]_

_[tool: write_file]_

_[tool: present_fs_item_for_download]_

Handoff package is ready above ⬆ — `design_handoff_usage_widget/` contains:

- **README.md** — the full unambiguous spec: complete dark + light token tables, auto theme-switching rules (OS appearance, live, 300ms crossfade, time-based fallback), pixel specs for the pill and every tab, all animation timings, the `.md` export file format, corner-snap/always-on-top window behavior, setup flow, and a TypeScript state model.
- The hi-fi reference (`UI Alternatives`, sections 01/01·L = build target) plus both lo-fi wireframe boards for flows, and `support.js` so they open in a browser.

Two things flagged inside the spec for the developer: the plan→SDK-credit-pool dollar mapping is a placeholder to confirm against Anthropic's real billing, and the usage-data source needs wiring (design assumes the values exist).

Want me to include screenshots of the designs in the package as well?

## User

I don't like that we're mixing in warm ledger and amber hud into this. The wireframe should only include glass, instrument, dark, and light, and it should go in depth into every single feature. I think, by default, it should only show one ring visible as well.

## Assistant

_[tool: update_todos]_

I'll fix all three: a dedicated Glass-Instrument-only spec board (dark + light, every feature in depth), single-ring pill as the default, and a cleaned handoff bundle with the rejected directions removed.

_[tool: update_todos]_

_[tool: dc_write]_

_[tool: str_replace_edit]_

Now update the README and clean the bundle:

_[tool: delete_file]_

_[tool: copy_files]_

_[tool: done]_

_[tool: present_fs_item_for_download]_

_[tool: fork_verifier_agent]_

Rebuilt clean — you're now looking at **Glass Instrument Spec.dc.html**, Glass Instrument only:

- **§1** Collapsed pill, every state — **default is one ring** (worst meter, auto), plus light variant, calm <75%, opt-in multi-ring, hover tooltip, empty state
- **§2** Expanded panels dark + light side by side, fully interactive (all tabs, carousel, new ◎/◉ "show in pill" pin in Edit)
- **§3** Deep dives: card anatomy + hot rule, drag/hidden edit states, pill ring logic (0 pinned → 1 auto ring → max 5)
- **§4** Setup card with full spec notes · **§5** corner snap, auto-hide sliver, auto light/dark + motion table · **§6** the `.md` export format + fresh/stale footer states

The handoff bundle (download card above) now contains only this spec board, the updated README (single-ring default, pin logic, new state model), and `support.js` — Warm Ledger and Amber HUD are gone.

## User

Alright, this is looking good. I think for the theme section with the lock, it would be cool if we had the text theme behind the lock so people can see what it is first. Could we demonstrate just a simple how the theme would work if a user were to pay for it? 

I also think the theme preview could be improved by just showing naked bars and then showing the amber hud theme and the warm leather theme.

## Assistant

_[tool: dc_js_str_replace]_

Three changes: the tab reads "🔒 Theme", the Theme tab now previews **Naked bars + Amber HUD + Warm Ledger** as the unlockables, and I'll add an interactive "after purchase" demo. Logic first:

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

Now the new Theme tab contents — dark panel first:

_[tool: dc_html_str_replace]_

And the interactive "after purchase" demo, added to §3:

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

I accidentally added an extra closing `</div>` — fixing the nesting:

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Two spacing tweaks so the demo block visually belongs to §3:

_[tool: str_replace_edit]_

Update the README to match, refresh the bundle copy:

_[tool: copy_files]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done — three updates on the spec board:

- **Tab now reads "🔒 Theme"** in both panels (no more mystery lock)
- **Theme tab restructured**: "Widget style" (Ring pill ✓ free, 🔒 Naked bars) + "Skins" (🔒 **Amber HUD**, 🔒 **Warm Ledger**) — the two rejected directions live on as paid skins, each with a mini-chip preview so users see exactly what they'd get
- **§3d — interactive "after purchase" demo**: pick a style × skin and the live preview pill re-renders (amber square chip, ivory capsule, etc.) with instant-apply behavior notes

README updated to match (skin token summary, unlocked behavior, `customization` state) and the handoff bundle refreshed. Verifier is checking the new interactions now.

## User

Found issues — fixing…

## Assistant

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: copy_files]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Fixed — the dynamic groups (tab bars, carousel dots, demo cards) now render as single container elements with `display: contents`, which re-render on every state change while leaving the template's flex layout intact. Applied to both the spec board and the alternatives gallery, and the handoff bundle now carries the fixed file. Verifier is re-running the interaction checks; I'll confirm the result.

## User

For the Theme tab, can you provide users with 5 more additional widget styles and 3 more skins?

## Assistant



## User

For the Theme tab, can you provide users with 5 more additional widget styles and 3 more skins?

Be creative with it. What would a user want to see? What are the different types of people we have that would be interested in this tool? Think about our target audience.

## Assistant

_[tool: dc_js_str_replace]_

Great brief — let me design for the personas: minimalists (status dot), deadline-thinkers (countdown), normies who read battery icons instantly (battery), data nerds (sparkline), gamers (HP segments); plus skins for night owls (Midnight OLED), distraction-free purists (Paper/e-ink), and the retro crowd (Synthwave). Wiring them in:

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now the full demo-pill renderer for all 7 styles:

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

Now swap the panel Theme tabs to the generated card grids — dark panel:

_[tool: dc_html_str_replace]_

Light panel:

_[tool: dc_html_str_replace]_

Let the §3d demo cards wrap, and update its explainer copy:

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: str_replace_edit]_

README update + bundle refresh:

_[tool: copy_files]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done — the Theme tab now sells a real catalog, persona by persona:

**7 widget styles** (collapsed forms):
- Ring pill ✓ free · **Naked bars** (all-meters minimalist) · **Status dot** (single dot, invisible until it glows) · **Countdown** ("◷ 1h 48m" — for people who think in time, not %) · **Battery** (inverted, shows 19% *left* — the universal metaphor) · **Sparkline** (7-day trend, data nerds) · **Segments** (gamer HP bar)

**6 skins** (full-widget palettes):
- Glass ✓ free (the auto light/dark pair) · **Amber HUD** (terminal cockpit) · **Warm Ledger** (Claude-brand warmth) · **Midnight OLED** (true black + cyan, night owls) · **Paper** (e-ink grayscale, zero glow) · **Synthwave** (neon magenta, retro/gamers)

All appear as locked mini-preview cards in both §2 panels (3-col grids), and **§3d lets you try all 42 style × skin combos live** — Battery × Paper, Segments × Synthwave, etc. README spec'd every one (dimensions, tokens, personas, skin-precedence rule) and the bundle is refreshed. Verifier is sweeping the new combos now.

## User

No issues found

## Assistant

_[tool: snip]_

All verified — the expanded Theme catalog (7 styles × 6 skins), locked previews in both panels, and the §3d try-it demo all check out cleanly. The handoff bundle in `design_handoff_usage_widget/` is current with the spec board + README.

Anything else — or shall I leave it here so you can ship the bundle to Claude Code?

