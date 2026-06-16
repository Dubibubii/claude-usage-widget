// State model — verbatim from the design handoff README (§State Management).

export type MeterId =
  | "session5h"
  | "weeklyAll"
  | "allTimeTokens"
  | "opusVsSonnet";

export type WidgetStyle =
  | "ring"
  | "naked"
  | "dot"
  | "countdown"
  | "battery"
  | "spark"
  | "segments";

export type SkinId =
  | "glass"
  | "amberHud"
  | "warmLedger"
  | "midnightOled"
  | "paper"
  | "synthwave";

export type Corner = "tl" | "tr" | "bl" | "br";
export type TabId = "limits" | "history" | "edit" | "skills" | "theme";
export type PlanId = "pro" | "max5x" | "max20x";

export interface MeterRow {
  id: MeterId;
  /** shown in the MINIMISED pill (✕ in Edit toggles this; multiple enabled
   * %-meters → multi-ring). Rows always keep their card in the Usage-limits
   * grid — the pill is the only thing ✕ hides. (Replaced the old ◎ pin +
   * separate hide: two controls for one concept confused users.) */
  enabled: boolean;
}

export interface UsageSnapshot {
  /** null until the first statusline capture exists ("awaiting sync") */
  session5h: { pct: number; resetsAt: string } | null;
  weeklyAll: { pct: number; resetsAt: string } | null;
  allTimeTokens: { total: number; since: string | null } | null;
  history14d: { date: string; peakWeeklyPct: number }[];
  /** last 14 days of transcript-derived activity (always populated once the
   * local scan ran — gives History real data on first launch) */
  dailyActivity: { date: string; totalTokens: number; costUsd: number }[];
  /** derived insights (insights.ts) — null when not enough data */
  cache14dPct: number | null;
  heavyProject: { name: string; pct: number } | null;
  weeklyTrendPerDay: number | null;
  /** when each source last delivered (null = never) */
  sync: { rateLimits: string | null; localScan: string | null };
}

export interface SetupState {
  plan: PlanId;
  monthlyResetDay: number; // 1–28
  weeklyResetDow: number; // 0–6 (Sun–Sat)
  weeklyResetTime: string; // 'HH:mm'
  completed: boolean;
}

export interface UiState {
  expanded: boolean;
  tab: TabId;
  historyPage: 0 | 1;
  corner: Corner;
  theme: "auto";
}

export interface CustomizationState {
  style: WidgetStyle;
  skin: SkinId;
}

export interface EntitlementState {
  customizationActive: boolean;
  /** email used at checkout — the license identifier (null = dev unlock) */
  licenseEmail: string | null;
  /** last successful validation (ISO); drives revalidation + offline grace */
  validatedAt: string | null;
}

export interface WidgetState {
  meters: MeterRow[]; // array order = display order
  setup: SetupState;
  ui: UiState;
  customization: CustomizationState;
  entitlement: EntitlementState;
}

export const METER_LABELS: Record<MeterId, string> = {
  session5h: "5-hr session",
  weeklyAll: "Weekly · all models",
  allTimeTokens: "All-time tokens",
  opusVsSonnet: "Opus vs Sonnet",
};

export const HOT_THRESHOLD = 75; // isHot(m) = pct >= 75
