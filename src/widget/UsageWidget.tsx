import { useEffect, useMemo, useRef, useState } from "react";
import { pillMeters, primaryOf, useStore } from "../state/store";
import { useTheme } from "../theme/useTheme";
import { usePaidPack } from "../theme/paidContent";
import { isTauri } from "../platform/native";
import {
  assembleSnapshot,
  detectAccount,
  fetchLiveRateLimits,
  fetchLocalUsage,
  recordDailyPeaks,
  type LiveRateLimits,
} from "../data/source";
import type { LocalUsage } from "../data/scanCore";
import { writeReportIfDue } from "../export/usageLog";
import {
  dragBegin,
  dragEnd,
  dragMove,
  isDraggingWindow,
  syncWindow,
} from "../platform/window";
import { validateLicense } from "../data/license";
import { LICENSE_GRACE_MS, LICENSE_REVALIDATE_MS } from "../config";
import type { Corner } from "../state/types";
import { Pill } from "./Pill";
import { Panel } from "./Panel";
import { SetupCard } from "./SetupCard";

// browser demo: pill floats in the viewport with real margins; native: the
// OS window provides the screen margin, content sits 1px inside it
const BROWSER_MARGIN = 16;
const NATIVE_MARGIN = 0; // window is sized exactly to content; margins are window-level
const DRAG_THRESHOLD = 4;
const PANEL_EST = { w: 338, h: 392 }; // pre-measure estimate to avoid clip on expand

const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

function cornerCss(corner: Corner): React.CSSProperties {
  const m = isTauri ? NATIVE_MARGIN : BROWSER_MARGIN;
  return {
    position: "fixed",
    ...(corner.includes("t") ? { top: m } : { bottom: m }),
    ...(corner.includes("l") ? { left: m } : { right: m }),
  };
}

function transformOrigin(corner: Corner): string {
  return `${corner.includes("t") ? "top" : "bottom"} ${corner.includes("l") ? "left" : "right"}`;
}

