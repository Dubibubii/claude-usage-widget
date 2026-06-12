import { useRef, useState } from "react";
import { useStore } from "../../state/store";
import type { Tokens } from "../../theme/tokens";
import { METER_LABELS, type MeterId, type UsageSnapshot } from "../../state/types";

const ROW_STRIDE = 41; // row height 34 + 7px gap

/** Edit tab (spec §5, simplified): reorder + ✕ (40% + strikethrough = out of
 * the minimised pill; click again to restore), add chips, locked structures
 * strip, subtle setup gear. The old ◎ pin is gone — ✕ is the one control,
 * and it only affects the pill (cards always stay in Usage limits). */
export function EditTab({ t, usage }: { t: Tokens; usage: UsageSnapshot }) {
  const { state, dispatch } = useStore();
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number } | null>(null);
  const startY = useRef(0);

  const rows = state.meters;

  const onHandleDown = (index: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    setDrag({ from: index, to: index, dy: 0 });
  };
  const onHandleMove = (index: number) => (e: React.PointerEvent) => {
    if (!drag) return;
    const dy = e.clientY - startY.current;
    const to = Math.max(0, Math.min(rows.length - 1, drag.from + Math.round(dy / ROW_STRIDE)));
    setDrag({ ...drag, to, dy });
  };
  const onHandleUp = () => {
    if (drag && drag.to !== drag.from) {
      dispatch({ type: "reorderMeters", from: drag.from, to: drag.to });
    }
    setDrag(null);
  };

  // "Opus vs Sonnet · soon" placeholder chip cut: no dead promises in 304px
  const addable: { id: MeterId; label: string }[] = [
    { id: "allTimeTokens", label: "all-time tokens" },
  ];

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.map((m, i) => {
          const dragging = drag?.from === i;
          const isSlot = drag && !dragging && drag.to === i;
          return (
            <div key={m.id}>
              {isSlot && drag!.to < drag!.from && <DropSlot t={t} />}
              <div
                className={dragging ? "edit-row-dragging" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  borderRadius: 10,
                  background: dragging
                    ? t.lightSurface
                      ? "rgba(255,255,255,0.95)"
                      : "rgba(40,43,52,0.98)"
                    : t.cardBg,
                  border: `1px solid ${dragging ? withAlpha(t.accent, 0.5) : t.cardBorder}`,
                  padding: "9px 11px",
                  opacity: m.enabled ? 1 : 0.4,
                  position: "relative",
                  transform: dragging ? `translateY(${drag!.dy}px) scale(1.02)` : undefined,
                  zIndex: dragging ? 5 : undefined,
                }}
              >
                <span
                  onPointerDown={onHandleDown(i)}
                  onPointerMove={onHandleMove(i)}
                  onPointerUp={onHandleUp}
                  style={{
                    color: dragging ? t.accent : withAlpha(t.textPrimary, 0.3),
                    cursor: dragging ? "grabbing" : "grab",
                    touchAction: "none",
                  }}
                >
                  ⠿
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 12,
                    textDecoration: m.enabled ? undefined : "line-through",
                  }}
                >
                  {METER_LABELS[m.id]}
                </span>
                {m.enabled ? (
                  <span
                    className="accent-hover hov"
                    title="Hide from the minimised widget"
                    onClick={() => dispatch({ type: "toggleMeterHidden", id: m.id })}
                    style={{ fontSize: 11, color: withAlpha(t.textPrimary, 0.4), cursor: "pointer" }}
                  >
                    ✕
                  </span>
                ) : (
                  <span
                    title="Show in the minimised widget"
                    onClick={() => dispatch({ type: "toggleMeterHidden", id: m.id })}
                    style={{
                      fontSize: 11,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: t.lightSurface ? "rgba(28,30,38,0.8)" : "rgba(255,255,255,0.85)",
                      color: t.lightSurface ? "#FFF" : "#16181F",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </span>
                )}
              </div>
              {isSlot && drag!.to > drag!.from && <DropSlot t={t} />}
            </div>
          );
        })}
      </div>

      {/* add chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
        {addable.map((a) => {
          const added = rows.some((m) => m.id === a.id);
          return (
            <span
              key={a.id}
              className={added ? undefined : "chip hov"}
              onClick={() =>
                added
                  ? dispatch({ type: "removeMeter", id: a.id })
                  : dispatch({ type: "addMeter", id: a.id })
              }
              style={{
                fontSize: 11,
                border: added ? `1px solid ${withAlpha(t.accent, 0.4)}` : `1px dashed ${withAlpha(t.textPrimary, 0.25)}`,
                borderRadius: 999,
                padding: "4px 11px",
                color: added ? t.accentText : t.textSecondary,
                background: added ? t.accentTintBg : "transparent",
                cursor: "pointer",
              }}
            >
              {added ? `✓ ${a.label}` : `+ ${a.label}`}
            </span>
          );
        })}
      </div>

      {/* (the spec's "🔒 Panel structures" upsell strip was cut: it advertised
          an unbuilt paid feature, and the Theme tab one tab over already
          carries the unlock CTA — audit verdict) */}

      {/* setup re-entry — subtle gear (spec §4: bottom of Edit tab, right-aligned) */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <span
          className="accent-hover hov"
          title="Re-run setup"
          onClick={() => dispatch({ type: "reopenSetup" })}
          style={{ fontSize: 16, color: t.textSecondary, cursor: "pointer", lineHeight: 1 }}
        >
          ⚙
        </span>
      </div>
    </div>
  );
}

function DropSlot({ t }: { t: Tokens }) {
  return (
    <div
      style={{
        border: `1.5px dashed ${t.accent}`,
        borderRadius: 10,
        height: 34,
        marginBottom: 7,
      }}
    />
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
