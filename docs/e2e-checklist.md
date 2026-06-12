# Native E2E checklist (driven via computer-use on the release .app)

Round 4 regression suite — every item must pass before handing back to the user.

| # | Scenario | Pass criteria |
|---|---|---|
| 1 | Cold launch | Pill visible at a screen corner, content intact (ring + numeral/–), window pill-sized, no entries in widget-errors.log after boot |
| 2 | Stale data state | With capture >15 min old: dashed ring + "–" (no stale %), cards say "stale — send any Claude prompt", footer "stale · Xm" |
| 3 | Drag to screen center, release | Window + contents move TOGETHER (no separation); on release snaps to nearest corner within ~0.5s; content intact after snap |
| 4 | Drag to each remaining corner | Snaps cleanly each time; 16px margins; content intact |
| 5 | Rapid jiggle drag + release | No fight/jitter aftermath; single clean snap; window never lost off-screen |
| 6 | Click pill | Panel opens at panel size; tabs work; no dead zone bigger than the panel |
| 7 | Esc / blur | Panel collapses back to pill-sized window |
| 8 | Hover 1s | Tooltip appears, fully readable (not clipped); window returns to pill size after cursor leaves; tooltip never sticks |
| 9 | Fresh data | After a Claude prompt (statusline render), meters show real % within ~10s; heat color matches band |
| 10 | Error log | Empty after the whole suite (boot-time vite race aside) |
