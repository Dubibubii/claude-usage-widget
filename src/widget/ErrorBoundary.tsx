import { Component, type ReactNode } from "react";
import { reportError } from "../platform/native";

/** The widget is a transparent overlay — an uncaught render error would
 * leave an invisible, unclickable window. This boundary guarantees a
 * visible, recoverable state and logs the failure for diagnosis. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(err: unknown) {
    return { error: String(err) };
  }

  componentDidCatch(err: unknown, info: { componentStack?: string | null }) {
    reportError(`render crash: ${String(err)}\n${info.componentStack ?? ""}`);
  }

  render() {
    if (this.state.error === null) return this.props.children;
    // deliberately theme-independent — the theme layer may be what crashed
    return (
      <div
        onClick={() => window.location.reload()}
        title={this.state.error}
        style={{
          position: "fixed",
          right: 8,
          bottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 14px",
          borderRadius: 999,
          background: "rgba(28,30,38,0.92)",
          border: "1px solid rgba(255,95,86,0.6)",
          color: "#F0F0EE",
          fontFamily: "'Instrument Sans', sans-serif",
          fontSize: 12,
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        <span style={{ color: "#FF5F56" }}>⚠</span> widget error — click to restart
      </div>
    );
  }
}
