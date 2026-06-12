import { useRef } from "react";
import { useStore } from "../../state/store";
import type { Tokens } from "../../theme/tokens";
import type { UsageSnapshot } from "../../state/types";
import { fmtTokens, fmtUsd, shortDate } from "../../data/format";

/** "YYYY-MM-DD" → display, pinned to local noon so the label never shifts a day */
const dayLabel = (key: string) => shortDate(`${key}T12:00:00`);

/** History: 2-page carousel — 14-day chart ⇄ SDK $ by app (spec §4).
 * Navigation: dots + trackpad swipe. The spec's ‹ › header arrows were cut —
 * three affordances for a two-page carousel (audit verdict). */
export function HistoryTab({ t, usage }: { t: Tokens; usage: UsageSnapshot }) {
  const { state, dispatch } = useStore();
  const page = state.ui.historyPage;
  const setPage = (p: 0 | 1) => dispatch({ type: "setHistoryPage", page: p });

  // horizontal trackpad swipe
  const wheelAcc = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    wheelAcc.current += e.deltaX;
    if (Math.abs(wheelAcc.current) > 60) {
      setPage(wheelAcc.current > 0 ? 1 : 0);
      wheelAcc.current = 0;
    }
  };

  return (
    <div onWheel={onWheel}>
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: t.textSecondary,
          marginBottom: 10,
        }}
      >
        {page === 0 ? "14-day usage" : "SDK $ by app"}
      </div>

      <div style={{ overflow: "hidden" }}>
        <div className="carousel-track" style={{ transform: `translateX(${page === 0 ? "0" : "-50%"})` }}>
          <div className="carousel-page" style={{ paddingRight: 1 }}>
            <ChartPage t={t} usage={usage} />
          </div>
          <div className="carousel-page" style={{ paddingLeft: 1 }}>
            <AppsPage t={t} usage={usage} />
          </div>
        </div>
      </div>

      {/* dots: 6px, gap 6, active = accent, clickable */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
        {[0, 1].map((p) => (
          <div
            key={p}
            onClick={() => setPage(p as 0 | 1)}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              cursor: "pointer",
              background:
                page === p
                  ? t.accent
                  : t.lightSurface
                    ? "rgba(28,30,38,0.15)"
                    : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ChartPage({ t, usage }: { t: Tokens; usage: UsageSnapshot }) {
  // bars: real daily tokens from the local transcript scan (instant history);
  // line: observed weekly-peak % once live captures have accumulated
  const days = usage.dailyActivity;
  const total = days.reduce((s, d) => s + d.totalTokens, 0);
  if (days.length === 0 || total === 0) {
    return (
      <EmptyCard t={t}>
        {usage.sync.localScan
          ? "no activity in the last 14 days"
          : "reading local data…"}
      </EmptyCard>
    );
  }

  const W = 280;
  const H = 96;
  const slot = W / days.length;
  const max = Math.max(...days.map((d) => d.totalTokens));
  const barH = (v: number) => (v / max) * 80;
  const yPct = (pct: number) => 92 - (pct / 100) * 84;

  // weekly-peak overlay aligned to the same day slots
  const peaksByDay = new Map(
    usage.history14d.map((p) => [p.date, p.peakWeeklyPct]),
  );
  const peakPts = days
    .map((d, i) => {
      const w = peaksByDay.get(d.date);
      return w === undefined ? null : { x: slot * i + slot / 2, y: yPct(w) };
    })
    .filter((p): p is { x: number; y: number } => p !== null);

  const busiest = days.reduce((a, b) => (b.totalTokens > a.totalTokens ? b : a));
  const grid = t.lightSurface ? "rgba(28,30,38,0.06)" : "rgba(255,255,255,0.07)";
  const chartCardBg = t.lightSurface ? t.cardBg : "rgba(255,255,255,0.04)";

  return (
    <>
      <div style={{ borderRadius: 12, background: chartCardBg, border: `1px solid ${t.cardBorder}`, padding: 12 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          {[24, 52, 80].map((gy) => (
            <line key={gy} x1="0" y1={gy} x2={W} y2={gy} stroke={grid} strokeWidth="1" />
          ))}
          {days.map((d, i) => (
            <rect
              key={d.date}
              x={(slot * i + 3).toFixed(1)}
              y={(92 - barH(d.totalTokens)).toFixed(1)}
              width={(slot - 6).toFixed(1)}
              height={barH(d.totalTokens).toFixed(1)}
              rx="2"
              fill={t.accent}
              opacity={d.totalTokens === 0 ? 0 : 0.75}
            />
          ))}
          {peakPts.length >= 2 && (
            <polyline
              points={peakPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
              fill="none"
              stroke={t.textPrimary}
              strokeOpacity="0.45"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="3 3"
            />
          )}
          {peakPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill={t.textPrimary} fillOpacity="0.55" />
          ))}
        </svg>
        <div
          className="mono"
          style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t.textSecondary, marginTop: 6 }}
        >
          <span>{dayLabel(days[0].date)}</span>
          {peakPts.length >= 2 && <span style={{ opacity: 0.8 }}>▪ tokens · ┄ weekly peak %</span>}
          <span>{dayLabel(days[days.length - 1].date)}</span>
        </div>
      </div>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 11, color: t.textSecondary }}
      >
        <span>
          busiest: <b style={{ color: t.textPrimary }}>{dayLabel(busiest.date)} · {fmtTokens(busiest.totalTokens)}</b>
        </span>
        <span>
          14d: <b style={{ color: t.textPrimary }}>{fmtTokens(total)}</b>
        </span>
      </div>
      {(usage.cache14dPct !== null || usage.heavyProject) && (
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 11, color: t.textSecondary }}
        >
          <span>
            {usage.cache14dPct !== null && (
              <>cache-read <b style={{ color: t.textPrimary }}>{usage.cache14dPct}%</b></>
            )}
          </span>
          <span>
            {usage.heavyProject && (
              <>heavy: <b style={{ color: t.textPrimary }}>{usage.heavyProject.name} {usage.heavyProject.pct}%</b></>
            )}
          </span>
        </div>
      )}
    </>
  );
}

