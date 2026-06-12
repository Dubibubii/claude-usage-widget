import { useStore, readMeter } from "../../state/store";
import { heatColor, heatGlow } from "../meterVisuals";
import type { Tokens } from "../../theme/tokens";
import type { MeterId, UsageSnapshot } from "../../state/types";
import {
  fmtTokens,
  sdkCycleMeta,
  sessionResetMeta,
  shortDate,
  sinceMeta,
  weeklyResetMeta,
} from "../../data/format";
import { sdkPaceEmptyOn } from "../../data/insights";

/** Usage limits (default tab): 2×2 grid, gap 9. Cards in meters order;
 * if only 3 cards the 4th cell stays empty (spec §3). */
export function LimitsTab({ t, usage, now }: { t: Tokens; usage: UsageSnapshot; now: Date }) {
  const { state } = useStore();
  // every row keeps its card — ✕ in Edit only affects the minimised pill
  const cards = state.meters;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
      {cards.map((m) => (
        <Card key={m.id} id={m.id} t={t} usage={usage} now={now} />
      ))}
    </div>
  );
}

/** never-synced vs rolled-over-window get distinct hints (freshness itself
 * lives in ONE place — the panel footer — not repeated per card) */
function awaitingMeta(usage: UsageSnapshot): string {
  return usage.sync.rateLimits
    ? "out of date — syncs on next Claude turn"
    : "syncs on next Claude turn";
}

function Card({ id, t, usage, now }: { id: MeterId; t: Tokens; usage: UsageSnapshot; now: Date }) {
  const r = readMeter(id, usage);
  // Hot rule (spec §3a): ≥75% → accent value+bar+glow AND accent-tint surface
  const hot = r.hot;

  const surface = {
    borderRadius: 12,
    background: hot ? t.accentTintBg : t.cardBg,
    border: `1px solid ${hot ? t.accentTintBorder : t.cardBorder}`,
    padding: 11,
  } as const;

  const label = (text: string) => (
    <div
      style={{
        fontSize: 10,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: hot ? withAlpha(t.accentText, 0.8) : t.textSecondary,
      }}
    >
      {text}
    </div>
  );

  const valueStyle = {
    fontSize: 24,
    fontWeight: 600,
    margin: "5px 0 6px",
    color: hot ? heatColor(r.pct, t) : t.textPrimary,
  } as const;

  const suffixStyle = { fontSize: 13, opacity: 0.6, color: hot ? undefined : t.textSecondary } as const;
  const metaStyle = { fontSize: 10.5, color: t.textSecondary, marginTop: 6 } as const;

  // bar fill follows the traffic-light heat scale
  const bar = (pct: number | null) => (
    <div className="bar-track" style={{ background: t.track }}>
      <div
        className="bar-fill"
        style={{
          width: `${Math.min(100, pct ?? 0)}%`,
          background: heatColor(pct, t),
          boxShadow: heatGlow(pct, t, 8),
        }}
      />
    </div>
  );

  switch (id) {
    case "session5h":
      return (
        <div style={surface}>
          {label("5-hr session")}
          <div className="mono" style={valueStyle}>
            {usage.session5h ? Math.round(usage.session5h.pct) : "–"}
            <span style={suffixStyle}>%</span>
          </div>
          {bar(r.pct)}
          <div style={metaStyle}>
            {usage.session5h ? sessionResetMeta(usage.session5h.resetsAt, now) : awaitingMeta(usage)}
          </div>
        </div>
      );
    case "weeklyAll":
      return (
        <div style={surface}>
          {label("Weekly · all")}
          <div className="mono" style={valueStyle}>
            {usage.weeklyAll ? Math.round(usage.weeklyAll.pct) : "–"}
            <span style={suffixStyle}>%</span>
          </div>
          {bar(r.pct)}
          <div style={metaStyle}>
            {usage.weeklyAll
              ? weeklyResetMeta(usage.weeklyAll.resetsAt, now) +
                (usage.weeklyTrendPerDay ? ` · ↑${usage.weeklyTrendPerDay}%/day` : "")
              : awaitingMeta(usage)}
          </div>
        </div>
      );
    case "sdkCredits": {
      const sdk = usage.sdkCredits;
      // pace alert beats the window line when the pool projects to run dry
      // before its restart (needs ≥1 day of cycle data; insights.ts)
      const emptyOn = sdk
        ? sdkPaceEmptyOn(sdk.spentUsd, sdk.poolUsd, sdk.sinceOn, sdk.restartsOn, now)
        : null;
      return (
        <div style={surface}>
          {label("SDK credits")}
          <div className="mono" style={valueStyle}>
            {sdk ? (
              <>
                ${sdk.spentUsd < 10 ? sdk.spentUsd.toFixed(2) : Math.round(sdk.spentUsd)}
                <span style={suffixStyle}>/{sdk.poolUsd}</span>
              </>
            ) : (
              "–"
            )}
          </div>
          {bar(r.pct)}
          {/* "est." — API-equivalent estimate until calibrated against real
           * Anthropic SDK metering; the window start is shown so a wrong
           * cycle day is self-evident (fix via Edit → ⚙ Re-run setup) */}
          {emptyOn ? (
            <div style={{ ...metaStyle, color: t.accentText }}>
              est. · ~empty {shortDate(emptyOn.toISOString())} at this pace
            </div>
          ) : (
            <div style={metaStyle}>
              {sdk ? `est. · ${sdkCycleMeta(sdk.sinceOn, sdk.restartsOn)}` : "reading local data…"}
            </div>
          )}
        </div>
      );
    }
    case "allTimeTokens": {
      const at = usage.allTimeTokens;
      return (
        <div style={surface}>
          {label("All-time tokens")}
          <div className="mono" style={valueStyle}>{at ? fmtTokens(at.total) : "–"}</div>
          <div style={{ ...metaStyle, marginTop: 14 }}>
            {at?.since ? sinceMeta(at.since) : at ? "all local history" : "reading local data…"}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}
