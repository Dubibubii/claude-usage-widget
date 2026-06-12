// Transcript scanner — pure logic over an abstract filesystem so the same
// code runs in the Vite dev server (node fs) and the Tauri shell (fs bridge).
//
// Parsing rules per the project's verified research (design/ + HANDOFF):
//  · source of truth: ~/.claude/projects/**/*.jsonl (incl. subagents)
//  · keep type === "assistant" with message.model present, !== "<synthetic>",
//    and non-zero usage
//  · dedup by requestId (first seen wins); fallback message.id, then
//    sessionId+uuid
//  · `entrypoint` classifies the billing pool: sdk-* → Agent SDK credits;
//    cli / claude-desktop → interactive Pro/Max pool
//  · cost is derived from model pricing — never stored in the logs

import { costUsd, type UsageTokens } from "./pricing";

export interface FsLike {
  listFiles(dir: string, suffix: string): Promise<string[]>;
  readText(path: string): Promise<string | null>;
}

export interface DayUsage {
  date: string; // YYYY-MM-DD, local time
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  totalTokens: number;
  costUsd: number; // API-equivalent estimate
  requests: number;
  sessions: number;
  /** usd optional for fixture-compat; the scanner always fills it */
  byModel: { model: string; tokens: number; usd?: number }[]; // desc by tokens
  byProject: { project: string; tokens: number }[]; // desc
  sdk: { tokens: number; usd: number };
}

export interface LocalUsage {
  generatedAt: string;
  scannedFiles: number;
  records: number;
  allTime: { tokens: number; since: string | null };
  /** last DAY_WINDOW days with any activity, ascending by date — feeds the
   * History chart (instant real history, no waiting for live observations)
   * and the exportable monthly report */
  days: DayUsage[];
  sdkCycle: {
    cycleStart: string;
    spentUsd: number;
    byApp: { app: string; usd: number }[];
  };
}

/** covers a full billing month for the report + the 14-day chart */
const DAY_WINDOW_MS = 31 * 86400_000;

