import type { Tokens } from "../theme/tokens";
import {
  type Corner,
  type MeterRow,
  type UsageSnapshot,
  type WidgetStyle,
} from "../state/types";
import { pillMeters, primaryOf, readMeter, type MeterReading } from "../state/store";
import { agoLabel, fmtDuration, fmtTokens, minutesAgo, weeklyResetTooltip } from "../data/format";
import { Ring } from "./Ring";
import { heatColor, heatGlow, Numeral } from "./meterVisuals";
import type { PaidModule, PaidStyleArgs } from "../theme/paidContent";

export function Pill({
  meters,
  usage,
  t,
  style,
  corner,
  now,
  hovered,
  tooltipOpen,
  pack,
}: {
  meters: MeterRow[];
  usage: UsageSnapshot;
  t: Tokens;
  style: WidgetStyle;
  corner: Corner;
  now: Date;
  hovered: boolean;
  /** owned by UsageWidget (it also drives the native window's tooltip room) */
  tooltipOpen: boolean;
  /** paid theme pack — null in public builds / before entitlement */
  pack: PaidModule | null;
}) {
  const shown = pillMeters(meters, usage);
  const primary = primaryOf(shown);
  const multi = shown.length > 1;
  const empty = meters.filter((m) => m.enabled).length === 0;

  const numeralColor = primary?.hot ? heatColor(primary.pct, t) : t.textPrimary;
  const padding = style === "ring" ? "9px 16px 9px 12px" : "9px 14px";

  const args: PaidStyleArgs = { shown, meter: primary, multi, t, usage, numeralColor, now };
  // ring is the free built-in; everything else comes from the paid pack and
  // falls back to ring when the pack isn't loaded/present
  const paidContent = style !== "ring" ? pack?.renderPaidStyle(style, args) : null;

  return (
    <div style={{ position: "relative" }}>
      <div
        className="pill-body"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding,
          borderRadius: t.pillRadius,
          background: t.pillBg,
          border: `1px solid ${hovered ? t.pillHoverBorder : t.pillBorder}`,
          boxShadow: t.pillShadow,
          backdropFilter: t.pillBlur,
          WebkitBackdropFilter: t.pillBlur,
          cursor: "pointer",
          transition: "border-color 150ms ease",
          whiteSpace: "nowrap",
        }}
      >
        {empty ? <EmptyContent t={t} /> : paidContent ?? <RingContent args={args} />}
      </div>
      {tooltipOpen && !empty && (
        <Tooltip meters={meters} usage={usage} t={t} corner={corner} now={now} />
      )}
    </div>
  );
}

/** The free default style: conic rings + primary numeral (spec §1).
 * Ring fill follows the traffic-light heat scale. */
function RingContent({ args }: { args: PaidStyleArgs }) {
  const { shown, meter, t, numeralColor } = args;
  return (
    <>
      {shown.map((r) => (
        <div key={r.id} className="ring-slot" style={{ width: 20 }}>
          {/* awaiting sync renders as an empty ring at 0 — calmer than the
              old dashed placeholder; the meta copy carries the honesty */}
          <Ring pct={r.pct ?? 0} color={heatColor(r.pct ?? 0, t)} glow={heatGlow(r.pct, t)} t={t} />
        </div>
      ))}
      <Numeral meter={meter} color={numeralColor} />
    </>
  );
}

function EmptyContent({ t }: { t: Tokens }) {
  // 1f · 0 enabled meters: dashed ghost ring + "+" (click opens panel on Edit)
  const ghost = t.lightSurface ? "rgba(28,30,38,0.3)" : "rgba(255,255,255,0.3)";
  return (
    <>
      <div style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px dashed ${ghost}` }} />
      <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: t.textSecondary }}>+</span>
    </>
  );
}

function Tooltip({
  meters,
  usage,
  t,
  corner,
  now,
}: {
  meters: MeterRow[];
  usage: UsageSnapshot;
  t: Tokens;
  corner: Corner;
  now: Date;
}) {
  // One line per ENABLED meter; hot lines in accent (spec §1e)
  const syncing = <i style={{ opacity: 0.7 }}>syncing…</i>;
  const lines = meters
    .filter((m) => m.enabled)
    .map((m) => {
      const r = readMeter(m.id, usage);
      switch (m.id) {
        case "session5h":
          return {
            hot: r.hot,
            text: usage.session5h ? (
              <>Session <b className="mono">{Math.round(usage.session5h.pct)}%</b> · resets in {fmtDuration(new Date(usage.session5h.resetsAt).getTime() - now.getTime())}</>
            ) : (
              <>Session {syncing}</>
            ),
          };
        case "weeklyAll":
          return {
            hot: r.hot,
            text: usage.weeklyAll ? (
              <>Weekly <b className="mono">{Math.round(usage.weeklyAll.pct)}%</b> · {weeklyResetTooltip(usage.weeklyAll.resetsAt)}</>
            ) : (
              <>Weekly {syncing}</>
            ),
          };
        case "sdkCredits":
          return {
            hot: r.hot,
            text: usage.sdkCredits ? (
              <>Agent SDK <b className="mono">${usage.sdkCredits.spentUsd.toFixed(2)}</b> est. · counts toward limits</>
            ) : (
              <>Agent SDK {syncing}</>
            ),
          };
        case "allTimeTokens":
          return {
            hot: false,
            text: usage.allTimeTokens ? (
              <>All-time <b className="mono">{fmtTokens(usage.allTimeTokens.total)}</b> tokens</>
            ) : (
              <>All-time {syncing}</>
            ),
          };
        default:
          return null;
      }
    })
    .filter(Boolean) as { hot: boolean; text: React.ReactNode }[];

  const isTop = corner === "tl" || corner === "tr";
  const isLeft = corner === "tl" || corner === "bl";
  return (
    <div
      style={{
        position: "absolute",
        [isTop ? "top" : "bottom"]: "calc(100% + 8px)",
        [isLeft ? "left" : "right"]: 0,
        borderRadius: 10,
        background: t.lightSurface ? "rgba(255,255,255,0.95)" : "rgba(24,26,33,0.95)",
        border: `1px solid ${t.pillBorder}`,
        // no drop shadow: it paints a halo onto the desktop (transparent window)
        padding: "9px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontSize: 11,
        whiteSpace: "nowrap",
        color: t.lightSurface ? "rgba(28,30,38,0.75)" : "rgba(255,255,255,0.75)",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {lines.map((l, i) => (
        <div key={i} style={{ color: l.hot ? t.accentText : undefined }}>
          {l.text}
        </div>
      ))}
      {usage.sync.rateLimits && minutesAgo(usage.sync.rateLimits, now) > 15 && (
        // floor values: % refreshes only on terminal Claude turns
        <div style={{ fontSize: 10, opacity: 0.55 }}>
          synced {agoLabel(usage.sync.rateLimits, now)} · updates on terminal turns
        </div>
      )}
    </div>
  );
}