export function UsageWidget() {
  const { state, dispatch } = useStore();
  const pack = usePaidPack(state.entitlement.customizationActive);
  const { t } = useTheme(state.customization.skin, pack);

  // minute-precision countdowns (spec: countdown strings re-render every minute)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  // real 5h/weekly % from the Claude Code statusline capture — cheap local
  // file read, so poll every 10s to stay close behind Claude Code's writes;
  // each observation also feeds the 14-day history (daily peaks)
  const [live, setLive] = useState<LiveRateLimits | null>(null);
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const l = await fetchLiveRateLimits();
      if (cancelled) return;
      setLive(l);
      if (l?.fiveHour || l?.sevenDay) {
        recordDailyPeaks(l.fiveHour?.pct ?? null, l.sevenDay?.pct ?? null);
      }
    };
    poll();
    const i = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  // SDK credits / all-time tokens from local transcript logs (poll 5 min)
  const [local, setLocal] = useState<LocalUsage | null>(null);
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const l = await fetchLocalUsage(state.setup);
      if (!cancelled && l) setLocal(l);
    };
    poll();
    const i = setInterval(poll, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [state.setup.monthlyResetDay]);

  // opening the panel forces a fresh scan — the 5-min cadence lags behind a
  // just-finished SDK/Conductor turn, and "open the panel to check" is
  // exactly when stale numbers would read as "it isn't counting"
  useEffect(() => {
    if (!state.ui.expanded) return;
    let cancelled = false;
    fetchLocalUsage(state.setup, true).then((l) => {
      if (!cancelled && l) setLocal(l);
    });
    return () => {
      cancelled = true;
    };
  }, [state.ui.expanded, state.setup]);

  const usage = useMemo(
    () => assembleSnapshot(state.setup, live, local),
    [state.setup, live, local, now],
  );

  // usage report → real file, regenerated every 15 min from the local scan
  useEffect(() => {
    if (!state.setup.completed) return;
    void writeReportIfDue(state.setup, local);
  }, [state.setup, local, now]);

  // menu-bar title = primary meter % (native build; macOS)
  const trayPct = (() => {
    const p = primaryOf(pillMeters(state.meters, usage));
    return p?.pct != null ? Math.round(p.pct) : null;
  })();
  useEffect(() => {
    if (!isTauri) return;
    import("@tauri-apps/api/core").then(({ invoke }) =>
      invoke("set_tray_title", { title: trayPct !== null ? `${trayPct}%` : "–" }).catch(() => {}),
    );
  }, [trayPct]);

  // license revalidation: every 3 days, with a 14-day offline grace period
  useEffect(() => {
    const { customizationActive, licenseEmail, validatedAt } = state.entitlement;
    if (!customizationActive || !licenseEmail || !validatedAt) return;
    const age = Date.now() - new Date(validatedAt).getTime();
    if (age < LICENSE_REVALIDATE_MS) return;
    validateLicense(licenseEmail).then((result) => {
      if (result === "active") {
        dispatch({ type: "refreshLicense", at: new Date().toISOString() });
      } else if (result === "inactive") {
        dispatch({ type: "deactivateLicense" }); // subscription lapsed
      } else if (age > LICENSE_GRACE_MS) {
        dispatch({ type: "deactivateLicense" }); // unreachable beyond grace
      }
    });
  }, [state.entitlement, now]);

  // tray menu → Re-run Setup
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) =>
      listen("rerun-setup", () => dispatch({ type: "reopenSetup" })).then((u) => {
        unlisten = u;
      }),
    );
    return () => unlisten?.();
  }, []);

  // CUW_SELFTEST=1 → run the live drag/snap/expand suite against the real
  // OS window 3s after boot (results land in widget-errors.log)
  useEffect(() => {
    if (!isTauri || !state.setup.completed) return;
    const t = setTimeout(async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        if (!(await invoke<boolean>("is_selftest"))) return;
        const { runSelfTest } = await import("../platform/selftest");
        await runSelfTest({
          expand: () => dispatch({ type: "expand", tab: "limits" }),
          collapse: () => dispatch({ type: "collapse" }),
          // mirror the real pointer-up path exactly: corner + nonce so the
          // sync effect re-runs even when the corner didn't change
          setCorner: (corner) => {
            dispatch({ type: "setCorner", corner });
            setSnapNonce((n) => n + 1);
          },
        });
      } catch {
        /* never let the self-test break the app */
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [state.setup.completed]);

  // nonce forces a window re-sync even when the snapped corner is unchanged
  const [snapNonce, setSnapNonce] = useState(0);

  // drag → move; click → expand (spec §1, §5a)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragInfo = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // tooltip opens 600ms after hover (spec §1e); owned here because the
  // native window must grow to give it room
  const [tooltipOpen, setTooltipOpen] = useState(false);
  useEffect(() => {
    if (hovered && !dragPos) {
      const timer = window.setTimeout(() => setTooltipOpen(true), 600);
      return () => clearTimeout(timer);
    }
    setTooltipOpen(false);
  }, [hovered, dragPos]);

  // stuck-hover protection: pointerleave is NOT delivered when the window
  // moves/resizes under a stationary cursor (the content-fit window does
  // exactly that), so verify hover on every mouse move + window exit
  useEffect(() => {
    if (!hovered) return;
    const verify = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return setHovered(false);
      const r = el.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) setHovered(false);
    };
    const onOut = (e: MouseEvent) => {
      if (!(e as MouseEvent & { relatedTarget: EventTarget | null }).relatedTarget) {
        setHovered(false); // cursor left the window entirely
      }
    };
    document.addEventListener("mousemove", verify);
    document.addEventListener("mouseout", onOut);
    return () => {
      document.removeEventListener("mousemove", verify);
      document.removeEventListener("mouseout", onOut);
    };
  }, [hovered]);

  // expanding always clears hover state (the pill unmounts under the cursor)
  useEffect(() => {
    if (state.ui.expanded) setHovered(false);
  }, [state.ui.expanded]);

  const onPillPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !e.isPrimary) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // synthetic events have no active pointer to capture
    }
    // screenX/Y stay in a fixed frame even as the native window moves
    dragInfo.current = { startX: e.screenX, startY: e.screenY, moved: false };
  };

  const onPillPointerCancel = () => {
    if (dragInfo.current?.moved && isTauri) {
      void dragEnd().then((corner) => {
        if (corner) dispatch({ type: "setCorner", corner });
        setSnapNonce((n) => n + 1);
      });
    }
    dragInfo.current = null;
    setDragPos(null);
  };

  const onPillPointerMove = (e: React.PointerEvent) => {
    const d = dragInfo.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.screenX - d.startX, e.screenY - d.startY) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      setHovered(false);
      if (isTauri) void dragBegin(e.screenX, e.screenY);
    }
    if (isTauri) {
      void dragMove(e.screenX, e.screenY); // window follows the cursor 1:1
    } else {
      const el = rootRef.current;
      const w = el?.offsetWidth ?? 80;
      const h = el?.offsetHeight ?? 38;
      setDragPos({ x: e.clientX - w / 2, y: e.clientY - h / 2 });
    }
  };

  const onPillPointerUp = (e: React.PointerEvent) => {
    const d = dragInfo.current;
    dragInfo.current = null;
    if (!d) return;
    if (!d.moved) {
      // click → expand; 0 enabled meters opens directly on Edit (spec §1f)
      const anyEnabled = state.meters.some((m) => m.enabled);
      dispatch({ type: "expand", tab: anyEnabled ? undefined : "edit" });
      return;
    }
    if (isTauri) {
      // real mouse-up = real drag end → snap now (no guess-timer)
      void dragEnd().then((corner) => {
        if (corner) dispatch({ type: "setCorner", corner });
        setSnapNonce((n) => n + 1);
      });
      return;
    }
    // browser: snap to nearest corner (euclidean), 180ms ease-out
    const x = e.clientX;
    const y = e.clientY;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dist: Record<Corner, number> = {
      tl: Math.hypot(x, y),
      tr: Math.hypot(W - x, y),
      bl: Math.hypot(x, H - y),
      br: Math.hypot(W - x, H - y),
    };
    const corner = CORNERS.reduce((a, b) => (dist[b] < dist[a] ? b : a));
    const el = rootRef.current;
    const w = el?.offsetWidth ?? 80;
    const h = el?.offsetHeight ?? 38;
    const target = {
      x: corner.includes("l") ? BROWSER_MARGIN : W - BROWSER_MARGIN - w,
      y: corner.includes("t") ? BROWSER_MARGIN : H - BROWSER_MARGIN - h,
    };
    setSnapping(true);
    setDragPos(target);
    setTimeout(() => {
      dispatch({ type: "setCorner", corner });
      setDragPos(null);
      setSnapping(false);
    }, 190);
  };

  // expanded panel mount/unmount with pop animation
  const expanded = state.ui.expanded;
  const [panelMounted, setPanelMounted] = useState(expanded);
  const [panelOpen, setPanelOpen] = useState(expanded);
  useEffect(() => {
    if (expanded) {
      setPanelMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setPanelOpen(true)));
    } else {
      setPanelOpen(false);
      const tmr = setTimeout(() => setPanelMounted(false), 210); // collapse 200ms
      return () => clearTimeout(tmr);
    }
  }, [expanded]);

  // Esc + click-outside collapse (browser); native uses window blur — with a
  // content-fit window, "outside" clicks land on other apps entirely
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "collapse" });
    };
    const onDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        dispatch({ type: "collapse" });
      }
    };
    const onBlur = () => dispatch({ type: "collapse" });
    window.addEventListener("keydown", onKey);
    if (isTauri) window.addEventListener("blur", onBlur);
    else window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [expanded, dispatch]);

  // ---- native content-fit window (kills the click dead-zone) ----
  // ResizeObserver tracks the live element so the OS window always matches the
  // content; a one-shot rAF could miss late layout and leave a wrong-sized
  // (giant transparent) window — the root cause of the click dead-zone.
  const [pillRect, setPillRect] = useState<{ w: number; h: number } | null>(null);
  const [panelRect, setPanelRect] = useState<{ w: number; h: number }>(PANEL_EST);
  useEffect(() => {
    if (!isTauri || !state.setup.completed) return;
    const el = panelMounted ? panelRef.current : rootRef.current;
    if (!el) return;
    const keep = (prev: { w: number; h: number } | null, w: number, h: number) =>
      prev && Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 ? prev : { w, h };
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w < 8 || h < 8) return; // not laid out yet
      if (panelMounted) setPanelRect((p) => keep(p, w, h) as { w: number; h: number });
      else setPillRect((p) => keep(p, w, h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [panelMounted, state.setup.completed]);

  const corner = state.ui.corner;
  useEffect(() => {
    if (!isTauri || isDraggingWindow()) return; // OS owns the window mid-drag
    if (!state.setup.completed) {
      void syncWindow(corner, { kind: "setup" });
    } else if (expanded) {
      void syncWindow(corner, { kind: "panel", ...panelRect });
    } else if (pillRect) {
      void syncWindow(corner, { kind: "pill", ...pillRect, tooltip: tooltipOpen });
    }
  }, [state.setup.completed, expanded, panelRect, pillRect, corner, tooltipOpen, snapNonce]);

  // zero-question onboarding: plan + billing day auto-detect from Claude
  // Code's own account config; the setup card only appears when detection
  // fails (weekly reset comes from live captures either way)
  const [detecting, setDetecting] = useState(!state.setup.completed);
  useEffect(() => {
    if (state.setup.completed) return;
    let cancelled = false;
    detectAccount().then((acct) => {
      if (cancelled) return;
      if (acct) {
        dispatch({
          type: "completeSetup",
          setup: {
            plan: acct.plan,
            monthlyResetDay: acct.monthlyResetDay,
            weeklyResetDow: state.setup.weeklyResetDow,
            weeklyResetTime: state.setup.weeklyResetTime,
          },
        });
      }
      setDetecting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [state.setup.completed]);

  const cssVars = {
    ["--hov-bg" as string]: t.iconBtnHoverBg,
    ["--accent-text-c" as string]: t.accentText,
    ["--row-hover-c" as string]: t.pillHoverBorder,
  };

  // first-run setup card — fallback when auto-detection fails (spec §8)
  if (!state.setup.completed) {
    if (detecting) return null; // sub-second account lookup
    return (
      <div
        className="theme-anim"
        style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", ...cssVars }}
      >
        <SetupCard t={t} onDone={() => {}} />
      </div>
    );
  }

  const positioned: React.CSSProperties = dragPos
    ? { position: "fixed", left: dragPos.x, top: dragPos.y }
    : cornerCss(corner);

  return (
    <div className="theme-anim" style={cssVars}>
      {/* ghost corner targets while dragging — browser demo only (native
          drags the OS window itself) */}
      {!isTauri && dragPos && !snapping && (
        <>
          {CORNERS.map((c) => (
            <div
              key={c}
              className="ghost-target show"
              style={{
                ...cornerCss(c),
                width: 76,
                height: 38,
                borderRadius: 999,
                border: `1.5px dashed ${t.lightSurface ? "rgba(28,30,38,0.25)" : "rgba(255,255,255,0.25)"}`,
                pointerEvents: "none",
              }}
            />
          ))}
        </>
      )}

      {/* collapsed pill */}
      {!panelMounted && (
        <div
          ref={rootRef}
          className={`pill-fade spawn-in${snapping ? " snap-anim" : ""}`}
          style={{ ...positioned, zIndex: 100, touchAction: "none" }}
          onPointerDown={onPillPointerDown}
          onPointerMove={onPillPointerMove}
          onPointerUp={onPillPointerUp}
          onPointerCancel={onPillPointerCancel}
          onLostPointerCapture={onPillPointerCancel}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <Pill
            meters={state.meters}
            usage={usage}
            t={t}
            style={state.customization.style}
            corner={corner}
            now={now}
            hovered={hovered && !dragPos}
            tooltipOpen={tooltipOpen}
            pack={pack}
          />
        </div>
      )}

      {/* expanded panel — grows INTO the screen from the pinned corner */}
      {panelMounted && (
        <div
          ref={panelRef}
          className={`panel-pop${panelOpen ? " open" : " closing"}`}
          style={{
            ...cornerCss(corner),
            zIndex: 100,
            transformOrigin: transformOrigin(corner),
          }}
        >
          <Panel t={t} usage={usage} now={now} onCollapse={() => dispatch({ type: "collapse" })} />
        </div>
      )}
    </div>
  );
}
