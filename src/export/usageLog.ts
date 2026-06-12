// Exportable usage report — a REAL file at ~/Documents/claude-usage.md.
//
// Replaces the old 15-minute snapshot log (repetitive lines, no analytical
// value). The file is REGENERATED in place for the CURRENT month — never
// appended — so it auto-resets monthly, stays compact, and can't accumulate
// duplicates. It is written to be sent to Claude: per-day token mix, cache
// efficiency, model/project splits, pool usage, observed limit peaks, and an
// instructions block so Claude knows what to analyze.
//
// The dev build writes through the Vite bridge; the Tauri shell writes
// natively (write_usage_log).

import type { SetupState } from "../state/types";
import { PLAN_SDK_POOL } from "../state/types";
import type { DayUsage, LocalUsage } from "../data/scanCore";
import { dailyPeaks } from "../data/source";
import { estimateSavings } from "../data/insights";
import { fmtTokens } from "../data/format";
import { isTauri, nativeLogMeta, nativeWriteLog } from "../platform/native";

export const LOG_FILENAME = "claude-usage.md";
export const WRITE_INTERVAL_MS = 15 * 60_000;
const LAST_POST_KEY = "cuw-log-last-post";

const PLAN_NAMES: Record<SetupState["plan"], string> = {
  pro: "Pro",
  max5x: "Max 5x",
  max20x: "Max 20x",
};

/** "claude-opus-4-8[1m]" → "opus-4-8"; "claude-haiku-4-5-20251001" → "haiku-4-5" */
function prettyModel(model: string): string {
  return model
    .replace(/^claude-/, "")
    .replace(/\[[^\]]+\]$/, "")
    .replace(/-\d{8}$/, "");
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function modelMix(day: DayUsage): string {
  // merge by pretty name (dated + bracketed ids of the same model collapse)
  const merged = new Map<string, number>();
  for (const m of day.byModel) {
    const name = prettyModel(m.model);
    merged.set(name, (merged.get(name) ?? 0) + m.tokens);
  }
  return [...merged.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, tokens]) => `${name} ${pct(tokens, day.totalTokens)}%`)
    .join(", ");
}

function projectList(day: DayUsage): string {
  const top = day.byProject.slice(0, 3).map((p) => `${p.project} ${fmtTokens(p.tokens)}`);
  const more = day.byProject.length - 3;
  return top.join(" · ") + (more > 0 ? ` · +${more} more` : "");
}

function dayBlock(day: DayUsage, peaks: { w?: number; s?: number } | undefined): string[] {
  const t = day.tokens;
  const promptSide = t.input + t.cacheRead + t.cacheWrite;
  const lines = [
    `### ${day.date} (sessions ${day.sessions} · requests ${day.requests})`,
    `- tokens ${fmtTokens(day.totalTokens)} — in ${fmtTokens(t.input)} · out ${fmtTokens(t.output)} · cache-read ${fmtTokens(t.cacheRead)} (${pct(t.cacheRead, promptSide)}% of prompt side) · cache-write ${fmtTokens(t.cacheWrite)}`,
    `- cost-equiv $${day.costUsd.toFixed(2)} · models: ${modelMix(day)}`,
    `- top projects: ${projectList(day)}`,
  ];
  if (day.sdk.tokens > 0) {
    lines.push(`- agent-sdk pool: ${fmtTokens(day.sdk.tokens)} tokens ($${day.sdk.usd.toFixed(2)})`);
  }
  if (peaks && (peaks.s !== undefined || peaks.w !== undefined)) {
    const parts = [
      peaks.s !== undefined ? `5h-session peak ${Math.round(peaks.s)}%` : null,
      peaks.w !== undefined ? `weekly peak ${Math.round(peaks.w)}%` : null,
    ].filter(Boolean);
    lines.push(`- limits: ${parts.join(" · ")}`);
  }
  return lines;
}

/** The motivating headline: what this month's avoidable spend looks like,
 * with every assumption stated so the analyzing AI can verify the math.
 * estimateSavings (insights.ts) allocates each day's REAL cost across token
 * classes by price weights — nothing here is invented, only counterfactual. */
