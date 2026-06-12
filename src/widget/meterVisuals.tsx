// Shared meter rendering primitives — used by the built-in ring style and by
// the paid style pack (src/paid/, distributed separately).

import type { Tokens } from "../theme/tokens";
import type { MeterReading } from "../state/store";

/** Traffic-light heat scale (user override of the spec's neutral/accent
 * rule — a grey ring merged into grey backgrounds):
 * <50 green · <75 yellow · <90 orange · ≥90 red. */
export function heatColor(pct: number | null, t: Tokens): string {
  if (pct === null) return t.neutral;
  if (pct < 50) return t.heatGreen;
  if (pct < 75) return t.heatYellow;
  if (pct < 90) return t.heatOrange;
  return t.heatRed;
}

/** Glow accompanies the hot stages (≥75) unless the skin opts out. */
export function heatGlow(pct: number | null, t: Tokens, size = 10): string | undefined {
  if (t.noGlow || pct === null || pct < 75) return undefined;
  return `0 0 ${size}px ${withAlpha(heatColor(pct, t), 0.45)}`;
}

export function ringColor(r: MeterReading, _multi: boolean, t: Tokens): string {
  return heatColor(r.pct, t);
}

export function Numeral({ meter, color }: { meter: MeterReading | null; color: string }) {
  if (!meter) return null;
  return (
    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color }}>
      {meter.pct === null ? "–" : `${Math.round(meter.pct)}%`}
    </span>
  );
}

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}
