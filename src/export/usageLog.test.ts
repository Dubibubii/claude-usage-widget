// buildMonthlyReport — the Claude-ready monthly export. Pure given (setup,
// LocalUsage, now) EXCEPT that it reads observed limit peaks from
// localStorage via dailyPeaks(); bun test has no localStorage, so a minimal
// Map-backed stub is installed BEFORE the module under test is imported.
// Run: bun test src/export/usageLog.test.ts

import { describe, expect, test } from "bun:test";
import type { SetupState } from "../state/types";
import type { DayUsage, LocalUsage } from "../data/scanCore";

// ---- localStorage stub (must exist before usageLog → source.ts runs) ----
const backing = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => backing.get(k) ?? null,
  setItem: (k: string, v: string) => void backing.set(k, String(v)),
  removeItem: (k: string) => void backing.delete(k),
  clear: () => backing.clear(),
};
(globalThis as Record<string, unknown>).localStorage ??= localStorageStub;
// seed observed peaks for one current-month day (source.ts HISTORY_KEY)
globalThis.localStorage.setItem(
  "cuw-weekly-history-v1",
  JSON.stringify({ "2026-06-03": { w: 42, s: 87 } }),
);

const { buildMonthlyReport } = await import("./usageLog");

// ---- fixture ----
const NOW = new Date(2026, 5, 11, 18, 0); // Jun 11 2026 (local) → month 2026-06

const SETUP: SetupState = {
  plan: "max20x",
  monthlyResetDay: 11,
  weeklyResetDow: 2,
  weeklyResetTime: "23:00",
  completed: true,
};

function day(date: string, totalTokens: number, sdkTokens: number): DayUsage {
  const input = Math.round(totalTokens * 0.1);
  const output = Math.round(totalTokens * 0.1);
  const cacheRead = Math.round(totalTokens * 0.7);
  const cacheWrite = totalTokens - input - output - cacheRead;
  return {
    date,
    tokens: { input, output, cacheRead, cacheWrite },
    totalTokens,
    costUsd: totalTokens / 1e6, // arbitrary but finite
    requests: 20,
    sessions: 3,
    byModel: [
      { model: "claude-opus-4-8[1m]", tokens: Math.round(totalTokens * 0.6) },
      { model: "claude-haiku-4-5-20251001", tokens: Math.round(totalTokens * 0.4) },
    ],
    byProject: [{ project: "claude-usage-widget", tokens: totalTokens }],
    sdk: { tokens: sdkTokens, usd: sdkTokens / 1e6 },
  };
}

function usage(days: DayUsage[]): LocalUsage {
  return {
    generatedAt: NOW.toISOString(),
    scannedFiles: 4,
    records: 100,
    allTime: { tokens: 5e9, since: "2025-11-01" },
    days,
    sdkCycle: { cycleStart: "2026-06-11T00:00:00", spentUsd: 1.5, byApp: [] },
  };
}

const FIXTURE = usage([
  day("2026-05-28", 999_000_000, 123_456), // previous month — must be excluded
  day("2026-06-03", 1_000_000, 250_000), // current month, with agent-sdk usage
  day("2026-06-10", 500_000, 0), // current month, NO agent-sdk usage
]);

