import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  HOT_THRESHOLD,
  type Corner,
  type MeterId,
  type MeterRow,
  type SetupState,
  type SkinId,
  type TabId,
  type UsageSnapshot,
  type WidgetState,
  type WidgetStyle,
} from "./types";

/** All meter ids the current build understands — used to drop stale rows
 * (e.g. the removed "sdkCredits") from persisted state on load. */
const KNOWN_METERS: ReadonlySet<string> = new Set([
  "session5h",
  "weeklyAll",
  "allTimeTokens",
  "opusVsSonnet",
]);

const STORAGE_KEY = "cuw-state-v1";

const defaultState: WidgetState = {
  // enabled = shown in the minimised pill; all rows keep their grid card.
  // Default pill = the 5-hr session ring only (locked product decision).
  meters: [
    { id: "session5h", enabled: true },
    { id: "weeklyAll", enabled: false },
  ],
  setup: {
    plan: "max5x",
    monthlyResetDay: 3,
    weeklyResetDow: 4, // Thursday
    weeklyResetTime: "09:00",
    completed: false,
  },
  ui: { expanded: false, tab: "limits", historyPage: 0, corner: "br", theme: "auto" },
  customization: { style: "ring", skin: "glass" },
  entitlement: { customizationActive: false, licenseEmail: null, validatedAt: null },
};

type Action =
  | { type: "expand"; tab?: TabId }
  | { type: "collapse" }
  | { type: "setTab"; tab: TabId }
  | { type: "setHistoryPage"; page: 0 | 1 }
  | { type: "setCorner"; corner: Corner }
  | { type: "toggleMeterHidden"; id: MeterId }
  | { type: "reorderMeters"; from: number; to: number }
  | { type: "addMeter"; id: MeterId }
  | { type: "removeMeter"; id: MeterId }
  | { type: "completeSetup"; setup: Omit<SetupState, "completed"> }
  | { type: "reopenSetup" }
  | { type: "setStyle"; style: WidgetStyle }
  | { type: "setSkin"; skin: SkinId }
  | { type: "unlockCustomization" } // dev fallback while no LICENSE_API is configured
  | { type: "activateLicense"; email: string; at: string }
  | { type: "refreshLicense"; at: string }
  | { type: "deactivateLicense" };

function reducer(s: WidgetState, a: Action): WidgetState {
  switch (a.type) {
    case "expand":
      return { ...s, ui: { ...s.ui, expanded: true, tab: a.tab ?? s.ui.tab } };
    case "collapse":
      return { ...s, ui: { ...s.ui, expanded: false } };
    case "setTab":
      return { ...s, ui: { ...s.ui, tab: a.tab } };
    case "setHistoryPage":
      return { ...s, ui: { ...s.ui, historyPage: a.page } };
    case "setCorner":
      return { ...s, ui: { ...s.ui, corner: a.corner } };
    case "toggleMeterHidden":
      return {
        ...s,
        meters: s.meters.map((m) =>
          m.id === a.id ? { ...m, enabled: !m.enabled } : m,
        ),
      };
    case "reorderMeters": {
      const meters = [...s.meters];
      const [moved] = meters.splice(a.from, 1);
      meters.splice(a.to, 0, moved);
      return { ...s, meters };
    }
    case "addMeter":
      if (s.meters.some((m) => m.id === a.id)) return s;
      return {
        ...s,
        meters: [...s.meters, { id: a.id, enabled: true }],
      };
    case "removeMeter":
      return { ...s, meters: s.meters.filter((m) => m.id !== a.id) };
    case "completeSetup":
      return { ...s, setup: { ...a.setup, completed: true } };
    case "reopenSetup":
      return { ...s, setup: { ...s.setup, completed: false }, ui: { ...s.ui, expanded: false } };
    case "setStyle":
      if (!s.entitlement.customizationActive && a.style !== "ring") return s;
      return { ...s, customization: { ...s.customization, style: a.style } };
    case "setSkin":
      if (!s.entitlement.customizationActive && a.skin !== "glass") return s;
      return { ...s, customization: { ...s.customization, skin: a.skin } };
    case "unlockCustomization":
      // dev-only fallback until the license worker is deployed (LICENSE_API set)
      return { ...s, entitlement: { ...s.entitlement, customizationActive: true } };
    case "activateLicense":
      return {
        ...s,
        entitlement: { customizationActive: true, licenseEmail: a.email, validatedAt: a.at },
      };
    case "refreshLicense":
      return { ...s, entitlement: { ...s.entitlement, validatedAt: a.at } };
    case "deactivateLicense":
      // selection reverts to free content via fallbacks (Glass + Ring)
      return {
        ...s,
        customization: { style: "ring", skin: "glass" },
        entitlement: { customizationActive: false, licenseEmail: null, validatedAt: null },
      };
  }
}

