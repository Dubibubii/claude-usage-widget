import { useState } from "react";
import { useStore } from "../../state/store";
import { SKIN_NAMES, SKIN_PREVIEWS, type Tokens } from "../../theme/tokens";
import type { SkinId, WidgetStyle } from "../../state/types";
import { CHECKOUT_URL, LICENSE_API } from "../../config";
import { validateLicense } from "../../data/license";
import { openExternal } from "../../platform/native";

const STYLES: { id: WidgetStyle; label: string }[] = [
  { id: "ring", label: "Ring pill" },
  { id: "naked", label: "Naked bars" },
  { id: "dot", label: "Status dot" },
  { id: "countdown", label: "Countdown" },
  { id: "battery", label: "Battery" },
  { id: "spark", label: "Sparkline" },
  { id: "segments", label: "Segments" },
];

const SKINS: SkinId[] = ["glass", "amberHud", "warmLedger", "midnightOled", "paper", "synthwave"];

/** 🔒 Theme — the only paid surface (spec §6). Free items selected with ✓;
 * locked cards at 55% opacity with 🔒-prefixed captions (always show names).
 * After purchase: locks disappear, cards apply instantly, selection persists. */
export function ThemeTab({ t }: { t: Tokens }) {
  const { state, dispatch } = useStore();
  const unlocked = state.entitlement.customizationActive;
  const { style, skin } = state.customization;

  return (
    <div>
      {/* CTA first — visible without scrolling (user request) */}
      {!unlocked && <UnlockSection t={t} />}

      <GroupLabel t={t} text="Widget style" mt={unlocked ? 0 : 14} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
        {STYLES.map((s) => (
          <ThemeCard
            key={s.id}
            t={t}
            label={s.label}
            free={s.id === "ring"}
            unlocked={unlocked}
            selected={style === s.id}
            onSelect={() => dispatch({ type: "setStyle", style: s.id })}
          >
            <StylePreview id={s.id} t={t} />
          </ThemeCard>
        ))}
      </div>

      <GroupLabel t={t} text="Skins" mt={10} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
        {SKINS.map((id) => (
          <ThemeCard
            key={id}
            t={t}
            label={SKIN_NAMES[id]}
            free={id === "glass"}
            unlocked={unlocked}
            selected={skin === id}
            onSelect={() => dispatch({ type: "setSkin", skin: id })}
          >
            <SkinPreview id={id} t={t} />
          </ThemeCard>
        ))}
      </div>
    </div>
  );
}

function UnlockSection({ t }: { t: Tokens }) {
  const { dispatch } = useStore();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "inactive" | "error">("idle");

  const activate = async () => {
    if (!email.includes("@")) return;
    setStatus("checking");
    const result = await validateLicense(email.trim());
    if (result === "active") {
      dispatch({ type: "activateLicense", email: email.trim(), at: new Date().toISOString() });
    } else {
      setStatus(result === "inactive" ? "inactive" : "error");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 14 }}>
      <span
        className="hov cta"
        onClick={() => void openExternal(CHECKOUT_URL)}
        style={{
          display: "inline-block",
          borderRadius: 999,
          padding: "8px 18px",
          fontSize: 12,
          fontWeight: 600,
          background: t.accent,
          color: t.ctaText,
          cursor: "pointer",
          boxShadow: t.noGlow ? undefined : `0 4px 16px ${withAlpha(t.accent, 0.35)}`,
        }}
      >
        Unlock themes · $5/mo
      </span>
      <div style={{ fontSize: 10.5, color: withAlpha(t.textPrimary, 0.35), marginTop: 7 }}>
        tracking stays free, forever
      </div>

      {LICENSE_API ? (
        <div style={{ marginTop: 10, display: "flex", gap: 6, justifyContent: "center" }}>
          <input
            type="email"
            placeholder="checkout email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setStatus("idle");
            }}
            onKeyDown={(e) => e.key === "Enter" && activate()}
            style={{
              flex: 1,
              maxWidth: 180,
              fontSize: 11,
              fontFamily: "inherit",
              padding: "5px 10px",
              borderRadius: 8,
              border: `1px solid ${t.iconBtnBorder}`,
              background: "transparent",
              color: t.textPrimary,
              outline: "none",
            }}
          />
          <span
            className="accent-hover hov"
            onClick={activate}
            style={{ fontSize: 11, alignSelf: "center", color: t.textSecondary, cursor: "pointer" }}
          >
            {status === "checking" ? "checking…" : "Activate"}
          </span>
        </div>
      ) : (
        // license worker not deployed yet — keep a clearly-labeled dev unlock
        <div
          className="accent-hover hov"
          onClick={() => dispatch({ type: "unlockCustomization" })}
          style={{ fontSize: 10, color: withAlpha(t.textPrimary, 0.3), marginTop: 8, cursor: "pointer" }}
        >
          dev unlock (license service not deployed)
        </div>
      )}
      {status === "inactive" && (
        <div style={{ fontSize: 10.5, color: t.accentText, marginTop: 6 }}>
          no subscription for that email — complete checkout first, then
          activate with the same email
        </div>
      )}
      {status === "error" && (
        <div style={{ fontSize: 10.5, color: t.accentText, marginTop: 6 }}>
          couldn't reach the license service — try again shortly
        </div>
      )}
    </div>
  );
}

