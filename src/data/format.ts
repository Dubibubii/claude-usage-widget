// Countdown / date formatting per spec copy:
//   "resets in 1h 48m" · "resets Thu · 2d 14h" · "restarts Jul 3" · "resets Thu 9:00am"

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function fmtDuration(ms: number): string {
  if (ms <= 0) return "now";
  const mins = Math.floor(ms / 60_000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function sessionResetMeta(resetsAt: string, now: Date): string {
  return `resets in ${fmtDuration(new Date(resetsAt).getTime() - now.getTime())}`;
}

export function weeklyResetMeta(resetsAt: string, now: Date): string {
  const d = new Date(resetsAt);
  return `resets ${DOW[d.getDay()]} · ${fmtDuration(d.getTime() - now.getTime())}`;
}

export function weeklyResetTooltip(resetsAt: string): string {
  const d = new Date(resetsAt);
  const h24 = d.getHours();
  const ampm = h24 >= 12 ? "pm" : "am";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `resets ${DOW[d.getDay()]} ${h}:${mm}${ampm}`;
}

export function sdkRestartMeta(restartsOn: string): string {
  const d = new Date(restartsOn);
  return `restarts ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Show the WINDOW, not just the restart: a wrong cycle start (e.g. a plan
 * upgraded mid-month) must be visible at a glance, not read as real usage. */
export function sdkCycleMeta(sinceOn: string, restartsOn: string): string {
  const s = new Date(sinceOn);
  const r = new Date(restartsOn);
  return `since ${MONTHS[s.getMonth()]} ${s.getDate()} · restarts ${MONTHS[r.getMonth()]} ${r.getDate()}`;
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function sinceMeta(iso: string): string {
  const d = new Date(iso);
  return `since ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtTokens(total: number): string {
  if (total >= 1e9) return `${(total / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (total >= 1e6) return `${(total / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (total >= 1e3) return `${(total / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return `${total}`;
}

export function fmtUsd(v: number): string {
  return Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2).replace(/0$/, "")}`;
}

export function minutesAgo(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000));
}

/** Compact sync-age label: "47m ago" / "3h ago" / "2d ago". */
export function agoLabel(iso: string, now: Date): string {
  const m = minutesAgo(iso, now);
  if (m < 60) return `${m}m ago`;
  if (m < 48 * 60) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}
