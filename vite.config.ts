import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { scanLocalUsage, type FsLike, type LocalUsage } from "./src/data/scanCore";

const CAPTURE_FILE = path.join(os.homedir(), ".claude", "usage-widget", "statusline-latest.json");
const LOG_FILE = path.join(os.homedir(), "Documents", "claude-usage.md");
const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");
const SCAN_TTL_MS = 5 * 60_000;

const nodeFs: FsLike = {
  async listFiles(dir, suffix) {
    const out: string[] = [];
    const walk = async (d: string) => {
      let entries;
      try {
        entries = await fsp.readdir(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) await walk(p);
        else if (e.name.endsWith(suffix)) out.push(p);
      }
    };
    await walk(dir);
    return out;
  },
  async readText(p) {
    try {
      return await fsp.readFile(p, "utf8");
    } catch {
      return null;
    }
  },
};

function json(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

/** Local-data bridge for the browser dev build. The Tauri shell performs the
 * same operations natively via its fs bridge (src/platform/fs.ts). */
function widgetDataBridge(): Plugin {
  let scanCache: { atMs: number; cycleStart: string; data: LocalUsage } | null = null;

  return {
    name: "usage-widget-data-bridge",
    configureServer(server) {
      // real 5h/weekly % captured from Claude Code's statusline
      server.middlewares.use("/api/rate-limits", (_req, res) => {
        try {
          const stat = fs.statSync(CAPTURE_FILE);
          const payload = JSON.parse(fs.readFileSync(CAPTURE_FILE, "utf8"));
          json(res, 200, { capturedAt: stat.mtime.toISOString(), payload });
        } catch {
          json(res, 404, { error: "no capture yet" });
        }
      });

      // SDK credits / all-time tokens from local transcript logs
      server.middlewares.use("/api/local-usage", async (req, res) => {
        const url = new URL(req.url ?? "/", "http://x");
        const cycleStart = url.searchParams.get("cycleStart") ?? new Date(0).toISOString();
        const fresh = url.searchParams.get("refresh") === "1";
        if (
          !fresh &&
          scanCache &&
          scanCache.cycleStart === cycleStart &&
          Date.now() - scanCache.atMs < SCAN_TTL_MS
        ) {
          return json(res, 200, scanCache.data);
        }
        try {
          const data = await scanLocalUsage(nodeFs, PROJECTS_DIR, cycleStart);
          scanCache = { atMs: Date.now(), cycleStart, data };
          json(res, 200, data);
        } catch (e) {
          json(res, 500, { error: String(e) });
        }
      });

      // account info for zero-question onboarding (plan tier + billing day)
      server.middlewares.use("/api/account", (_req, res) => {
        try {
          const cfg = JSON.parse(
            fs.readFileSync(path.join(os.homedir(), ".claude.json"), "utf8"),
          );
          const acct = cfg?.oauthAccount ?? {};
          json(res, 200, {
            rateLimitTier:
              acct.userRateLimitTier ?? acct.organizationRateLimitTier ?? null,
            organizationType: acct.organizationType ?? null,
            subscriptionCreatedAt: acct.subscriptionCreatedAt ?? null,
            hasExtraUsageEnabled: acct.hasExtraUsageEnabled ?? null,
          });
        } catch {
          json(res, 404, { error: "no account info" });
        }
      });

      // markdown usage report — real file at ~/Documents/claude-usage.md;
      // the frontend regenerates the whole current-month report each write
      server.middlewares.use("/api/usage-log", async (req, res) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (c) => (body += c));
          req.on("end", async () => {
            try {
              const { full } = JSON.parse(body) as { full: string };
              if (typeof full !== "string") throw new Error("missing full content");
              await fsp.mkdir(path.dirname(LOG_FILE), { recursive: true });
              await fsp.writeFile(LOG_FILE, full, "utf8");
              json(res, 200, { ok: true });
            } catch (e) {
              json(res, 500, { error: String(e) });
            }
          });
          return;
        }
        // GET → file metadata (+content for export)
        const url = new URL(req.url ?? "/", "http://x");
        try {
          const stat = fs.statSync(LOG_FILE);
          const out: Record<string, unknown> = {
            path: LOG_FILE,
            mtime: stat.mtime.toISOString(),
          };
          if (url.searchParams.get("content") === "1") {
            out.content = fs.readFileSync(LOG_FILE, "utf8");
          }
          json(res, 200, out);
        } catch {
          json(res, 404, { error: "no log yet" });
        }
      });
    },
  };
}

// Port is strict + loopback-bound so the Tauri devUrl always matches.
export default defineConfig({
  plugins: [react(), widgetDataBridge()],
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 4733,
    strictPort: true,
  },
  build: {
    target: "safari16",
  },
});
