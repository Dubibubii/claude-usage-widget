// In-app live test suite (CUW_SELFTEST=1).
//
// Drives the REAL drag pipeline (dragBegin/dragMove/dragEnd) and the real
// expand/collapse window sizing against the real OS window in the shipped
// binary — scripted to reproduce the user's reported failures:
//   · contents separating from the frame while dragging
//   · snapping away mid-drag while the button is still held (pause test)
//   · dragging toward the screen edge and the widget vanishing
//   · cross-display drops
// Results go to widget-errors.log as "SELFTEST …" lines.

import { dragBegin, dragEnd, dragMove, monitors, syncWindow } from "./window";
import { cornerPosition, monitorFor } from "./dragGeom";
import { reportError } from "./native";
import type { Corner } from "../state/types";

interface Ctx {
  expand: () => void;
  collapse: () => void;
  setCorner: (c: Corner) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function winState() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const w = getCurrentWindow();
  const s = (await w.scaleFactor()) || 1;
  const p = await w.outerPosition();
  const sz = await w.outerSize();
  return { x: p.x / s, y: p.y / s, w: sz.width / s, h: sz.height / s };
}

// monitors() comes from window.ts — the SAME work-area geometry the app
// positions with, so expectations can never drift from behavior

function onAnyMonitor(r: { x: number; y: number; w: number; h: number }, mons: { x: number; y: number; w: number; h: number }[]) {
  return mons.some(
    (m) => r.x >= m.x - 1 && r.y >= m.y - 1 && r.x + r.w <= m.x + m.w + 1 && r.y + r.h <= m.y + m.h + 1,
  );
}

