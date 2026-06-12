// Design tokens — verbatim from the handoff README token tables and the
// spec board's skin definitions (§3d). Glass has a dark/light pair driven by
// the OS; the five paid skins are fixed palettes that override auto theming.

import type { SkinId } from "../state/types";

export interface Tokens {
  name: string;
  /** true for palettes rendered on light surfaces (drives demo scenery only) */
  lightSurface: boolean;

  panelBg: string;
  panelBorder: string;
  panelBlur: string; // backdrop-filter value; never animated
  panelShadow: string;
  pillBg: string;
  pillBorder: string;
  pillBlur: string;
  pillShadow: string;

  cardBg: string;
  cardBorder: string;
  tabBarBg: string;
  tabActiveBg: string;
  iconBtnBorder: string;
  iconBtnHoverBg: string;
  footerBorder: string;
  lockedStripBg: string;
  lockedStripBorder: string;
  pillHoverBorder: string;

  textPrimary: string;
  textSecondary: string;

  accent: string; // fills (rings, bars, CTA)
  accentText: string; // accent used as text (light glass deepens it)
  glowRing: string; // box-shadow for hot rings (~10px)
  glowBar: string; // box-shadow for hot bars (~8px)
  accentTintBg: string;
  accentTintBorder: string;

  neutral: string;
  green: string;
  track: string;
  ringTrack: string;
  ringHole: string;

  /** traffic-light heat scale for meter fills: <50 green · <75 yellow ·
   * <90 orange · ≥90 red (user override of the spec's neutral/accent rule —
   * grey rings merged into grey backgrounds) */
  heatGreen: string;
  heatYellow: string;
  heatOrange: string;
  heatRed: string;

  ctaText: string;
  /** capsule radius for the collapsed container (999 except square-ish skins) */
  pillRadius: number;
  /** Paper skin: heat communicated by fill only */
  noGlow?: boolean;
}

export const darkGlass: Tokens = {
  name: "Dark Glass",
  lightSurface: false,
  panelBg: "rgba(24,26,33,0.92)",
  panelBorder: "rgba(255,255,255,0.12)",
  panelBlur: "blur(20px)",
  // drop shadows removed from spec values: on the transparent native window
  // they composite onto the desktop as a muddy halo (user feedback); the
  // inset top highlight stays — it lives inside the shape
  panelShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
  // denser than spec (0.85): the pill has no OS blur behind it (vibrancy is
  // panel-only after user feedback), so it carries its own opacity
  pillBg: "rgba(28,30,38,0.92)",
  pillBorder: "rgba(255,255,255,0.12)",
  pillBlur: "blur(12px)",
  pillShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  cardBg: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.07)",
  tabBarBg: "rgba(255,255,255,0.05)",
  tabActiveBg: "rgba(255,143,107,0.16)",
  iconBtnBorder: "rgba(255,255,255,0.14)",
  iconBtnHoverBg: "rgba(255,255,255,0.08)",
  footerBorder: "rgba(255,255,255,0.08)",
  lockedStripBg: "rgba(255,255,255,0.03)",
  lockedStripBorder: "rgba(255,255,255,0.07)",
  pillHoverBorder: "rgba(255,255,255,0.25)",
  textPrimary: "#F0F0EE",
  textSecondary: "rgba(255,255,255,0.45)",
  accent: "#FF8F6B",
  accentText: "#FF8F6B",
  glowRing: "0 0 10px rgba(255,143,107,0.35)",
  glowBar: "0 0 8px rgba(255,143,107,0.5)",
  accentTintBg: "rgba(255,143,107,0.08)",
  accentTintBorder: "rgba(255,143,107,0.25)",
  neutral: "#9BA3B5",
  green: "#6BD9A8",
  track: "rgba(255,255,255,0.10)",
  ringTrack: "rgba(255,255,255,0.10)",
  ringHole: "#1D1F26",
  heatGreen: "#6BD9A8",
  heatYellow: "#E8C76B",
  heatOrange: "#FF8F6B",
  heatRed: "#FF5F56",
  ctaText: "#1A1410",
  pillRadius: 999,
};

