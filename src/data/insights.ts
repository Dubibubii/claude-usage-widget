// Derived insights — small PURE helpers over data the widget already has.
// Calendar math + arithmetic only: no I/O, no state, fully unit-tested
// (insights.test.ts). Anything that needs localStorage or the filesystem
// stays in source.ts; this module is where "what does the data mean" lives.

import type { DayUsage } from "./scanCore";

const DAY_MS = 86400_000;

/** Local calendar day key, YYYY-MM-DD — the one convention used everywhere
 * (scan day rollups, observed peaks, daily activity). */
export function localDayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function last14(days: DayUsage[], now: Date): DayUsage[] {
  const start = new Date(now);
  start.setDate(start.getDate() - 13);
  const startKey = localDayKey(start);
  return days.filter((d) => d.date >= startKey);
}

/** Cache-read share of prompt-side tokens over the last 14 days (0–100).
 * The single best token-efficiency signal: low = context re-sent cold. */
export function cacheReadPct14d(days: DayUsage[], now: Date): number | null {
  let read = 0;
  let prompt = 0;
  for (const d of last14(days, now)) {
    read += d.tokens.cacheRead;
    prompt += d.tokens.input + d.tokens.cacheRead + d.tokens.cacheWrite;
  }
  return prompt > 0 ? Math.round((read / prompt) * 100) : null;
}

/** The project that dominated the last 14 days — only when one actually
 * dominates (≥ threshold % of all tokens), else null (no noise). */
export function heavyProject14d(
  days: DayUsage[],
  now: Date,
  threshold = 40,
): { name: string; pct: number } | null {
  const byProject = new Map<string, number>();
  let total = 0;
  for (const d of last14(days, now)) {
    total += d.totalTokens;
    for (const p of d.byProject) {
      byProject.set(p.project, (byProject.get(p.project) ?? 0) + p.tokens);
    }
  }
  if (total === 0) return null;
  let top: { name: string; pct: number } | null = null;
  for (const [name, tokens] of byProject) {
    const pct = Math.round((tokens / total) * 100);
    if (!top || pct > top.pct) top = { name, pct };
  }
  return top && top.pct >= threshold ? top : null;
}

/** Position within the SDK billing cycle: { day: 3, total: 30 }. */
export function cycleDay(
  sinceOn: string,
  restartsOn: string,
  now: Date,
): { day: number; total: number } | null {
  const s = new Date(sinceOn).getTime();
  const r = new Date(restartsOn).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(r) || r <= s) return null;
  const total = Math.round((r - s) / DAY_MS);
  const day = Math.min(Math.max(Math.floor((now.getTime() - s) / DAY_MS) + 1, 1), total);
  return { day, total };
}

/** Projected date the SDK pool runs dry at the current spend pace — only
 * when that lands BEFORE the cycle restart (i.e. an actual problem).
 * Needs ≥1 full elapsed day (day-one pace is noise); already-empty pools
 * return null too (the red 100% bar says it louder). */
export function sdkPaceEmptyOn(
  spentUsd: number,
  poolUsd: number,
  sinceOn: string,
  restartsOn: string,
  now: Date,
): Date | null {
  const s = new Date(sinceOn).getTime();
  const r = new Date(restartsOn).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(r)) return null;
  const elapsedDays = (now.getTime() - s) / DAY_MS;
  if (elapsedDays < 1 || spentUsd <= 0 || spentUsd >= poolUsd) return null;
  const emptyAt = now.getTime() + ((poolUsd - spentUsd) / (spentUsd / elapsedDays)) * DAY_MS;
  return emptyAt < r ? new Date(emptyAt) : null;
}

/** Weekly-% climb per day from observed daily peaks: slope between the
 * oldest and newest observation in the last `window` days. null when fewer
 * than 2 observations, when flat (<1%/day — absence means "stable"), or
 * when negative (the weekly window reset mid-span; a falling number is
 * meaningless, not reassuring). */
export function weeklyTrendPerDay(
  peaks: Record<string, { w?: number }>,
  now: Date,
  window = 4,
): number | null {
  const obs: { dayIndex: number; w: number }[] = [];
  for (let i = window - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const w = peaks[localDayKey(d)]?.w;
    if (w !== undefined) obs.push({ dayIndex: window - 1 - i, w });
  }
  if (obs.length < 2) return null;
  const first = obs[0];
  const last = obs[obs.length - 1];
  const span = last.dayIndex - first.dayIndex;
  if (span === 0) return null;
  const slope = (last.w - first.w) / span;
  return slope >= 1 ? Math.round(slope) : null;
}