export async function runSelfTest(ctx: Ctx): Promise<void> {
  const out: string[] = [];
  const check = (name: string, ok: boolean, detail: string) => {
    out.push(`SELFTEST ${ok ? "PASS" : "FAIL"} ${name} — ${detail}`);
  };

  try {
    const mons = await monitors();
    const start = await winState();
    check("boot-size", start.w <= 320 && start.h <= 200, `window ${start.w}x${start.h} (must be content-fit, not a slab)`);

    // ---- scenario 1: drag to main-display center with 1:1 follow ----
    const grab = { x: start.x + 10, y: start.y + 10 };
    await dragBegin(grab.x, grab.y);
    const main = mons[0];
    const target = { x: main.x + main.w / 2, y: main.y + main.h / 2 };
    const steps = 20;
    let followOk = true;
    for (let i = 1; i <= steps; i++) {
      const cx = grab.x + ((target.x - grab.x) * i) / steps;
      const cy = grab.y + ((target.y - grab.y) * i) / steps;
      await dragMove(cx, cy);
      await sleep(12);
      if (i === Math.floor(steps / 2)) {
        const mid = await winState();
        const expX = start.x + (cx - grab.x);
        const expY = start.y + (cy - grab.y);
        followOk = Math.abs(mid.x - expX) < 4 && Math.abs(mid.y - expY) < 4;
        check("drag-follows-1to1", followOk, `mid-drag window=(${mid.x.toFixed(0)},${mid.y.toFixed(0)}) expected=(${expX.toFixed(0)},${expY.toFixed(0)})`);
      }
    }

    // ---- scenario 2: PAUSE mid-drag, button still held (the snap bug) ----
    const beforePause = await winState();
    await sleep(3500);
    const afterPause = await winState();
    check(
      "no-snap-while-paused",
      Math.abs(afterPause.x - beforePause.x) < 2 && Math.abs(afterPause.y - beforePause.y) < 2,
      `held still 3.5s: (${beforePause.x.toFixed(0)},${beforePause.y.toFixed(0)}) → (${afterPause.x.toFixed(0)},${afterPause.y.toFixed(0)})`,
    );

    // ---- scenario 3: release in the middle → snap EXACTLY to a corner ----
    const corner1 = await dragEnd();
    if (corner1) ctx.setCorner(corner1);
    await sleep(700);
    const snapped = await winState();
    const exp1 = corner1
      ? cornerPosition(corner1, monitorFor(snapped.x + snapped.w / 2, snapped.y + snapped.h / 2, mons)!, snapped.w, snapped.h, 16)
      : null;
    check(
      "snap-on-release",
      corner1 !== null && exp1 !== null && Math.abs(snapped.x - exp1.x) < 3 && Math.abs(snapped.y - exp1.y) < 3,
      `corner=${corner1} window=(${snapped.x.toFixed(0)},${snapped.y.toFixed(0)}) expected=(${exp1?.x},${exp1?.y})`,
    );

    // ---- scenario 4: drag DOWN past the bottom edge (the vanish bug) ----
    const s4 = await winState();
    await dragBegin(s4.x + 10, s4.y + 10);
    for (let i = 1; i <= 12; i++) {
      await dragMove(s4.x + 10, s4.y + 10 + i * 60); // far below the screen
      await sleep(10);
    }
    const corner2 = await dragEnd();
    if (corner2) ctx.setCorner(corner2);
    await sleep(700);
    const rescued = await winState();
    const exp2 = corner2
      ? cornerPosition(corner2, monitorFor(rescued.x + rescued.w / 2, rescued.y + rescued.h / 2, mons)!, rescued.w, rescued.h, 16)
      : null;
    check(
      "edge-drag-recovers",
      onAnyMonitor(rescued, mons) && exp2 !== null && Math.abs(rescued.x - exp2.x) < 3 && Math.abs(rescued.y - exp2.y) < 3,
      `after off-bottom drag: (${rescued.x.toFixed(0)},${rescued.y.toFixed(0)}) expected=(${exp2?.x},${exp2?.y}) corner=${corner2}`,
    );

    // ---- scenario 5: cross-display drop (when 2+ monitors) ----
    if (mons.length > 1) {
      const other = mons[1];
      const s5 = await winState();
      await dragBegin(s5.x + 10, s5.y + 10);
      const t5 = { x: other.x + other.w / 2, y: other.y + other.h / 2 };
      for (let i = 1; i <= 15; i++) {
        await dragMove(s5.x + 10 + ((t5.x - s5.x - 10) * i) / 15, s5.y + 10 + ((t5.y - s5.y - 10) * i) / 15);
        await sleep(10);
      }
      const corner3 = await dragEnd();
      if (corner3) ctx.setCorner(corner3);
      await sleep(700);
      const crossed = await winState();
      const exp3 = corner3 ? cornerPosition(corner3, other, crossed.w, crossed.h, 16) : null;
      check(
        "cross-display-snap",
        corner3 !== null && exp3 !== null && Math.abs(crossed.x - exp3.x) < 3 && Math.abs(crossed.y - exp3.y) < 3,
        `corner=${corner3} window=(${crossed.x.toFixed(0)},${crossed.y.toFixed(0)}) expected=(${exp3?.x},${exp3?.y})`,
      );
    }

    // ---- scenario 6: expand → panel-sized window; collapse → pill ----
    ctx.expand();
    await sleep(900);
    const panel = await winState();
    check("expand-panel-size", panel.w > 300 && panel.w < 420 && panel.h > 300, `panel window ${panel.w}x${panel.h}`);
    ctx.collapse();
    await sleep(900);
    const backToPill = await winState();
    check("collapse-pill-size", backToPill.w <= 320 && backToPill.h <= 200, `pill window ${backToPill.w}x${backToPill.h}`);
    check("final-on-screen", onAnyMonitor(backToPill, mons), `(${backToPill.x.toFixed(0)},${backToPill.y.toFixed(0)})`);

    // restore the user's preferred corner
    ctx.setCorner("br");
    await sleep(400);
    await syncWindow("br", { kind: "pill", w: backToPill.w - 2, h: backToPill.h - 2, tooltip: false });
  } catch (e) {
    out.push(`SELFTEST FAIL exception — ${String(e)}`);
  }

  const fails = out.filter((l) => l.includes("FAIL")).length;
  out.push(`SELFTEST DONE — ${out.length - fails ? out.filter((l) => l.includes("PASS")).length : 0} pass, ${fails} fail`);
  for (const line of out) reportError(line);
}
