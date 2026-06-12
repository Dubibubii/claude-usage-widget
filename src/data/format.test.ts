// Formatting helpers — sync-age labels and the SDK cycle-window meta line.
// Date strings WITHOUT a Z suffix parse as local time, keeping the month/day
// assertions timezone-independent. Run: bun test src/data/format.test.ts

import { describe, expect, test } from "bun:test";
import { agoLabel, sdkCycleMeta } from "./format";

const NOW = new Date(2026, 5, 11, 18, 0, 0); // Jun 11 2026 18:00 local

function minsBefore(now: Date, mins: number): string {
  return new Date(now.getTime() - mins * 60_000).toISOString();
}

describe("agoLabel — compact sync age (47m / 3h / 2d)", () => {
  test("47 minutes → \"47m ago\"", () => {
    expect(agoLabel(minsBefore(NOW, 47), NOW)).toBe("47m ago");
  });
  test("3 hours → \"3h ago\"", () => {
    expect(agoLabel(minsBefore(NOW, 3 * 60), NOW)).toBe("3h ago");
  });
  test("2 days → \"2d ago\"", () => {
    expect(agoLabel(minsBefore(NOW, 2 * 1440), NOW)).toBe("2d ago");
  });
  test("boundaries: 59m stays minutes, 60m flips to hours", () => {
    expect(agoLabel(minsBefore(NOW, 59), NOW)).toBe("59m ago");
    expect(agoLabel(minsBefore(NOW, 60), NOW)).toBe("1h ago");
  });
  test("boundaries: 47h stays hours, 48h flips to days", () => {
    expect(agoLabel(minsBefore(NOW, 47 * 60), NOW)).toBe("47h ago");
    expect(agoLabel(minsBefore(NOW, 48 * 60), NOW)).toBe("2d ago");
  });
  test("future / same-instant timestamps clamp to \"0m ago\" (never negative)", () => {
    expect(agoLabel(NOW.toISOString(), NOW)).toBe("0m ago");
    expect(agoLabel(minsBefore(NOW, -30), NOW)).toBe("0m ago");
  });
});

describe("sdkCycleMeta — shows the WHOLE window (since … · restarts …)", () => {
  test("mid-year window", () => {
    expect(sdkCycleMeta("2026-06-11T00:00:00", "2026-07-11T00:00:00")).toBe(
      "since Jun 11 · restarts Jul 11",
    );
  });
  test("year-wrapping window (Dec → Jan)", () => {
    expect(sdkCycleMeta("2025-12-28T00:00:00", "2026-01-28T00:00:00")).toBe(
      "since Dec 28 · restarts Jan 28",
    );
  });
  test("a wrong cycle start is visible at a glance (upgraded mid-month)", () => {
    // start ≠ reset day shows up verbatim instead of being hidden
    expect(sdkCycleMeta("2026-06-03T00:00:00", "2026-06-11T00:00:00")).toBe(
      "since Jun 3 · restarts Jun 11",
    );
  });
});
