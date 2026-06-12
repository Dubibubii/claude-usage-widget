// Model pricing (USD per MTok) for API-equivalent cost of Agent SDK usage.
// Prefix-matched, first hit wins; trailing "[1m]" context tags are stripped.
// NOTE: this estimates Anthropic's SDK-credit metering from public API prices —
// label-checked against the plan pool, but it is an estimate, not their ledger.
// pricing_version: 2026-06-11

export interface ModelPrice {
  inPerM: number;
  outPerM: number;
}

const PRICES: [prefix: string, price: ModelPrice][] = [
  ["claude-fable", { inPerM: 10, outPerM: 50 }],
  ["claude-opus-4-8", { inPerM: 5, outPerM: 25 }],
  ["claude-opus-4-7", { inPerM: 5, outPerM: 25 }],
  ["claude-opus-4-6", { inPerM: 5, outPerM: 25 }],
  ["claude-opus-4-5", { inPerM: 5, outPerM: 25 }],
  // Opus 4.1 and earlier (incl. dated claude-opus-4-20250514, claude-3-opus)
  ["claude-opus", { inPerM: 15, outPerM: 75 }],
  ["claude-3-opus", { inPerM: 15, outPerM: 75 }],
  ["claude-sonnet", { inPerM: 3, outPerM: 15 }],
  ["claude-3-7-sonnet", { inPerM: 3, outPerM: 15 }],
  ["claude-3-5-sonnet", { inPerM: 3, outPerM: 15 }],
  ["claude-haiku-4", { inPerM: 1, outPerM: 5 }],
  ["claude-3-5-haiku", { inPerM: 0.8, outPerM: 4 }],
  ["claude-3-haiku", { inPerM: 0.25, outPerM: 1.25 }],
];

const FALLBACK: ModelPrice = { inPerM: 5, outPerM: 25 };

export function priceFor(model: string): ModelPrice {
  const id = model.replace(/\s*\[1m\]\s*$/, "").trim();
  for (const [prefix, price] of PRICES) {
    if (id.startsWith(prefix)) return price;
  }
  return FALLBACK;
}

export interface UsageTokens {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  webSearchRequests: number;
}

/** cache-write-5m = 1.25× input · cache-write-1h = 2× input · cache-read = 0.1× input
 * web_search ≈ $0.01/request */
export function costUsd(model: string, u: UsageTokens): number {
  const p = priceFor(model);
  return (
    (u.input * p.inPerM +
      u.output * p.outPerM +
      u.cacheRead * p.inPerM * 0.1 +
      u.cacheWrite5m * p.inPerM * 1.25 +
      u.cacheWrite1h * p.inPerM * 2) /
      1e6 +
    u.webSearchRequests * 0.01
  );
}
