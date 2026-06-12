// Pure-geometry tests for the drag/snap logic — the math behind every issue
// the user hit (snapped to the wrong screen, vanished off-screen, contents
// detaching). Run: bun test src/platform/dragGeom.test.ts
//
// Monitors mirror the user's real layout:
//   main external: origin (0,0)     2048x1152
//   built-in:      origin (2048,0)  1512x982

import { describe, expect, test } from "bun:test";
import { applyDragDelta, cornerPosition, monitorFor, snapCorner, type MonInfo } from "./dragGeom";

const EXT: MonInfo = { x: 0, y: 0, w: 2048, h: 1152 };
const BUILTIN: MonInfo = { x: 2048, y: 0, w: 1512, h: 982 };
const MONS = [EXT, BUILTIN];
const MARGIN = 16;
const PILL = { w: 85, h: 42 };

describe("applyDragDelta — window follows cursor 1:1", () => {
  test("moves by exactly the cursor delta", () => {
    expect(applyDragDelta({ x: 3474, y: 924 }, { x: 3500, y: 945 }, { x: 3200, y: 600 })).toEqual({
      x: 3174,
      y: 579,
    });
  });
  test("no movement when cursor hasn't moved (no jitter at rest)", () => {
    expect(applyDragDelta({ x: 100, y: 100 }, { x: 500, y: 500 }, { x: 500, y: 500 })).toEqual({
      x: 100,
      y: 100,
    });
  });
});

describe("monitorFor — never returns null while monitors exist", () => {
  test("point on the built-in display resolves to built-in", () => {
    expect(monitorFor(2800, 500, MONS)).toBe(BUILTIN);
  });
  test("point on the external display resolves to external", () => {
    expect(monitorFor(1000, 600, MONS)).toBe(EXT);
  });
  test("window dragged far off ALL screens recovers to nearest (the vanish bug)", () => {
    // far below/right of everything — must still pick a real monitor
    const m = monitorFor(9999, 9999, MONS);
    expect(m).toBe(BUILTIN); // built-in's bottom-right is nearest to (9999,9999)
    expect(m).not.toBeNull();
  });
  test("point in the gap below the external still recovers", () => {
    expect(monitorFor(500, 5000, MONS)).toBe(EXT);
  });
});

describe("snapCorner — snaps within the monitor the window ended on", () => {
  test("dragged to built-in's bottom-right → br of built-in", () => {
    // center near built-in bottom-right
    expect(snapCorner(2048 + 1400, 900, BUILTIN)).toBe("br");
  });
  test("dragged to built-in's top-left → tl (not external's)", () => {
    expect(snapCorner(2048 + 50, 30, BUILTIN)).toBe("tl");
  });
  test("dragged to external's bottom-left → bl of external", () => {
    expect(snapCorner(100, 1100, EXT)).toBe("bl");
  });
});

describe("cornerPosition — always fully on-screen, 16px margins", () => {
  for (const [mname, mon] of [["external", EXT], ["built-in", BUILTIN]] as const) {
    for (const corner of ["tl", "tr", "bl", "br"] as const) {
      test(`${mname} ${corner} is inside the monitor`, () => {
        const p = cornerPosition(corner, mon, PILL.w, PILL.h, MARGIN);
        expect(p.x).toBeGreaterThanOrEqual(mon.x);
        expect(p.y).toBeGreaterThanOrEqual(mon.y);
        expect(p.x + PILL.w).toBeLessThanOrEqual(mon.x + mon.w);
        expect(p.y + PILL.h).toBeLessThanOrEqual(mon.y + mon.h);
      });
    }
  }
  test("built-in br lands at the expected 16px-margin spot", () => {
    const p = cornerPosition("br", BUILTIN, PILL.w, PILL.h, MARGIN);
    expect(p).toEqual({ x: 2048 + 1512 - 16 - 85, y: 982 - 16 - 42 }); // {3459, 924}
  });
  test("oversized panel still clamps on-screen (never off the edge)", () => {
    const p = cornerPosition("br", BUILTIN, 420, 560, MARGIN);
    expect(p.x).toBeGreaterThanOrEqual(BUILTIN.x);
    expect(p.y).toBeGreaterThanOrEqual(BUILTIN.y);
    expect(p.x + 420).toBeLessThanOrEqual(BUILTIN.x + BUILTIN.w);
    expect(p.y + 560).toBeLessThanOrEqual(BUILTIN.y + BUILTIN.h);
  });
});

describe("end-to-end: drag from corner A to monitor B, then snap", () => {
  test("drag built-in→external center, release → external corner, on-screen", () => {
    // start at built-in br pill, cursor grabs it, user moves to external center
    const startWin = { x: 3459, y: 924 };
    const cursorStart = { x: 3500, y: 945 };
    const cursorEnd = { x: 1024, y: 576 }; // middle of external
    const moved = applyDragDelta(startWin, cursorStart, cursorEnd);
    const center = { x: moved.x + PILL.w / 2, y: moved.y + PILL.h / 2 };
    const mon = monitorFor(center.x, center.y, MONS)!;
    expect(mon).toBe(EXT);
    const corner = snapCorner(center.x, center.y, mon);
    const finalPos = cornerPosition(corner, mon, PILL.w, PILL.h, MARGIN);
    expect(finalPos.x).toBeGreaterThanOrEqual(EXT.x);
    expect(finalPos.x + PILL.w).toBeLessThanOrEqual(EXT.x + EXT.w);
  });
});
