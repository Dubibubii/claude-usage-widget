// Pure-math insight helpers. Run: bun test src/data/insights.test.ts

import { describe, expect, test } from "bun:test";
import type { DayUsage } from "./scanCore";
import {
  cacheReadPct14d,
  cycleDay,
  heavyProject14d,
  localDayKey,
  sdkPaceEmptyOn,
  weeklyTrendPerDay,
} from "./insights";

const NOW = new Date(2026, 5, 11, 18, 0); // Jun 11 2026, 18:00 local

function day(date: string, totalTokens: number, projects: [string, number][]): DayUsage {
  return {
    date,
    tokens: {
      input: Math.round(totalTokens * 0.1),
      output: Math.round(totalTokens * 0.1),
      cacheRead: Math.round(totalTokens * 0.7),
      cacheWrite: totalTokens - Math.round(totalTokens * 0.9),
    },
    totalTokens,
    costUsd: 1,
    requests: 10,
    sessions: 2,
    byModel: [],
    byProject: projects.map(([project, tokens]) => ({ project, tokens })),
    sdk: { tokens: 0, usd: 0 },
  };
}

describe("localDayKey", () => {
  test("pads month and day", () => {
    expect(localDayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(localDayKey(NOW)).toBe("2026-06-11");
  });
});

describe("cacheReadPct14d", () => {
  test("share of prompt-side tokens (cache-read / (input+read+write))", () => {
    // input 100, read 700, write 100 → 700/900 = 78%
    const d = day("2026-06-10", 1000, [["a", 1000]]);
    expect(cacheReadPct14d([d], NOW)).toBe(78);
  });
  test("days outside the 14-day window are ignored; empty → null", () => {
    const old = day("2026-05-01", 1_000_000, [["a", 1]]);
    expect(cacheReadPct14d([old], NOW)).toBeNull();
    expect(cacheReadPct14d([], NOW)).toBeNull();
  });
});

describe("heavyProject14d", () => {
  test("flags a project at/above the threshold", () => {
    const days = [
      day("2026-06-10", 600, [["widget", 600]]),
      day("2026-06-11", 400, [["other", 400]]),
    ];
    expect(heavyProject14d(days, NOW)).toEqual({ name: "widget", pct: 60 });
  });
  test("no flag when nothing dominates", () => {
    const days = [
      day("2026-06-10", 300, [["a", 300]]),
      day("2026-06-11", 700, [["b", 350], ["c", 350]]),
    ];
    expect(heavyProject14d(days, NOW)).toBeNull();
  });
});

describe("cycleDay", () => {
  const since = "2026-06-11T00:00:00";
  const restarts = "2026-07-11T00:00:00";
  test("day 1 on the cycle's first day", () => {
    expect(cycleDay(since, restarts, NOW)).toEqual({ day: 1, total: 30 });
  });
  test("mid-cycle", () => {
    expect(cycleDay(since, restarts, new Date(2026, 5, 25, 12))).toEqual({ day: 15, total: 30 });
  });
  test("clamped at total even past restart; garbage → null", () => {
    expect(cycleDay(since, restarts, new Date(2026, 6, 20))?.day).toBe(30);
    expect(cycleDay("nope", restarts, NOW)).toBeNull();
    expect(cycleDay(restarts, since, NOW)).toBeNull(); // inverted
  });
});

describe("sdkPaceEmptyOn", () => {
  const since = "2026-06-09T00:00:00"; // 2.75 elapsed days at NOW
  const restarts = "2026-07-09T00:00:00";
  test("projects an early-empty date when pace outruns the pool", () => {
    // $55 in ~2.75 days → $20/day → $145 left → ~7.25 days → ~Jun 19 << Jul 9
    const d = sdkPaceEmptyOn(55, 200, since, restarts, NOW);
    expect(d).not.toBeNull();
    expect(localDayKey(d as Date)).toBe("2026-06-19");
  });
  test("null when on pace for the cycle", () => {
    // $5 in 2.75 days → empties far beyond the restart
    expect(sdkPaceEmptyOn(5, 200, since, restarts, NOW)).toBeNull();
  });
  test("null on day one, when nothing spent, or when already empty", () => {
    expect(sdkPaceEmptyOn(50, 200, "2026-06-11T10:00:00", restarts, NOW)).toBeNull();
    expect(sdkPaceEmptyOn(0, 200, since, restarts, NOW)).toBeNull();
    expect(sdkPaceEmptyOn(200, 200, since, restarts, NOW)).toBeNull();
  });
});

describe("weeklyTrendPerDay", () => {
  test("rising peaks → rounded %/day slope", () => {
    const peaks = { "2026-06-09": { w: 10 }, "2026-06-11": { w: 16 } };
    expect(weeklyTrendPerDay(peaks, NOW)).toBe(3); // +6 over 2 days
  });
  test("flat → null (stable is silence)", () => {
    const peaks = { "2026-06-09": { w: 10 }, "2026-06-11": { w: 10.5 } };
    expect(weeklyTrendPerDay(peaks, NOW)).toBeNull();
  });
  test("negative (weekly window reset mid-span) → null", () => {
    const peaks = { "2026-06-09": { w: 80 }, "2026-06-11": { w: 5 } };
    expect(weeklyTrendPerDay(peaks, NOW)).toBeNull();
  });
  test("fewer than 2 observations → null", () => {
    expect(weeklyTrendPerDay({ "2026-06-11": { w: 20 } }, NOW)).toBeNull();
    expect(weeklyTrendPerDay({}, NOW)).toBeNull();
  });
});
