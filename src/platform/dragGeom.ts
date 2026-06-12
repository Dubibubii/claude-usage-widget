// Pure drag/snap geometry — no Tauri, no DOM, so it's unit-testable.
// window.ts wires these to the live monitor + window APIs.

import type { Corner } from "../state/types";

export interface MonInfo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Window position while dragging: follow the cursor 1:1 from where the drag
 * began (in a fixed screen frame, so it's robust to the window moving). */
export function applyDragDelta(
  startWin: { x: number; y: number },
  cursorStart: { x: number; y: number },
  cursorNow: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: startWin.x + (cursorNow.x - cursorStart.x),
    y: startWin.y + (cursorNow.y - cursorStart.y),
  };
}

/** Monitor containing the point, else the NEAREST one — guarantees a window
 * that strayed past every display still recovers to a real screen. */
export function monitorFor(px: number, py: number, mons: MonInfo[]): MonInfo | null {
  if (mons.length === 0) return null;
  const inside = mons.find((m) => px >= m.x && px < m.x + m.w && py >= m.y && py < m.y + m.h);
  if (inside) return inside;
  let best = mons[0];
  let bestD = Infinity;
  for (const m of mons) {
    const cx = Math.max(m.x, Math.min(px, m.x + m.w));
    const cy = Math.max(m.y, Math.min(py, m.y + m.h));
    const d = (cx - px) ** 2 + (cy - py) ** 2;
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

/** Nearest corner of a monitor to a window-center point. */
export function snapCorner(centerX: number, centerY: number, mon: MonInfo): Corner {
  const midX = mon.x + mon.w / 2;
  const midY = mon.y + mon.h / 2;
  return `${centerY < midY ? "t" : "b"}${centerX < midX ? "l" : "r"}` as Corner;
}

/** Final window position for a corner, clamped inside the monitor so it can
 * never be placed partially or fully off-screen. */
export function cornerPosition(
  corner: Corner,
  mon: MonInfo,
  width: number,
  height: number,
  margin: number,
): { x: number; y: number } {
  const left = corner.includes("l");
  const top = corner.includes("t");
  let x = left ? mon.x + margin : mon.x + mon.w - margin - width;
  let y = top ? mon.y + margin : mon.y + mon.h - margin - height;
  x = Math.min(Math.max(x, mon.x), mon.x + mon.w - width);
  y = Math.min(Math.max(y, mon.y), mon.y + mon.h - height);
  return { x: Math.round(x), y: Math.round(y) };
}