export const lightGlass: Tokens = {
  name: "Light Glass",
  lightSurface: true,
  panelBg: "rgba(255,255,255,0.38)",
  panelBorder: "rgba(255,255,255,0.70)",
  panelBlur: "blur(28px) saturate(1.6)",
  // drop shadows removed (desktop halo — see darkGlass note)
  panelShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
  // denser than spec (0.42): no OS blur behind the pill (vibrancy is
  // panel-only after user feedback)
  pillBg: "rgba(255,255,255,0.66)",
  pillBorder: "rgba(255,255,255,0.70)",
  pillBlur: "blur(18px) saturate(1.6)",
  pillShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
  cardBg: "rgba(255,255,255,0.50)",
  cardBorder: "rgba(255,255,255,0.65)",
  tabBarBg: "rgba(28,30,38,0.05)",
  tabActiveBg: "rgba(224,106,67,0.13)",
  iconBtnBorder: "rgba(28,30,38,0.12)",
  iconBtnHoverBg: "rgba(28,30,38,0.05)",
  footerBorder: "rgba(28,30,38,0.08)",
  lockedStripBg: "rgba(28,30,38,0.025)",
  lockedStripBorder: "rgba(28,30,38,0.06)",
  pillHoverBorder: "rgba(28,30,38,0.22)",
  textPrimary: "#1C1E26",
  textSecondary: "rgba(28,30,38,0.45)",
  accent: "#E06A43",
  accentText: "#D45A33",
  glowRing: "0 0 10px rgba(224,106,67,0.3)",
  glowBar: "0 0 8px rgba(224,106,67,0.4)",
  accentTintBg: "rgba(224,106,67,0.07)",
  accentTintBorder: "rgba(224,106,67,0.30)",
  neutral: "#7A8294",
  green: "#3FA873",
  track: "rgba(28,30,38,0.08)",
  ringTrack: "rgba(28,30,38,0.10)",
  ringHole: "#FBFBFD",
  heatGreen: "#3FA873",
  heatYellow: "#C9A227",
  heatOrange: "#E06A43",
  heatRed: "#D93B3B",
  ctaText: "#FFF6F2",
  pillRadius: 999,
};

/** Build a full token set from a skin's palette chip (spec §3d / README skins table).
 * Skins specify bg/border/accent/neutral/green/track/radius/shadow; text colors
 * are derived to read on each palette (flagged as derivation in the handoff).
 * Exported for the paid theme pack (src/paid/, private repo). */
