// Pure billing-cycle math — the user's real reset day is 11, plan max20x.
// cycleStartFor = latest monthly-reset day (1–28) at LOCAL midnight <= now;
// nextCycleRestart = the next one strictly after "on the day" has begun.
// Run: bun test src/data/source.test.ts

import { describe, expect, test } from "bun:test";
import { cycleStartFor, nextCycleRestart } from "./source";
import type { SetupState } from "../state/types";

function setup(monthlyResetDay: number): SetupState {
  return {
    plan: "max20x",
    monthlyResetDay,
    weeklyResetDow: 2,
    weeklyResetTime: "23:00",
    completed: true,
  };
}

describe("cycleStartFor — latest reset day at local midnight <= now", () => {
  test("now ON the reset day (day 11 at 18:00) → that day 00:00 local", () => {
    const now = new Date(2026, 5, 11, 18, 0); // Jun 11 2026 18:00 local
    expect(cycleStartFor(setup(11), now)).toEqual(new Date(2026, 5, 11, 0, 0, 0, 0));
  });

  test("exactly at the reset midnight → that same midnight (not a month back)", () => {
    const now = new Date(2026, 5, 11, 0, 0, 0, 0);
    expect(cycleStartFor(setup(11), now)).toEqual(new Date(2026, 5, 11));
  });

  test("just BEFORE the reset day (Jun 10 23:59) → previous month's day 11", () => {
    const now = new Date(2026, 5, 10, 23, 59);
    expect(cycleStartFor(setup(11), now)).toEqual(new Date(2026, 4, 11)); // May 11
  });

  test("just AFTER midnight on the reset day (00:00:01) → that day", () => {
    const now = new Date(2026, 5, 11, 0, 0, 1);
    expect(cycleStartFor(setup(11), now)).toEqual(new Date(2026, 5, 11));
  });

  test("month wrap: Jan 5 with reset day 28 → Dec 28 of the PREVIOUS year", () => {
    const now = new Date(2026, 0, 5, 12, 0); // Jan 5 2026
    expect(cycleStartFor(setup(28), now)).toEqual(new Date(2025, 11, 28)); // Dec 28 2025
  });
});

describe("nextCycleRestart — first reset day strictly in the future", () => {
  test("now ON the reset day → restart lands NEXT month, same day", () => {
    const now = new Date(2026, 5, 11, 18, 0); // Jun 11
    expect(nextCycleRestart(setup(11), now)).toEqual(new Date(2026, 6, 11)); // Jul 11
  });

  test("just before the reset day → restart is tomorrow's midnight", () => {
    const now = new Date(2026, 5, 10, 23, 59);
    expect(nextCycleRestart(setup(11), now)).toEqual(new Date(2026, 5, 11));
  });

  test("after the reset day mid-month → next month", () => {
    const now = new Date(2026, 5, 20, 9, 0); // Jun 20
    expect(nextCycleRestart(setup(11), now)).toEqual(new Date(2026, 6, 11)); // Jul 11
  });

  test("year wrap: Dec 15 with day 11 → Jan 11 of the NEXT year", () => {
    const now = new Date(2026, 11, 15, 8, 0);
    expect(nextCycleRestart(setup(11), now)).toEqual(new Date(2027, 0, 11));
  });

  test("restart is always strictly after the matching cycle start", () => {
    const now = new Date(2026, 5, 11, 18, 0);
    const start = cycleStartFor(setup(11), now);
    const restart = nextCycleRestart(setup(11), now);
    expect(restart.getTime()).toBeGreaterThan(start.getTime());
    expect(restart.getTime()).toBeGreaterThan(now.getTime());
  });
});
