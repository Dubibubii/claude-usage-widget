# Monetization architecture (open-core)

Tracking is free, forever. The only paid surface is cosmetic customization:
6 collapsed widget styles + 5 skins, $5/mo (spec §6).

## Code boundary

| Where | What |
|---|---|
| **Public repo** (this one) | Entire widget: data sources, panel, Edit, free Glass theme + Ring style. Also the Theme-tab **storefront**: names + mini previews of paid items (`SKIN_PREVIEWS`, style preview glyphs) so users see what they'd buy. |
| **Private repo** (`usage-widget-themes-pro`) | `src/paid/` — the full paid content: 5 complete skin token sets (`skins.ts`) and the 6 premium collapsed-style renderers (`styles.tsx`). |

The public app loads `src/paid/index.ts` via `import.meta.glob` —
statically resolved at build time:

- **Public build** (repo clone): module absent → everything falls back
  gracefully (Glass theme, Ring style); locked cards still render previews.
- **Official release build** (CI): checks out the private repo into
  `src/paid/` before `tauri build` → paid content is in the binary,
  gated at runtime by the license entitlement.

## Purchase → delivery flow (Stripe — LIVE)

Provider: **Stripe** (user's account). Model: **purchase-email lookup** — no
webhooks, no key issuance. The email used at checkout is the license.

LIVE resources (created 2026-06-11; note: live mode is a different Stripe
account than the test sandbox):
- product `prod_UgPLnn4aZrX5dd` — "Claude Usage Widget — Themes"
- price `price_1Th2WOE52OWhfRnYwfjvllxg` — $5/mo
- payment link in `src/config.ts` `CHECKOUT_URL`

Test-mode resources (sandbox account, kept for staging):
- product `prod_UgM18qpvW04Gzb`, price `price_1TgzJfEAKze6AhcJYS6Gv6kx`

Comp entitlements (owner, gifts): the worker checks the `ALLOWLIST` secret
(comma-separated emails, case-insensitive) before hitting Stripe —
`wrangler secret put ALLOWLIST`. No address appears in the public source.

1. **Unlock themes · $5/mo** → opens the Stripe payment link.
2. User activates in the Theme tab with their **checkout email**.
3. App → `workers/license` (Cloudflare Worker) `/validate` → Stripe
   customer-search + active-subscription check for the themes price →
   `{active: true}` → entitlement on, email + timestamp stored locally.
4. Re-validation every 3 days; subscription lapsed → entitlement off and
   selection reverts to Glass/Ring; worker unreachable → 14-day grace.
   (`src/config.ts`, `src/data/license.ts`, revalidation in UsageWidget.)

Trade-off (accepted for cosmetic stakes): anyone who knows a subscriber's
checkout email could activate. Upgrade path if abused: per-device activation
records in Workers KV, or signed tokens.

Because official binaries already contain the (gated) paid content, no
post-purchase download is needed for v1 — activation IS the unlock.
A future "theme pack download" endpoint (license-checked, serves updated
packs from the private repo's releases) slots into `loadPaidPack()` without
touching the rest of the app.

### Launch checklist (Stripe) — status 2026-06-11

1. ✅ Worker deployed (live `STRIPE_SECRET_KEY` secret, live `PRICE_ID`,
   `ALLOWLIST` secret); `LICENSE_API` set in `src/config.ts`.
2. ✅ Test-mode end-to-end verified earlier with `4242 4242 4242 4242`.
3. ✅ Live product/price/payment-link created; `CHECKOUT_URL` swapped.
   ⬜ Enable Stripe Tax in the dashboard (needs origin address + tax
   onboarding — owner action; the payment link can be updated to
   `automatic_tax` afterwards). Stripe is NOT a merchant of record — tax
   registrations are on you; revisit Lemon Squeezy/Polar if that becomes
   a burden.
4. ✅ Dev-unlock fallback gone (automatic once `LICENSE_API` is set).

## Honest constraints

- Someone can build from the public repo and theme it themselves — that's
  inherent to OSS and fine: the paid catalog competes on design quality and
  convenience, and tracking is free either way.
- CI for releases needs a deploy key/PAT with read access to the private
  repo (GitHub Actions secret), checking it out into `src/paid/`.

## Release CI sketch (add to .github/workflows/release.yml)

```yaml
- name: Checkout paid themes (official builds)
  uses: actions/checkout@v4
  with:
    repository: <owner>/usage-widget-themes-pro
    token: ${{ secrets.THEMES_PRO_TOKEN }}
    path: src/paid
```