function GroupLabel({ t, text, mt }: { t: Tokens; text: string; mt: number }) {
  return (
    <div
      style={{
        fontSize: 10,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: t.textSecondary,
        margin: `${mt}px 0 7px`,
      }}
    >
      {text}
    </div>
  );
}

function ThemeCard({
  t,
  label,
  free,
  unlocked,
  selected,
  onSelect,
  children,
}: {
  t: Tokens;
  label: string;
  free: boolean;
  unlocked: boolean;
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const selectable = free || unlocked;
  const locked = !selectable;
  return (
    <div
      onClick={() => selectable && onSelect()}
      style={{
        borderRadius: 10,
        padding: "7px 3px 6px",
        textAlign: "center",
        background: selected ? t.accentTintBg : t.cardBg,
        border: `1px solid ${selected ? withAlpha(t.accent, 0.5) : t.cardBorder}`,
        opacity: locked ? 0.55 : 1,
        cursor: selectable ? "pointer" : "default",
      }}
    >
      <div style={{ height: 20, display: "grid", placeItems: "center", marginBottom: 4 }}>{children}</div>
      <div style={{ fontSize: 9.5, color: selected ? t.accentText : t.textSecondary }}>
        {locked ? `🔒 ${label}` : selected ? `✓ ${label}` : label}
      </div>
    </div>
  );
}

/** 20px-tall mini previews of each collapsed form. */
function StylePreview({ id, t }: { id: WidgetStyle; t: Tokens }) {
  switch (id) {
    case "ring":
      return (
        <div style={{ position: "relative", width: 14, height: 14, borderRadius: "50%", background: `conic-gradient(${t.accent} 0 81%, ${t.ringTrack} 81% 100%)` }}>
          <div style={{ position: "absolute", inset: 3, borderRadius: "50%", background: t.ringHole }} />
        </div>
      );
    case "naked":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {[62, 81, 24].map((p, i) => (
            <div key={i} style={{ width: 22, height: 3, borderRadius: 1.5, background: t.track }}>
              <div style={{ width: `${p}%`, height: "100%", borderRadius: 1.5, background: i === 1 ? t.accent : t.neutral }} />
            </div>
          ))}
        </div>
      );
    case "dot":
      return <div style={{ width: 9, height: 9, borderRadius: "50%", background: t.accent, boxShadow: t.noGlow ? undefined : `0 0 6px ${withAlpha(t.accent, 0.6)}` }} />;
    case "countdown":
      return (
        <span className="mono" style={{ fontSize: 9, fontWeight: 600, color: t.accentText }}>
          <span style={{ color: t.neutral }}>▷</span> 1h 48m
        </span>
      );
    case "battery":
      return (
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 18, height: 9, border: `1px solid ${t.neutral}`, borderRadius: 2, padding: 1, display: "flex" }}>
            <div style={{ width: "20%", background: t.accent, borderRadius: 1 }} />
          </div>
          <div style={{ width: 2, height: 4, background: t.neutral }} />
        </div>
      );
    case "spark":
      return (
        <svg width={24} height={12} viewBox="0 0 24 12">
          <polyline points="0,9 4,7 8,8 12,5 16,6 20,2 24,4" fill="none" stroke={t.accent} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "segments":
      return (
        <div style={{ display: "flex", gap: 1.5 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={{ width: 2.5, height: 9, borderRadius: 0.5, background: i < 6 ? t.accent : t.track }} />
          ))}
        </div>
      );
  }
}

/** Skin preview: a tiny chip in that skin's bg/border/radius holding a 10px
 * accent donut. Uses public storefront chips (full skins live in the pack). */
function SkinPreview({ id, t }: { id: SkinId; t: Tokens }) {
  const s = id === "glass" ? null : SKIN_PREVIEWS[id];
  const bg = s ? s.bg : t.pillBg;
  const border = s ? s.border : t.pillBorder;
  const radius = s ? Math.min(s.radius, 10) : 10;
  const accent = s ? s.accent : t.accent;
  const track = s ? s.track : t.ringTrack;
  const hole = s ? s.hole : t.ringHole;
  return (
    <div
      style={{
        padding: "3px 8px",
        borderRadius: radius,
        background: bg,
        border: `1px solid ${border}`,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div style={{ position: "relative", width: 10, height: 10, borderRadius: "50%", background: `conic-gradient(${accent} 0 81%, ${track} 81% 100%)` }}>
        <div style={{ position: "absolute", inset: 2.5, borderRadius: "50%", background: hole }} />
      </div>
    </div>
  );
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