export function buildSkin(
  partial: Pick<
    Tokens,
    | "name"
    | "lightSurface"
    | "accent"
    | "neutral"
    | "green"
    | "textPrimary"
    | "textSecondary"
  > & {
    bg: string;
    border: string;
    track: string;
    radius: number;
    shadow: string;
    noGlow?: boolean;
    glowSize?: string;
    /** optional heat overrides (Paper keeps its monochrome calm) */
    heatYellow?: string;
    heatRed?: string;
  },
): Tokens {
  const a = partial.accent;
  const tint = (alpha: number) => hexToRgba(a, alpha);
  // drop-shadow segments paint a halo onto the desktop through the
  // transparent window — keep only inset segments from skin shadows
  const shadow = insetOnly(partial.shadow);
  return {
    name: partial.name,
    lightSurface: partial.lightSurface,
    panelBg: partial.bg,
    panelBorder: partial.border,
    panelBlur: "blur(20px)",
    panelShadow: shadow,
    pillBg: partial.bg,
    pillBorder: partial.border,
    pillBlur: "blur(12px)",
    pillShadow: shadow,
    cardBg: partial.lightSurface ? "rgba(28,30,38,0.04)" : "rgba(255,255,255,0.05)",
    cardBorder: partial.lightSurface ? "rgba(28,30,38,0.10)" : "rgba(255,255,255,0.09)",
    tabBarBg: partial.lightSurface ? "rgba(28,30,38,0.05)" : "rgba(255,255,255,0.05)",
    tabActiveBg: tint(0.15),
    iconBtnBorder: partial.lightSurface ? "rgba(28,30,38,0.14)" : "rgba(255,255,255,0.14)",
    iconBtnHoverBg: partial.lightSurface ? "rgba(28,30,38,0.05)" : "rgba(255,255,255,0.08)",
    footerBorder: partial.lightSurface ? "rgba(28,30,38,0.08)" : "rgba(255,255,255,0.08)",
    lockedStripBg: partial.lightSurface ? "rgba(28,30,38,0.025)" : "rgba(255,255,255,0.03)",
    lockedStripBorder: partial.lightSurface ? "rgba(28,30,38,0.06)" : "rgba(255,255,255,0.07)",
    pillHoverBorder: partial.lightSurface ? "rgba(28,30,38,0.30)" : "rgba(255,255,255,0.30)",
    textPrimary: partial.textPrimary,
    textSecondary: partial.textSecondary,
    accent: a,
    accentText: a,
    glowRing: partial.noGlow ? "none" : `0 0 10px ${tint(0.4)}`,
    glowBar: partial.noGlow ? "none" : `0 0 8px ${tint(0.5)}`,
    accentTintBg: tint(0.08),
    accentTintBorder: tint(0.3),
    neutral: partial.neutral,
    green: partial.green,
    track: partial.track,
    ringTrack: partial.track,
    ringHole: partial.bg,
    heatGreen: partial.green,
    heatYellow: partial.heatYellow ?? (partial.lightSurface ? "#C9A227" : "#E8C76B"),
    heatOrange: a,
    heatRed: partial.heatRed ?? (partial.lightSurface ? "#D93B3B" : "#FF5F56"),
    ctaText: partial.lightSurface ? "#FFFFFF" : "#10100C",
    pillRadius: partial.radius,
    noGlow: partial.noGlow,
  };
}

/** Keep only `inset …` segments of a box-shadow list (split on top-level
 * commas; rgba() commas are inside parens). "none" when nothing remains. */
export function insetOnly(shadow: string): string {
  const kept: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of shadow) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      kept.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  kept.push(cur);
  const insets = kept.map((s) => s.trim()).filter((s) => s.startsWith("inset"));
  return insets.length > 0 ? insets.join(", ") : "none";
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const SKIN_NAMES: Record<SkinId, string> = {
  glass: "Glass",
  amberHud: "Amber HUD",
  warmLedger: "Warm Ledger",
  midnightOled: "Midnight OLED",
  paper: "Paper",
  synthwave: "Synthwave",
};

/** Storefront preview chips for the Theme tab's locked cards — public by
 * design (users must see what they'd buy; spec §6). The FULL skin token sets
 * live in the paid pack (src/paid/, private repo). */
export interface SkinPreviewChip {
  bg: string;
  border: string;
  radius: number;
  accent: string;
  track: string;
  hole: string;
}

export const SKIN_PREVIEWS: Record<Exclude<SkinId, "glass">, SkinPreviewChip> = {
  amberHud: { bg: "#12140C", border: "#4A3F22", radius: 6, accent: "#FFB454", track: "rgba(255,255,255,0.14)", hole: "#12140C" },
  warmLedger: { bg: "#FBF7F0", border: "#D9CBB4", radius: 999, accent: "#C15F3C", track: "#EAE1D2", hole: "#FBF7F0" },
  midnightOled: { bg: "#000000", border: "#1E2630", radius: 999, accent: "#22D3EE", track: "rgba(255,255,255,0.12)", hole: "#000000" },
  paper: { bg: "#F7F7F5", border: "#D4D4D0", radius: 3, accent: "#1A1A1A", track: "#E4E4E0", hole: "#F7F7F5" },
  synthwave: { bg: "#16102E", border: "#5B2E9E", radius: 999, accent: "#FF2EC4", track: "rgba(255,255,255,0.12)", hole: "#16102E" },
};
