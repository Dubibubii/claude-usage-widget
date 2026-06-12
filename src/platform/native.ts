// Tauri-native implementations of the data bridge. The dev build talks to
// the Vite middleware instead (see vite.config.ts); both shapes are parsed
// by the same code in src/data/source.ts.

import type { FsLike } from "../data/scanCore";

export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const core = await import("@tauri-apps/api/core");
  return core.invoke<T>(cmd, args);
}

export async function nativeReadCapture(): Promise<
  { capturedAt: string; payload: unknown } | null
> {
  try {
    const r = await invoke<{ mtime_ms: number; content: string } | null>("read_capture");
    if (!r) return null;
    return {
      capturedAt: new Date(r.mtime_ms).toISOString(),
      payload: JSON.parse(r.content),
    };
  } catch {
    return null;
  }
}

export const nativeFs: FsLike = {
  async listFiles() {
    try {
      return await invoke<string[]>("list_transcripts");
    } catch {
      return [];
    }
  },
  async readText(path) {
    try {
      return await invoke<string | null>("read_transcript", { path });
    } catch {
      return null;
    }
  },
};

export async function nativeLogMeta(
  withContent: boolean,
): Promise<{ path: string; mtime: string; content?: string } | null> {
  try {
    const r = await invoke<{ path: string; mtime_ms: number; content: string | null } | null>(
      "usage_log_meta",
      { withContent },
    );
    if (!r) return null;
    return {
      path: r.path,
      mtime: new Date(r.mtime_ms).toISOString(),
      content: r.content ?? undefined,
    };
  } catch {
    return null;
  }
}

/** Error telemetry → ~/.claude/usage-widget/widget-errors.log (native).
 * A crashed transparent webview is an invisible window; the log makes
 * failures diagnosable after the fact. */
export function reportError(message: string): void {
  // eslint-disable-next-line no-console
  console.error("[widget]", message);
  if (isTauri) {
    void invoke("log_error", { message }).catch(() => {});
  }
}

/** Open a URL in the default browser. wry blocks window.open in the webview,
 * so the native build routes through the open_url command. */
export async function openExternal(url: string): Promise<void> {
  if (isTauri) {
    try {
      await invoke("open_url", { url });
    } catch {
      /* ignore */
    }
    return;
  }
  window.open(url, "_blank");
}

export async function nativeWriteLog(content: string): Promise<boolean> {
  try {
    await invoke("write_usage_log", { content });
    return true;
  } catch {
    return false;
  }
}

/** Save a small text file for the user: ~/Downloads natively (wry can't do
 * blob downloads), <a download> in the browser build. */
export async function saveTextFile(filename: string, content: string): Promise<boolean> {
  if (isTauri) {
    try {
      await invoke("save_text_file", { filename, content });
      return true;
    } catch {
      return false;
    }
  }
  try {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
