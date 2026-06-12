import type { Tokens } from "../theme/tokens";

/** Conic donut (spec §1): conic fill from 12 o'clock clockwise = meter %,
 * remainder = ring track; hole = inner circle inset 4px (at 20px size). */
export function Ring({
  pct,
  color,
  glow,
  size = 20,
  t,
}: {
  pct: number;
  color: string;
  /** box-shadow value (heat glow) or undefined */
  glow?: string;
  size?: number;
  t: Tokens;
}) {
  const inset = size * 0.2; // 4px at 20px
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="ring"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        ["--pct" as string]: `${p}%`,
        background: `conic-gradient(${color} 0 var(--pct), ${t.ringTrack} var(--pct) 100%)`,
        boxShadow: glow,
      }}
    >
      <div className="hole" style={{ inset, background: t.ringHole }} />
    </div>
  );
}