describe("buildMonthlyReport — current month only", () => {
  const report = buildMonthlyReport(SETUP, FIXTURE, NOW);

  test("previous-month days are excluded entirely", () => {
    expect(report).not.toContain("2026-05-28");
    expect(report).not.toContain("999M"); // fmtTokens of the May day
  });

  test("month rollup sums only current-month days (1M + 500K = 1.5M)", () => {
    expect(report).toContain("## Month so far");
    expect(report).toContain("- tokens 1.5M · cost-equiv $1.50");
    expect(report).toContain("requests 40"); // 20 + 20, May's 20 excluded
    expect(report).toContain("busiest day 2026-06-03 (1M)");
  });

  test("both current-month day blocks appear (newest first)", () => {
    const i10 = report.indexOf("### 2026-06-10");
    const i03 = report.indexOf("### 2026-06-03");
    expect(i10).toBeGreaterThan(-1);
    expect(i03).toBeGreaterThan(-1);
    expect(i10).toBeLessThan(i03);
  });

  test("no NaN / undefined anywhere in the output", () => {
    expect(report).not.toContain("NaN");
    expect(report).not.toContain("undefined");
  });

  test("day with sdk.tokens=0 omits the agent-sdk line; the other day has it", () => {
    const matches = report.match(/- agent-sdk pool:/g) ?? [];
    expect(matches).toHaveLength(1);
    // the single agent-sdk line lives inside the 2026-06-03 block
    const block03 = report.slice(report.indexOf("### 2026-06-03"));
    expect(block03).toContain("- agent-sdk pool: 250K tokens ($0.25)");
    const block10 = report.slice(
      report.indexOf("### 2026-06-10"),
      report.indexOf("### 2026-06-03"),
    );
    expect(block10).not.toContain("agent-sdk pool");
  });

  test("observed peaks from localStorage land on their day", () => {
    expect(report).toContain("- limits: 5h-session peak 87% · weekly peak 42%");
  });

  test("header carries plan + pool + month name", () => {
    expect(report).toContain("# Claude usage report — June 2026");
    expect(report).toContain("Plan: Max 20x · Agent SDK pool $200/mo");
  });
});

describe("buildMonthlyReport — empty month", () => {
  test("only previous-month activity → explicit empty-month notice", () => {
    const report = buildMonthlyReport(SETUP, usage([day("2026-05-28", 1_000_000, 0)]), NOW);
    expect(report).toContain("_No local Claude activity recorded this month yet._");
    expect(report).not.toContain("## Month so far");
    expect(report).not.toContain("NaN");
  });
});

describe("savings headline + analysis brief", () => {
  test("savings section present with month data, leads the report body", () => {
    const report = buildMonthlyReport(SETUP, FIXTURE, NOW);
    expect(report).toContain("## 💰 Potential savings this month (est.)");
    expect(report).toContain("was avoidable");
    // headline must come BEFORE the daily log
    expect(report.indexOf("Potential savings")).toBeLessThan(report.indexOf("## Daily log"));
  });

  test("routing lever picks up per-model usd when present", () => {
    const d = day("2026-06-10", 1_000_000, 0);
    d.costUsd = 42;
    d.byModel = [
      { model: "claude-opus-4-8[1m]", tokens: 600_000, usd: 40 },
      { model: "claude-haiku-4-5-20251001", tokens: 400_000, usd: 2 },
    ];
    const report = buildMonthlyReport(SETUP, usage([d]), NOW);
    // routing: 10% of $40 × 0.9 = $3.60 low · 25% × 0.9 = $9.00 high
    expect(report).toContain("$3.60–$9.00");
  });

  test("analysis brief instructs savings-first structured response", () => {
    const report = buildMonthlyReport(SETUP, FIXTURE, NOW);
    expect(report).toContain("## For the AI reading this — analysis brief");
    expect(report).toContain('"You could have saved ≈ $___–$___ this month."');
    expect(report).toContain("under 450 words");
    expect(report).toContain("freed limit headroom, not refunds");
  });

  test("empty month: no savings section, brief still present", () => {
    const report = buildMonthlyReport(SETUP, usage([]), NOW);
    expect(report).not.toContain("Potential savings");
    expect(report).toContain("## For the AI reading this — analysis brief");
  });
});

describe("one-artifact report: playbook + both asks ride along", () => {
  const report = buildMonthlyReport(SETUP, FIXTURE, NOW);

  test("both ready-made asks are present (monthly deep-dive + weekly 3 fixes)", () => {
    expect(report).toContain("Analyze my Claude usage");
    expect(report).toContain("3 highest-impact changes I should make on Monday");
  });

  test("token playbook section carries the merged advice levers", () => {
    expect(report).toContain("## Token playbook");
    for (const lever of ["Context diet", "Cache hygiene", "Model routing", "Compact discipline", "Plan first", "Output bloat"]) {
      expect(report).toContain(`- ${lever}:`);
    }
  });

  test("playbook is present even on an empty month (advice has no data dependency)", () => {
    const empty = buildMonthlyReport(SETUP, usage([]), NOW);
    expect(empty).toContain("## Token playbook");
  });
});
