import { useState } from "react";
import { useStore } from "../state/store";
import type { Tokens } from "../theme/tokens";
import type { PlanId } from "../state/types";

const PLANS: { id: PlanId; label: string }[] = [
  { id: "pro", label: "Pro" },
  { id: "max5x", label: "Max 5×" },
  { id: "max20x", label: "Max 20×" },
];

const DOWS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const TIMES = ["6:00", "7:00", "8:00", "9:00", "10:00", "11:00", "12:00"];

/** First-run setup (spec §4 + board §4): single 360px card, panel tokens.
 * Corner is never asked — the pill spawns bottom-right and the user drags. */
export function SetupCard({ t, onDone }: { t: Tokens; onDone: () => void }) {
  const { state, dispatch } = useStore();
  const [plan, setPlan] = useState<PlanId>(state.setup.plan);
  const [day, setDay] = useState(state.setup.monthlyResetDay);
  const [dow, setDow] = useState(state.setup.weeklyResetDow);
  const [time, setTime] = useState(state.setup.weeklyResetTime);
  const [leaving, setLeaving] = useState(false);

  const submit = () => {
    setLeaving(true);
    // card scales out 200ms, then the pill spawns with the expand curve in reverse
    setTimeout(() => {
      dispatch({
        type: "completeSetup",
        setup: { plan, monthlyResetDay: day, weeklyResetDow: dow, weeklyResetTime: time },
      });
      onDone();
    }, 200);
  };

  const groupLabel = {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    color: t.textSecondary,
    marginBottom: 6,
  };

  const chipStyle = {
    border: `1px solid ${t.iconBtnBorder}`,
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    color: t.textPrimary,
  };

  return (
    <div
      className={`setup-pop${leaving ? " leaving" : ""}`}
      style={{
        width: 360,
        borderRadius: 18,
        background: t.panelBg,
        border: `1px solid ${t.panelBorder}`,
        boxShadow: t.panelShadow,
        backdropFilter: t.panelBlur,
        WebkitBackdropFilter: t.panelBlur,
        padding: 20,
        color: t.textPrimary,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>Quick setup</div>
      <div style={{ fontSize: 12, color: t.textSecondary, margin: "4px 0 16px" }}>
        30 seconds. Everything stays on this device.
      </div>

      <div style={groupLabel}>Your plan</div>
      <div style={{ display: "flex", gap: 4, background: t.tabBarBg, borderRadius: 10, padding: 3, marginBottom: 14 }}>
        {PLANS.map((p) => {
          const active = plan === p.id;
          return (
            <span
              key={p.id}
              className="tab-seg"
              onClick={() => setPlan(p.id)}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px 0",
                borderRadius: 8,
                fontSize: 12,
                background: active ? t.tabActiveBg : "transparent",
                color: active ? t.accentText : t.textSecondary,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {p.label}
            </span>
          );
        })}
      </div>

      <div style={groupLabel}>When does your monthly plan reset?</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <label style={chipStyle}>
          the{" "}
          <select
            className="mono"
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            style={{ border: "none", color: t.textPrimary, fontWeight: 700, fontSize: 12 }}
          >
            {Array.from({ length: 28 }, (_, i) => (
              <option key={i + 1} value={i + 1} style={{ color: "#1C1E26" }}>
                {ordinal(i + 1)}
              </option>
            ))}
          </select>{" "}
          of each month ▾
        </label>
      </div>
      <div style={{ fontSize: 11, color: withAlpha(t.textPrimary, 0.35), marginBottom: 14 }}>
        the monthly window for your Agent SDK spend totals (upgraded plans usually reset on the upgrade day)
      </div>

      <div style={groupLabel}>Weekly limit resets</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <label style={chipStyle}>
          <select
            value={dow}
            onChange={(e) => setDow(Number(e.target.value))}
            style={{ border: "none", color: t.textPrimary, fontSize: 12 }}
          >
            {DOWS.map((d, i) => (
              <option key={d} value={i} style={{ color: "#1C1E26" }}>
                {d}
              </option>
            ))}
          </select>{" "}
          ▾
        </label>
        <label style={chipStyle} className="mono">
          <select
            className="mono"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{ border: "none", color: t.textPrimary, fontSize: 12 }}
          >
            {TIMES.map((h) => (
              <option key={h} value={`${h.padStart(5, "0")}`} style={{ color: "#1C1E26" }}>
                {formatAmPm(h)}
              </option>
            ))}
          </select>{" "}
          ▾
        </label>
      </div>

      <div
        className="hov cta"
        onClick={submit}
        style={{
          borderRadius: 999,
          padding: "9px 0",
          textAlign: "center",
          fontSize: 13,
          fontWeight: 600,
          background: t.accent,
          color: t.ctaText,
          cursor: "pointer",
          boxShadow: t.noGlow ? undefined : `0 4px 16px ${withAlpha(t.accent, 0.35)}`,
        }}
      >
        Start tracking →
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatAmPm(h: string): string {
  const hour = parseInt(h, 10);
  return hour >= 12 ? `${hour === 12 ? 12 : hour - 12}:00 pm` : `${hour}:00 am`;
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
