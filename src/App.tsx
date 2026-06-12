import { useEffect, useState } from "react";
import { StoreProvider } from "./state/store";
import { UsageWidget } from "./widget/UsageWidget";
import { ErrorBoundary } from "./widget/ErrorBoundary";

const isTauri = "__TAURI_INTERNALS__" in window;

/** In the desktop build the window is transparent and the widget floats over
 * the real desktop. In the browser (dev) we render demo scenery — the spec's
 * mock backdrop — so the glass materials have something to refract.
 * The scenery is NOT part of the widget. */
export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        {!isTauri && <DemoScenery />}
        <UsageWidget />
      </StoreProvider>
    </ErrorBoundary>
  );
}

function DemoScenery() {
  const [dark, setDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: dark
          ? "radial-gradient(circle at 20% 0%, #2B3040 0%, #16181F 55%, #101116 100%)"
          : "radial-gradient(circle at 20% 0%, #F4F6FA 0%, #E0E4EC 50%, #CDD2DE 100%)",
      }}
    >
      {!dark && (
        <>
          <Blob x="-6%" y="-12%" size={300} color="rgba(91,124,250,0.5)" />
          <Blob x="60%" y="20%" size={340} color="rgba(224,106,67,0.5)" />
          <Blob x="25%" y="70%" size={280} color="rgba(63,168,115,0.45)" />
        </>
      )}
      <div
        style={{
          position: "absolute",
          left: 24,
          bottom: 24,
          fontSize: 12,
          color: dark ? "rgba(255,255,255,0.25)" : "rgba(28,30,38,0.3)",
          lineHeight: 1.7,
        }}
      >
        demo backdrop (dev only) · drag the pill between corners · click it to expand
        <br />
        toggle your OS appearance to see the 300ms light/dark crossfade
      </div>
    </div>
  );
}

function Blob({ x, y, size, color }: { x: string; y: string; size: number; color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(8px)",
        pointerEvents: "none",
      }}
    />
  );
}
