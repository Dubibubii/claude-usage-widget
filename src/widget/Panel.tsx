import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import type { Tokens } from "../theme/tokens";
import type { TabId, UsageSnapshot } from "../state/types";
import { agoLabel, minutesAgo } from "../data/format";
import { exportLog, logMeta, LOG_FILENAME, type LogMeta } from "../export/usageLog";
import { LimitsTab } from "./tabs/LimitsTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { EditTab } from "./tabs/EditTab";
import { ThemeTab } from "./tabs/ThemeTab";
import { SkillsTab } from "./tabs/SkillsTab";

const TABS: { id: TabId; label: string }[] = [
  { id: "limits", label: "Limits" }, // "Usage limits" shortened: 5 tabs in 304px
  { id: "history", label: "History" },
  { id: "edit", label: "Edit" },
  { id: "skills", label: "Skills" },
  { id: "theme", label: "🔒 Theme" }, // lock + word: users must see what's locked
];

export function Panel({
  t,
  usage,
  now,
  onCollapse,
}: {
  t: Tokens;
  usage: UsageSnapshot;
  now: Date;
  onCollapse: () => void;
}) {
  const { state, dispatch } = useStore();
  const tab = state.ui.tab;
  const themeLabel = state.entitlement.customizationActive ? "Theme" : "🔒 Theme";

  return (
    <div
      style={{
        width: 336,
        borderRadius: 18,
        background: t.panelBg,
        border: `1px solid ${t.panelBorder}`,
        boxShadow: t.panelShadow,
        backdropFilter: t.panelBlur,
        WebkitBackdropFilter: t.panelBlur,
        padding: 16,
        color: t.textPrimary,
      }}
    >
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>Claude usage</div>
        {/* single close control — export lives in the footer only (a second
            ⤓ up here duplicated it; user-flagged redundancy) */}
        <IconBtn t={t} title="Collapse" size={11} onClick={onCollapse}>✕</IconBtn>
      </div>

      {/* segmented tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: t.tabBarBg, borderRadius: 10, padding: 3 }}>
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <div
              key={id}
              className="tab-seg"
              onClick={() => dispatch({ type: "setTab", tab: id })}
              style={{
                flex: 1,
                textAlign: "center",
                whiteSpace: "nowrap",
                borderRadius: 8,
                padding: "5px 8px",
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? t.accentText : t.textSecondary,
                background: active ? t.tabActiveBg : "transparent",
                cursor: "pointer",
              }}
            >
              {id === "theme" ? themeLabel : label}
            </div>
          );
        })}
      </div>

      {/* content — FIXED height so tab switches never change panel height;
          taller tabs (Theme, long Edit) scroll inside (user-approved) */}
      <div className="panel-content" style={{ height: 236, overflowY: "auto", overflowX: "hidden" }}>
        {tab === "limits" && <LimitsTab t={t} usage={usage} now={now} />}
        {tab === "history" && <HistoryTab t={t} usage={usage} />}
        {tab === "edit" && <EditTab t={t} usage={usage} />}
        {tab === "skills" && <SkillsTab t={t} />}
        {tab === "theme" && <ThemeTab t={t} />}
      </div>

      {/* footer */}
      <Footer t={t} usage={usage} now={now} />
    </div>
  );
}

export function IconBtn({
  t,
  title,
  size,
  onClick,
  children,
  width = 24,
}: {
  t: Tokens;
  title?: string;
  size: number;
  onClick?: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div
      className="icon-btn hov"
      title={title}
      onClick={onClick}
      style={{
        width,
        height: 24,
        borderRadius: 7,
        border: `1px solid ${t.iconBtnBorder}`,
        display: "grid",
        placeItems: "center",
        fontSize: size,
        cursor: "pointer",
        color: t.lightSurface ? "rgba(28,30,38,0.55)" : "rgba(255,255,255,0.65)",
      }}
    >
      {children}
    </div>
  );
}

function Footer({ t, usage, now }: { t: Tokens; usage: UsageSnapshot; now: Date }) {
  const synced = usage.sync.rateLimits;
  const syncAge = synced ? minutesAgo(synced, now) : null;
  const stale = syncAge !== null && syncAge > 15;
  const [meta, setMeta] = useState<LogMeta | null>(null);
  useEffect(() => {
    logMeta().then(setMeta);
  }, [now]);
  const writeAge = meta ? minutesAgo(meta.mtime, now) : null;

  return (
    <div
      style={{
        borderTop: `1px solid ${t.footerBorder}`,
        marginTop: 13,
        paddingTop: 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span
        className="accent-hover hov"
        onClick={exportLog}
        style={{
          fontSize: 11,
          color: t.lightSurface ? "rgba(28,30,38,0.55)" : "rgba(255,255,255,0.6)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        ⤓ Export <span className="mono">.md</span>
      </span>
      {synced === null ? (
        // statusline registered but no capture written yet
        <span className="mono" style={{ fontSize: 10, color: t.accentText }}>
          waiting for first Claude turn
        </span>
      ) : stale ? (
        // old capture: still a valid floor while its window is open (shown in
        // the cards); only a rolled-over window needs a prompt to resync
        <span className="mono" style={{ fontSize: 10, color: t.accentText }}>
          {usage.session5h || usage.weeklyAll
            ? `synced ${agoLabel(synced, now)}`
            : "out of date — send any prompt"}
        </span>
      ) : (
        <span
          className="mono"
          style={{ fontSize: 10, color: t.lightSurface ? "rgba(28,30,38,0.35)" : "rgba(255,255,255,0.3)" }}
        >
          → {LOG_FILENAME} · {writeAge !== null ? `${writeAge}m ago` : "first write pending"}
        </span>
      )}
    </div>
  );
}