function AppsPage({ t, usage }: { t: Tokens; usage: UsageSnapshot }) {
  // "Other apps" aggregate always sits last (spec §4 p2)
  const named = usage.sdkByApp.filter((r) => r.app !== "Other apps").sort((a, b) => b.usd - a.usd);
  const other = usage.sdkByApp.filter((r) => r.app === "Other apps");
  const rows = [...named, ...other];
  const total = rows.reduce((s, r) => s + r.usd, 0);
  const colors = [t.accent, t.neutral, t.green]; // >3 apps: extras neutral

  if (rows.length === 0) {
    return (
      <EmptyCard t={t}>
        {usage.sync.localScan
          ? "no SDK usage this cycle"
          : "reading local data…"}
      </EmptyCard>
    );
  }

  return (
    <div
      style={{
        borderRadius: 12,
        background: t.lightSurface ? t.cardBg : "rgba(255,255,255,0.04)",
        border: `1px solid ${t.cardBorder}`,
        padding: 13,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {rows.map((r, i) => (
        <div key={r.app}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span>{r.app}</span>
            <b className="mono">${r.usd.toFixed(2)}</b>
          </div>
          <div className="bar-track" style={{ background: t.track, marginTop: 5 }}>
            <div
              className="bar-fill"
              style={{ width: `${(r.usd / total) * 100}%`, background: colors[i] ?? t.neutral }}
            />
          </div>
        </div>
      ))}
      <div
        style={{
          borderTop: `1px solid ${t.footerBorder}`,
          paddingTop: 9,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: t.textSecondary,
        }}
      >
        <span>this cycle</span>
        <b className="mono" style={{ color: t.textPrimary }}>
          {usage.sdkCredits
            ? `$${usage.sdkCredits.spentUsd.toFixed(2)} / ${fmtUsd(usage.sdkCredits.poolUsd)}`
            : "–"}
        </b>
      </div>
    </div>
  );
}

function EmptyCard({ t, children }: { t: Tokens; children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 12,
        background: t.lightSurface ? t.cardBg : "rgba(255,255,255,0.04)",
        border: `1px solid ${t.cardBorder}`,
        padding: "32px 16px",
        textAlign: "center",
        fontSize: 11,
        color: t.textSecondary,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