function localDayKey(d: Date): string {
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface DayAcc {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number;
  requests: number;
  sessions: Set<string>;
  byModel: Map<string, { tokens: number; usd: number }>;
  byProject: Map<string, number>;
  sdkTokens: number;
  sdkUsd: number;
}

function tokensOf(usage: any): UsageTokens | null {
  if (!usage || typeof usage !== "object") return null;
  const cc = usage.cache_creation;
  const cw5 = cc?.ephemeral_5m_input_tokens;
  const cw1h = cc?.ephemeral_1h_input_tokens;
  const fallbackCw = usage.cache_creation_input_tokens ?? 0;
  const t: UsageTokens = {
    input: usage.input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    // if no 5m/1h breakdown, treat all cache writes as 5m (1.25×)
    cacheWrite5m: cw5 ?? (cw1h !== undefined ? 0 : fallbackCw),
    cacheWrite1h: cw1h ?? 0,
    webSearchRequests: usage.server_tool_use?.web_search_requests ?? 0,
  };
  const total = t.input + t.output + t.cacheRead + t.cacheWrite5m + t.cacheWrite1h;
  return total > 0 ? t : null;
}

function appNameFrom(cwd: string | undefined, filePath: string): string {
  if (cwd && typeof cwd === "string") {
    const base = cwd.replace(/\/+$/, "").split("/").pop();
    if (base) return base;
  }
  // fall back to the encoded project dir name (hyphens may be real — don't decode)
  const m = filePath.match(/projects\/([^/]+)\//);
  return m ? m[1] : "unknown";
}

export async function scanLocalUsage(
  fs: FsLike,
  claudeProjectsDir: string,
  cycleStartIso: string,
): Promise<LocalUsage> {
  const files = await fs.listFiles(claudeProjectsDir, ".jsonl");
  const seen = new Set<string>();
  const cycleStart = new Date(cycleStartIso).getTime();
  const dayWindowStart = Date.now() - DAY_WINDOW_MS;

  let allTimeTokens = 0;
  let earliest: string | null = null;
  let records = 0;
  let sdkSpent = 0;
  const byApp = new Map<string, number>();
  const dayAcc = new Map<string, DayAcc>();

  for (const file of files) {
    const text = await fs.readText(file);
    if (!text) continue;
    for (const rawLine of text.split("\n")) {
      if (!rawLine || rawLine[0] !== "{") continue;
      let line: any;
      try {
        line = JSON.parse(rawLine);
      } catch {
        continue;
      }
      if (line.type !== "assistant") continue;
      const model = line.message?.model;
      if (!model || model === "<synthetic>") continue;
      const t = tokensOf(line.message?.usage);
      if (!t) continue;

      const key: string =
        line.requestId ?? line.message?.id ?? `${line.sessionId}:${line.uuid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      records++;

      const total =
        t.input + t.output + t.cacheRead + t.cacheWrite5m + t.cacheWrite1h;
      allTimeTokens += total;
      const ts: string | undefined = line.timestamp;
      if (ts && (!earliest || ts < earliest)) earliest = ts;

      const isSdk =
        typeof line.entrypoint === "string" && line.entrypoint.startsWith("sdk");
      if (isSdk && ts && new Date(ts).getTime() >= cycleStart) {
        const usd = costUsd(model, t);
        sdkSpent += usd;
        const app = appNameFrom(line.cwd, file);
        byApp.set(app, (byApp.get(app) ?? 0) + usd);
      }

      // per-day rollup (recent window only). Timestamps are ISO instants;
      // day keys use the LOCAL calendar day — the same convention as
      // cycleStartFor (local midnight), dailyActivity14d, and dailyPeaks.
      if (ts) {
        const tsMs = new Date(ts).getTime();
        if (tsMs >= dayWindowStart) {
          const key = localDayKey(new Date(tsMs));
          let d = dayAcc.get(key);
          if (!d) {
            d = {
              input: 0, output: 0, cacheRead: 0, cacheWrite: 0,
              costUsd: 0, requests: 0,
              sessions: new Set(), byModel: new Map(), byProject: new Map(),
              sdkTokens: 0, sdkUsd: 0,
            };
            dayAcc.set(key, d);
          }
          const usd = costUsd(model, t);
          d.input += t.input;
          d.output += t.output;
          d.cacheRead += t.cacheRead;
          d.cacheWrite += t.cacheWrite5m + t.cacheWrite1h;
          d.costUsd += usd;
          d.requests++;
          if (typeof line.sessionId === "string") d.sessions.add(line.sessionId);
          const m = d.byModel.get(model) ?? { tokens: 0, usd: 0 };
          m.tokens += total;
          m.usd += usd;
          d.byModel.set(model, m);
          const proj = appNameFrom(line.cwd, file);
          d.byProject.set(proj, (d.byProject.get(proj) ?? 0) + total);
          if (isSdk) {
            d.sdkTokens += total;
            d.sdkUsd += usd;
          }
        }
      }
    }
  }

  const days: DayUsage[] = [...dayAcc.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, d]) => ({
      date,
      tokens: { input: d.input, output: d.output, cacheRead: d.cacheRead, cacheWrite: d.cacheWrite },
      totalTokens: d.input + d.output + d.cacheRead + d.cacheWrite,
      costUsd: Math.round(d.costUsd * 100) / 100,
      requests: d.requests,
      sessions: d.sessions.size,
      byModel: [...d.byModel.entries()]
        .sort((a, b) => b[1].tokens - a[1].tokens)
        .map(([model, v]) => ({ model, tokens: v.tokens, usd: Math.round(v.usd * 100) / 100 })),
      byProject: [...d.byProject.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([project, tokens]) => ({ project, tokens })),
      sdk: { tokens: d.sdkTokens, usd: Math.round(d.sdkUsd * 100) / 100 },
    }));

  // top apps desc; >3 → collapse the tail into "Other apps" (spec §4 p2)
  const sorted = [...byApp.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 3).map(([app, usd]) => ({ app, usd }));
  const rest = sorted.slice(3).reduce((s, [, usd]) => s + usd, 0);
  if (rest > 0.005) top.push({ app: "Other apps", usd: rest });

  return {
    generatedAt: new Date().toISOString(),
    scannedFiles: files.length,
    records,
    allTime: { tokens: allTimeTokens, since: earliest },
    days,
    sdkCycle: {
      cycleStart: cycleStartIso,
      spentUsd: Math.round(sdkSpent * 100) / 100,
      byApp: top,
    },
  };
}
