// Native window behavior (Tauri only).
//
// DRAG MODEL — deterministic manual dragging (NOT OS startDragging):
//   pointerdown  → record cursor screen pos + window's current outer pos
//   pointermove  → move the window by the exact screen delta (window follows
//                  the cursor 1:1; contents never separate from the frame)
//   pointerup    → snap to the nearest corner of the monitor it ended on
// This replaced an OS-drag + "movement went quiet for 280ms" heuristic that
// snapped the window mid-drag whenever the user paused while still holding.
//
// SINGLE-AUTHORITY RULE: while dragging, syncWindow() is suspended so the
// React layout effect can't reposition the window underneath the drag.

import type { Corner } from "../state/types";
import { isTauri } from "./native";
import {
  applyDragDelta,
  cornerPosition,
  monitorFor,
  snapCorner,
  type MonInfo,
} from "./dragGeom";

export const EDGE_MARGIN = 16; // visual margin from the pinned screen corner
const TOOLTIP_ROOM_H = 150; // extra height while the tooltip is open
const TOOLTIP_ROOM_W = 290; // tooltip lines are wider than the pill

export type WindowMode =
  | { kind: "setup" }
  | { kind: "pill"; w: number; h: number; tooltip: boolean }
  | { kind: "panel"; w: number; h: number };

let dragging = false;
export function isDraggingWindow(): boolean {
  return dragging;
}

// The window starts visible at a tiny default size (tauri.conf 120×70) — too
// small to ever be a "dead-zone slab" — and content-fit corrects it to the
// exact pill/panel size on first layout. (Starting hidden + show() proved
// unreliable for an accessory + vibrancy window across window-server states.)

async function api() {
  return import("@tauri-apps/api/window");
}

/** Work-area rects (menu bar + Dock excluded) — exported so the self-test
 * asserts against the exact same geometry the app positions with. */
export async function monitors(): Promise<MonInfo[]> {
  const { availableMonitors, primaryMonitor } = await api();
  let list = await availableMonitors();
  if (list.length === 0) {
    const p = await primaryMonitor();
    if (p) list = [p];
  }
  return list.map((m) => {
    const s = m.scaleFactor || 1;
    // workArea excludes the menu bar/Dock so the pill never overlaps them;
    // fall back to a manual macOS menu-bar inset on older API versions
    const wa = (m as unknown as { workArea?: { position: { x: number; y: number }; size: { width: number; height: number } } }).workArea;
    if (wa) {
      return { x: wa.position.x / s, y: wa.position.y / s, w: wa.size.width / s, h: wa.size.height / s };
    }
    const MENUBAR = 25;
    return {
      x: m.position.x / s,
      y: m.position.y / s + MENUBAR,
      w: m.size.width / s,
      h: m.size.height / s - MENUBAR,
    };
  });
}

/** Resize + reposition the OS window for the current content and corner.
 * No-op while a drag is in progress (the drag owns the window then). */
export async function syncWindow(corner: Corner, mode: WindowMode): Promise<void> {
  if (!isTauri || dragging) return;
  try {
    const { getCurrentWindow, LogicalPosition, LogicalSize } = await api();
    const w = getCurrentWindow();
    const mons = await monitors();
    // anchor to the monitor the window currently sits on
    let cur = { x: 0, y: 0 };
    try {
      const p = await w.outerPosition();
      const s = (await w.scaleFactor()) || 1;
      cur = { x: p.x / s, y: p.y / s };
    } catch {
      /* ignore */
    }
    const mon = monitorFor(cur.x + 40, cur.y + 20, mons) ?? mons[0];
    if (!mon) return;

    if (mode.kind === "setup") {
      await w.setSize(new LogicalSize(420, 560));
      await w.setPosition(
        new LogicalPosition(Math.round(mon.x + (mon.w - 420) / 2), Math.round(mon.y + (mon.h - 560) / 2)),
      );
      return;
    }

    // exact content size — any extra padding shows as a frost rectangle
    // around the glass (vibrancy fills the whole window rect)
    let width = Math.ceil(mode.w);
    let height = Math.ceil(mode.h);
    if (mode.kind === "pill" && mode.tooltip) {
      height += TOOLTIP_ROOM_H;
      width = Math.max(width, TOOLTIP_ROOM_W);
    }
    const { x, y } = cornerPosition(corner, mon, width, height, EDGE_MARGIN);

    if (dragging) return; // re-check after awaits
    await w.setSize(new LogicalSize(width, height));
    await w.setPosition(new LogicalPosition(x, y));

    // desktop-blur material only where it fills the window shape exactly
    // (panel/setup); in pill+tooltip modes it reads as a frost slab/square
    const { invoke } = await import("@tauri-apps/api/core");
    void invoke("set_vibrancy", { enabled: mode.kind !== "pill" }).catch(() => {});
  } catch {
    /* window APIs unavailable */
  }
}

// ---- manual drag primitives (driven by UsageWidget pointer handlers) ----

let dragStart: { cursorX: number; cursorY: number; winX: number; winY: number } | null = null;

/** Begin a manual drag from the current cursor screen position. */
export async function dragBegin(cursorScreenX: number, cursorScreenY: number): Promise<void> {
  if (!isTauri) return;
  try {
    const { getCurrentWindow } = await api();
    const w = getCurrentWindow();
    const p = await w.outerPosition();
    const s = (await w.scaleFactor()) || 1;
    dragStart = { cursorX: cursorScreenX, cursorY: cursorScreenY, winX: p.x / s, winY: p.y / s };
    dragging = true;
  } catch {
    dragging = false;
  }
}

/** Move the window so it follows the cursor 1:1 (window + contents together). */
export async function dragMove(cursorScreenX: number, cursorScreenY: number): Promise<void> {
  if (!isTauri || !dragging || !dragStart) return;
  try {
    const { getCurrentWindow, LogicalPosition } = await api();
    const { x, y } = applyDragDelta(
      { x: dragStart.winX, y: dragStart.winY },
      { x: dragStart.cursorX, y: dragStart.cursorY },
      { x: cursorScreenX, y: cursorScreenY },
    );
    await getCurrentWindow().setPosition(new LogicalPosition(Math.round(x), Math.round(y)));
  } catch {
    /* ignore */
  }
}

/** End the drag: snap to the nearest corner of the monitor the window is on.
 * Returns the chosen corner (caller updates state, which re-runs syncWindow
 * to place it precisely at the margin). */
export async function dragEnd(): Promise<Corner | null> {
  if (!isTauri || !dragStart) {
    dragging = false;
    dragStart = null;
    return null;
  }
  try {
    const { getCurrentWindow } = await api();
    const w = getCurrentWindow();
    const s = (await w.scaleFactor()) || 1;
    const p = await w.outerPosition();
    const size = await w.outerSize();
    const cx = p.x / s + size.width / s / 2;
    const cy = p.y / s + size.height / s / 2;
    const mons = await monitors();
    const mon = monitorFor(cx, cy, mons);
    dragging = false;
    dragStart = null;
    return mon ? snapCorner(cx, cy, mon) : null;
  } catch {
    dragging = false;
    dragStart = null;
    return null;
  }
}