/** Migrate rows saved under the old model (separate ◎ pin + hide flags):
 * pinned meters become the pill set; with no pins the pill showed the first
 * enabled %-meter, so that one stays enabled and the rest drop out of the
 * pill (their grid cards are unaffected — the grid now always shows all rows). */
export function migrateMeters(rows: unknown): WidgetState["meters"] | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const meters = rows
    .filter((r): r is { id: MeterId; enabled?: boolean; pinnedToPill?: boolean } =>
      !!r && typeof (r as { id?: unknown }).id === "string" &&
      KNOWN_METERS.has((r as { id: string }).id)) // drops removed ids (e.g. sdkCredits)
    .map((r) => ({ id: r.id, enabled: r.enabled !== false, legacyPin: r.pinnedToPill === true }));
  if (meters.length === 0) return null;
  const isLegacy = rows.some((r) => typeof (r as { pinnedToPill?: unknown }).pinnedToPill === "boolean");
  if (!isLegacy) return meters.map(({ id, enabled }) => ({ id, enabled }));
  const anyPinned = meters.some((m) => m.legacyPin);
  const firstPct = meters.find((m) => m.enabled && PCT_METERS.has(m.id))?.id ?? null;
  // no pins and no enabled %-meter (firstPct null) → everything disabled,
  // i.e. an intentionally empty pill — matches the legacy display
  return meters.map(({ id, legacyPin }) => ({
    id,
    enabled: anyPinned ? legacyPin : id === firstPct,
  }));
}

function loadState(): WidgetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as WidgetState;
    return {
      ...defaultState,
      ...parsed,
      meters: migrateMeters(parsed.meters) ?? defaultState.meters,
      ui: { ...defaultState.ui, ...parsed.ui, expanded: false },
      setup: { ...defaultState.setup, ...parsed.setup },
      customization: { ...defaultState.customization, ...parsed.customization },
      entitlement: { ...defaultState.entitlement, ...parsed.entitlement },
    };
  } catch {
    return defaultState;
  }
}

const StoreCtx = createContext<{
  state: WidgetState;
  dispatch: (a: Action) => void;
} | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

// ---------- derived selectors (spec §State Management) ----------

export interface MeterReading {
  id: MeterId;
  /** null = awaiting sync (window meters) or inherently %-less (all-time) */
  pct: number | null;
  hot: boolean;
}

/** Meters that fill a ring with a limit %. Agent SDK is NOT one anymore:
 * Anthropic paused the separate SDK credit pool (announced May 2026, paused
 * on its June 15 launch day), so SDK usage counts toward the normal 5h +
 * weekly limits — there is no separate budget to show a % against. The SDK
 * card is now informational $ spend (like all-time tokens). */
export const PCT_METERS: ReadonlySet<MeterId> = new Set([
  "session5h",
  "weeklyAll",
]);

export function meterPct(id: MeterId, usage: UsageSnapshot): number | null {
  switch (id) {
    case "session5h":
      return usage.session5h?.pct ?? null;
    case "weeklyAll":
      return usage.weeklyAll?.pct ?? null;
    default:
      return null;
  }
}

export function readMeter(id: MeterId, usage: UsageSnapshot): MeterReading {
  const pct = meterPct(id, usage);
  return { id, pct, hot: pct !== null && pct >= HOT_THRESHOLD };
}

/** The pill shows every enabled %-meter in row order (max 5 rings); ✕ in
 * Edit is the only control. Everything ✕'d → empty (the pill renders its
 * "open Edit" capsule). No automatic worst-meter selection: the user picks
 * via Edit (✕/reorder). %-less meters (all-time tokens) never ring. */
export function pillMeters(meters: MeterRow[], usage: UsageSnapshot): MeterReading[] {
  // a %-meter still awaiting its first sync stays in the pill (dashed ring)
  return meters
    .filter((m) => m.enabled && PCT_METERS.has(m.id))
    .slice(0, 5)
    .map((m) => readMeter(m.id, usage));
}

/** The meter the pill's numeral (and countdown/battery/dot/spark styles)
 * represent: the first shown meter. */
export function primaryOf(readings: MeterReading[]): MeterReading | null {
  return readings[0] ?? null;
}