function savingsSection(days: DayUsage[]): string[] {
  const s = estimateSavings(days);
  if (!s) return [];
  const usd = (v: number) => `$${v.toFixed(2)}`;
  return [
    `## 💰 Potential savings this month (est.)`,
    ``,
    `**≈ ${usd(s.totalLowUsd)}–${usd(s.totalHighUsd)} of this month's ${usd(s.monthCostUsd)} cost-equivalent was avoidable.**`,
    ``,
    `| Lever | Est. savings | Assumption |`,
    `|---|---|---|`,
    `| Leaner output (diffs over prose, ≤5-line answers) | ${usd(s.outputLowUsd)}–${usd(s.outputHighUsd)} | 5–11% output reduction; the 11% was measured from mechanical terseness rules |`,
    `| Cache hygiene (lift cache-read share to ~90%) | up to ${usd(s.cacheUsd)} | cold input tokens repriced as cache reads (0.1×); 50% adoption in the low total |`,
    `| Model routing (chores → small model) | ${usd(s.routingLowUsd)}–${usd(s.routingHighUsd)} | 10–25% of large-model work routed, small models ≈10× cheaper |`,
    ``,
    `Cost split per day is allocated from real totals by price weights (output 5×, cache-read 0.1×, cache-write 1.25× vs input). On a flat-rate plan these $ are API-equivalent value — read them as freed limit headroom, not refunds.`,
    ``,
  ];
}

/** The whole current-month file, newest day first. */
export function buildMonthlyReport(
  setup: SetupState,
  local: LocalUsage,
  now: Date,
): string {
  const p2 = (n: number) => n.toString().padStart(2, "0");
  const monthKey = `${now.getFullYear()}-${p2(now.getMonth() + 1)}`;
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const days = local.days.filter((d) => d.date.startsWith(monthKey));
  const peaks = dailyPeaks();

  const L: string[] = [
    `# Claude usage report — ${monthName}`,
    `<!-- generated by Claude Usage Widget · regenerated in place · covers the current month only -->`,
    ``,
    `- Plan: ${PLAN_NAMES[setup.plan]} · Agent SDK pool $${PLAN_SDK_POOL[setup.plan]}/mo`,
    `- Source: local Claude Code transcripts on this machine · $ figures are API-equivalent estimates, not billing`,
    `- Updated: ${now.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    ``,
    `## How to use this file`,
    `Send it to Claude (claude.ai or Claude Code) and ask either:`,
    `> Analyze my Claude usage and suggest concrete ways to save tokens and stay under my limits.`,
    ``,
    `or, for a quick weekly check-in:`,
    `> Look at my last 7 days in this report. What are the 3 highest-impact changes I should make on Monday to cut my token use ~20%? Rank by effort, use my real numbers.`,
    ``,
    `Either way, the analysis brief near the bottom tells the AI exactly how to answer — savings first.`,
    ``,
  ];

  if (days.length === 0) {
    L.push(`## Daily log`, ``, `_No local Claude activity recorded this month yet._`, ``);
  } else {
    // month rollup first so a skim (or a model) gets the shape immediately
    const tot = days.reduce(
      (a, d) => ({
        tokens: a.tokens + d.totalTokens,
        cost: a.cost + d.costUsd,
        read: a.read + d.tokens.cacheRead,
        prompt: a.prompt + d.tokens.input + d.tokens.cacheRead + d.tokens.cacheWrite,
        requests: a.requests + d.requests,
        sdkUsd: a.sdkUsd + d.sdk.usd,
      }),
      { tokens: 0, cost: 0, read: 0, prompt: 0, requests: 0, sdkUsd: 0 },
    );
    L.push(...savingsSection(days));
    const busiest = days.reduce((a, b) => (b.totalTokens > a.totalTokens ? b : a));
    L.push(
      `## Month so far`,
      `- tokens ${fmtTokens(tot.tokens)} · cost-equiv $${tot.cost.toFixed(2)} · requests ${tot.requests} · cache-read share ${pct(tot.read, tot.prompt)}%`,
      `- busiest day ${busiest.date} (${fmtTokens(busiest.totalTokens)}) · agent-sdk $${tot.sdkUsd.toFixed(2)}`,
      ``,
      `## Daily log`,
    );
    for (const day of [...days].reverse()) {
      L.push(``, ...dayBlock(day, peaks[day.date]));
    }
    L.push(``);
  }

  L.push(
    `## For the AI reading this — analysis brief`,
    ``,
    `Act as a token-efficiency coach. Use ONLY the data in this report. Respond in exactly this structure:`,
    ``,
    `1. **The number first.** Your very first line — before any heading — is: "You could have saved ≈ $___–$___ this month." filled with your verified range. To verify: internal consistency counts (check the lever table sums to the headline; back-solve cost bases from the daily log) — you don't have per-model prices, so bottom-up repricing isn't expected.`,
    `2. **Diagnosis.** Rank the three levers — leaner output · cache hygiene · model routing — by this user's gap vs the playbook below. Cite specific days and values: low cache-read days, output-heavy days, large-model-dominated days, requests-per-session churn, project concentration, and limit peaks near 100% (if the log records them).`,
    `3. **Prescriptions.** The top 3 habit changes ranked by estimated $ impact. For each: the concrete change, the playbook lever it implements, and roughly what share of the savings it captures. If a lever OUTSIDE the three (e.g. compact discipline) shows a bigger gap in this data, say so and rank it in.`,
    `4. **Next week's experiment.** One single change, plus the exact number in next month's report that should move if it works.`,
    ``,
    `Rules: recommend only levers this data supports — don't recite the whole playbook. Ranges over false precision; say when data is insufficient. The user's plan is flat-rate, so frame $ as API-equivalent value of freed limit headroom, not refunds. Keep the entire response under 450 words — this is a token-efficiency report; model the behavior.`,
    ``,
    `## Token playbook — the levers behind your suggestions`,
    `- Context diet: CLAUDE.md stays under ~60 lines (it is re-sent every session); reference file paths instead of pasting files; summarize logs to the failing lines; one task per session.`,
    `- Cache hygiene: cached prefix reads are ~10× cheaper — keep CLAUDE.md/settings stable mid-task, group follow-ups in bursts (the cache expires after ~5 idle minutes), don't restart sessions for follow-ups.`,
    `- Model routing: renames, formatting, boilerplate, and log-reading go to a small model (/model haiku); keep the big model for architecture, debugging, and multi-file work; subagents accept cheaper models.`,
    `- Compact discipline: /compact at subtask boundaries; new feature → new session; a long session re-sends its whole history every turn.`,
    `- Plan first: multi-file work starts with "make a plan, don't code yet" — wrong-direction exploration is the most expensive failure mode.`,
    `- Output bloat: output tokens cost ~5× input — prefer diffs over prose, no recaps of unchanged code, short summaries unless asked.`,
    ``,
  );

  return L.join("\n");
}

