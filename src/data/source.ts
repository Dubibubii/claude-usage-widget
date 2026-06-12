// Data acquisition — fully live, no demo values.
//
// Two ToS-compliant local sources (see project research, 2026-06-11):
//  1. rate-limits capture: a statusline shim receives Claude Code's session
//     JSON (incl. `rate_limits` — the REAL 5h/weekly used % + resets) and
//     writes it to ~/.claude/usage-widget/statusline-latest.json. We only
//     consume data Claude Code itself produced — never the banned
//     /api/oauth/usage endpoint, never the OAuth token.
//  2. transcript scan: SDK credits / all-time tokens reconstructed from
//     ~/.claude/projects/**/*.jsonl (scanCore.ts).
//
// In the browser dev build both arrive via the Vite bridge (/api/*); the
// Tauri shell performs the same reads natively (src/platform/fs.ts).

import type { SetupState, UsageSnapshot } from "../state/types";
import { PLAN_SDK_POOL } from "../state/types";
import { scanLocalUsage, type LocalUsage } from "./scanCore";
import { cacheReadPct14d, heavyProject14d, localDayKey, weeklyTrendPerDay } from "./insights";
import { isTauri, nativeFs, nativeReadCapture } from "../platform/native";

// ---------- rate-limits capture ----------

export interface LiveRateLimits {
  capturedAt: string;
  fiveHour?: { pct: number; resetsAt: string };
  sevenDay?: { pct: number; resetsAt: string };
}

function toIso(v: unknown): string | undefined {
  if (typeof v === "number") {
    return new Date(v < 1e12 ? v * 1000 : v).toISOString(); // epoch s or ms
  }
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}

function windowFrom(raw: any, fallbackResetsAt: string): { pct: number; resetsAt: string } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  // statusline docs name it used_percentage; defensively accept utilization too
  const pct = raw.used_percentage ?? raw.utilization;
  if (typeof pct !== "number") return undefined;
  const resetsAt = toIso(raw.resets_at) ?? toIso(raw.resetsAt);
  // resets_at missing (never seen in practice): assume a full window from the
  // capture moment so validity stays bounded rather than sliding forever
  return { pct, resetsAt: resetsAt ?? fallbackResetsAt };
}

export function parseRateLimits(capturedAt: string, payload: any): LiveRateLimits | null {
  const rl = payload?.rate_limits;
  const capMs = new Date(capturedAt).getTime();
  const fiveHour = windowFrom(rl?.five_hour, new Date(capMs + 5 * 3600_000).toISOString());
  const sevenDay = windowFrom(rl?.seven_day, new Date(capMs + 7 * 86400_000).toISOString());
  if (!fiveHour && !sevenDay) return null;
  return { capturedAt, fiveHour, sevenDay };
}

export async function fetchLiveRateLimits(): Promise<LiveRateLimits | null> {
  if (isTauri) {
    const c = await nativeReadCapture();
    return c ? parseRateLimits(c.capturedAt, c.payload) : null;
  }
  try {
    const r = await fetch("/api/rate-limits");
    if (!r.ok) return null;
    const { capturedAt, payload } = await r.json();
    return parseRateLimits(capturedAt, payload);
  } catch {
    return null;
  }
}

// ---------- transcript scan ----------

/** Reset day is 1–28 by contract; clamp defensively — 29–31 would make the
 * Date constructor roll into the next month and silently shift the cycle. */
function resetDayOf(setup: SetupState): number {
  return Math.min(Math.max(setup.monthlyResetDay, 1), 28);
}

/** Start of the current SDK billing cycle: the latest monthly-restart day
 * (1–28) at local midnight that is <= now. */
export function cycleStartFor(setup: SetupState, now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), resetDayOf(setup));
  if (d.getTime() > now.getTime()) d.setMonth(d.getMonth() - 1);
  return d;
}

