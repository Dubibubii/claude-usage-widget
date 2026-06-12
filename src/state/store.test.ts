// migrateMeters — old model (◎ pin + hide flags) → new model (enabled = in
// the pill). Legacy rows are detected by the presence of a boolean
// pinnedToPill key. Run: bun test src/state/store.test.ts

import { describe, expect, test } from "bun:test";
import { migrateMeters } from "./store";

describe("migrateMeters — legacy rows WITHOUT pins", () => {
  test("only the first enabled %-meter stays enabled", () => {
    const rows = [
      { id: "session5h", enabled: true, pinnedToPill: false },
      { id: "weeklyAll", enabled: true, pinnedToPill: false },
      { id: "sdkCredits", enabled: true, pinnedToPill: false },
    ];
    expect(migrateMeters(rows)).toEqual([
      { id: "session5h", enabled: true },
      { id: "weeklyAll", enabled: false },
      { id: "sdkCredits", enabled: false },
    ]);
  });

  test("first enabled %-meter skips disabled and %-less rows", () => {
    const rows = [
      { id: "allTimeTokens", enabled: true, pinnedToPill: false }, // %-less, never first
      { id: "session5h", enabled: false, pinnedToPill: false }, // hidden
      { id: "weeklyAll", enabled: true, pinnedToPill: false }, // ← the pill meter
    ];
    expect(migrateMeters(rows)).toEqual([
      { id: "allTimeTokens", enabled: false },
      { id: "session5h", enabled: false },
      { id: "weeklyAll", enabled: true },
    ]);
  });
});

describe("migrateMeters — legacy rows WITH pins: pins win", () => {
  test("pinned meters become the pill set regardless of old enabled flags", () => {
    const rows = [
      { id: "session5h", enabled: true, pinnedToPill: false },
      { id: "weeklyAll", enabled: false, pinnedToPill: true },
      { id: "sdkCredits", enabled: true, pinnedToPill: true },
    ];
    expect(migrateMeters(rows)).toEqual([
      { id: "session5h", enabled: false },
      { id: "weeklyAll", enabled: true },
      { id: "sdkCredits", enabled: true },
    ]);
  });

  test("a single pin beats an enabled first %-meter", () => {
    const rows = [
      { id: "session5h", enabled: true, pinnedToPill: false },
      { id: "sdkCredits", enabled: true, pinnedToPill: true },
    ];
    expect(migrateMeters(rows)).toEqual([
      { id: "session5h", enabled: false },
      { id: "sdkCredits", enabled: true },
    ]);
  });
});

describe("migrateMeters — modern rows pass through", () => {
  test("rows without a pinnedToPill key keep their enabled flags verbatim", () => {
    const rows = [
      { id: "session5h", enabled: true },
      { id: "weeklyAll", enabled: false },
      { id: "sdkCredits", enabled: true },
    ];
    expect(migrateMeters(rows)).toEqual(rows);
  });

  test("missing enabled defaults to true (enabled !== false)", () => {
    expect(migrateMeters([{ id: "session5h" }])).toEqual([
      { id: "session5h", enabled: true },
    ]);
  });
});

describe("migrateMeters — empty / garbage → null (caller falls back to defaults)", () => {
  test("empty array → null", () => {
    expect(migrateMeters([])).toBeNull();
  });
  test("non-array values → null", () => {
    expect(migrateMeters(undefined)).toBeNull();
    expect(migrateMeters("garbage")).toBeNull();
    expect(migrateMeters({ id: "session5h" })).toBeNull();
    expect(migrateMeters(42)).toBeNull();
  });
  test("array of id-less junk → null", () => {
    expect(migrateMeters([{}, { enabled: true }, { id: 7 }])).toBeNull();
  });
});