export async function writeReport(setup: SetupState, local: LocalUsage): Promise<boolean> {
  const content = buildMonthlyReport(setup, local, new Date());
  if (isTauri) return nativeWriteLog(content);
  try {
    const r = await fetch("/api/usage-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full: content }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Regenerate the report if one is due (15-min cadence). */
export async function writeReportIfDue(setup: SetupState, local: LocalUsage | null): Promise<void> {
  if (!local) return;
  const last = localStorage.getItem(LAST_POST_KEY);
  if (last && Date.now() - new Date(last).getTime() < WRITE_INTERVAL_MS) return;
  if (await writeReport(setup, local)) {
    localStorage.setItem(LAST_POST_KEY, new Date().toISOString());
  }
}

export interface LogMeta {
  path: string;
  mtime: string;
}

export async function logMeta(): Promise<LogMeta | null> {
  if (isTauri) return nativeLogMeta(false);
  try {
    const r = await fetch("/api/usage-log");
    if (!r.ok) return null;
    return (await r.json()) as LogMeta;
  } catch {
    return null;
  }
}

/** ⤓ / "Export .md" → download a copy of the current report file. */
export async function exportLog(): Promise<void> {
  let content: string | undefined;
  if (isTauri) {
    content = (await nativeLogMeta(true))?.content;
  } else {
    try {
      const r = await fetch("/api/usage-log?content=1");
      if (r.ok) content = (await r.json()).content;
    } catch {
      /* no log yet */
    }
  }
  if (!content) return;
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = LOG_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}