export function nextCycleRestart(setup: SetupState, now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), resetDayOf(setup));
  if (d.getTime() <= now.getTime()) d.setMonth(d.getMonth() + 1);
  return d;
}

const NATIVE_SCAN_TTL_MS = 5 * 60_000;
let nativeScanCache: { atMs: number; cycleStart: string; data: LocalUsage } | null = null;

export async function fetchLocalUsage(setup: SetupState, refresh = false): Promise<LocalUsage | null> {
  const cycleStart = cycleStartFor(setup, new Date()).toISOString();
  if (isTauri) {
    if (
      !refresh &&
      nativeScanCache &&
      nativeScanCache.cycleStart === cycleStart &&
      Date.now() - nativeScanCache.atMs < NATIVE_SCAN_TTL_MS
    ) {
      return nativeScanCache.data;
    }
    try {
      const data = await scanLocalUsage(nativeFs, "", cycleStart); // dir resolved natively
      nativeScanCache = { atMs: Date.now(), cycleStart, data };
      return data;
    } catch {
      return null;
    }
  }
  try {
    const r = await fetch(
      `/api/local-usage?cycleStart=${encodeURIComponent(cycleStart)}${refresh ? "&refresh=1" : ""}`,
    );
    if (!r.ok) return null;
    return (await r.json()) as LocalUsage;
  } catch {
    return null;
  }
}

// ---------- account auto-detection (zero-question onboarding) ----------

export interface DetectedAccount {
  plan: "pro" | "max5x" | "max20x";
  monthlyResetDay: number; // 1–28, from subscriptionCreatedAt
}

function mapTier(tier: unknown, orgType: unknown): DetectedAccount["plan"] | null {
  const t = `${tier ?? ""} ${orgType ?? ""}`.toLowerCase();
  if (t.includes("max_20x") || t.includes("max20x")) return "max20x";
  if (t.includes("max_5x") || t.includes("max5x")) return "max5x";
  if (t.includes("max")) return "max5x"; // claude_max with unknown multiplier
  if (t.includes("pro")) return "pro";
  return null;
}

/** Detect plan + billing-restart day from Claude Code's own account config
 * (~/.claude.json oauthAccount). Returns null when undetectable — the setup
 * card then runs as fallback. */
export async function detectAccount(): Promise<DetectedAccount | null> {
  try {
    let raw: any = null;
    if (isTauri) {
      const core = await import("@tauri-apps/api/core");
      raw = await core.invoke("read_account");
    } else {
      const r = await fetch("/api/account");
      if (r.ok) raw = await r.json();
    }
    if (!raw) return null;
    const plan = mapTier(raw.rateLimitTier, raw.organizationType);
    if (!plan) return null;
    let monthlyResetDay = 1;
    if (typeof raw.subscriptionCreatedAt === "string") {
      const day = new Date(raw.subscriptionCreatedAt).getDate();
      monthlyResetDay = Math.min(Math.max(day, 1), 28);
    }
    return { plan, monthlyResetDay };
  } catch {
    return null;
  }
}

// ---------- observed daily peaks (collected from live captures over time) ----------

const HISTORY_KEY = "cuw-weekly-history-v1";

/** stored per local-day: w = peak weekly %, s = peak session % (legacy
 * entries are plain numbers = weekly peak only) */
type PeakEntry = number | { w?: number; s?: number };

const dayKey = localDayKey; // one day-key convention everywhere (insights.ts)

function readPeaks(): Record<string, PeakEntry> {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Record today's observed peaks. Called on every live capture. */
export function recordDailyPeaks(sessionPct: number | null, weeklyPct: number | null): void {
  if (sessionPct === null && weeklyPct === null) return;
  try {
    const store = readPeaks();
    const key = dayKey(new Date());
    const cur = store[key];
    const prev = typeof cur === "number" ? { w: cur } : (cur ?? {});
    store[key] = {
      w: weeklyPct === null ? prev.w : Math.max(prev.w ?? 0, weeklyPct),
      s: sessionPct === null ? prev.s : Math.max(prev.s ?? 0, sessionPct),
    };
    // keep a rolling ~60 days
    const keys = Object.keys(store).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete store[k];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota errors */
  }
}

/** Observed peaks by local day (for the monthly report). */
export function dailyPeaks(): Record<string, { w?: number; s?: number }> {
  const store = readPeaks();
  const out: Record<string, { w?: number; s?: number }> = {};
  for (const [k, v] of Object.entries(store)) {
    out[k] = typeof v === "number" ? { w: v } : v;
  }
  return out;
}

/** Last 14 days of recorded weekly peaks (only days with observations). */
export function history14d(): { date: string; peakWeeklyPct: number }[] {
  try {
    const store = dailyPeaks();
    const out: { date: string; peakWeeklyPct: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const w = store[dayKey(d)]?.w;
      if (w !== undefined) {
        // local YYYY-MM-DD key, aligned with dailyActivity dates
        out.push({ date: dayKey(d), peakWeeklyPct: Math.round(w) });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Last 14 calendar days of transcript activity (zero-filled, oldest first). */
function dailyActivity14d(local: LocalUsage | null, now: Date) {
  if (!local) return [];
  const byDate = new Map(local.days.map((d) => [d.date, d]));
  const out: { date: string; totalTokens: number; costUsd: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const day = byDate.get(key);
    out.push({ date: key, totalTokens: day?.totalTokens ?? 0, costUsd: day?.costUsd ?? 0 });
  }
  return out;
}

// ---------- snapshot assembly ----------

/** A capture older than this is labeled with its sync age in the UI. */
export const RATE_LIMIT_CURRENT_MS = 15 * 60_000;

/** A captured window stays displayable until its OWN reset boundary passes:
 * within one window the used % can only grow, so the last capture is an
 * honest floor no matter how old it is. Once resets_at passes, the window
 * rolled over and the value means nothing — drop to the awaiting state.
 * (This replaced a flat 15-minute cutoff: desktop-app sessions never refresh
 * the capture — Anthropic exposes rate_limits to the terminal statusline
 * only — so the cutoff blanked the meters during app-only stretches even
 * though the floor was still valid.) */
function openWindow(
  w: { pct: number; resetsAt: string } | undefined,
  now: Date,
): { pct: number; resetsAt: string } | null {
  if (!w) return null;
  const t = new Date(w.resetsAt).getTime();
  return Number.isFinite(t) && t > now.getTime() ? { pct: w.pct, resetsAt: w.resetsAt } : null;
}

export function assembleSnapshot(
  setup: SetupState,
  live: LiveRateLimits | null,
  local: LocalUsage | null,
): UsageSnapshot {
  const now = new Date();
  const pool = PLAN_SDK_POOL[setup.plan];
  return {
    session5h: openWindow(live?.fiveHour, now),
    weeklyAll: openWindow(live?.sevenDay, now),
    sdkCredits: local
      ? {
          spentUsd: local.sdkCycle.spentUsd,
          poolUsd: pool,
          sinceOn: local.sdkCycle.cycleStart,
          restartsOn: nextCycleRestart(setup, now).toISOString(),
        }
      : null,
    allTimeTokens: local
      ? { total: local.allTime.tokens, since: local.allTime.since }
      : null,
    history14d: history14d(),
    dailyActivity: dailyActivity14d(local, now),
    sdkByApp: local?.sdkCycle.byApp ?? [],
    cache14dPct: local ? cacheReadPct14d(local.days, now) : null,
    heavyProject: local ? heavyProject14d(local.days, now) : null,
    weeklyTrendPerDay: weeklyTrendPerDay(dailyPeaks(), now),
    sync: {
      rateLimits: live?.capturedAt ?? null,
      localScan: local?.generatedAt ?? null,
    },
  };
}
