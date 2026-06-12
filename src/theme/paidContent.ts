// Loader for the paid theme pack (open-core boundary).
//
// The public repository does NOT contain src/paid/ — it ships with the free
// Glass theme + Ring style only, plus storefront previews. The paid pack
// (5 skins + 6 collapsed styles) lives in a private repository and is bundled
// into official releases / delivered to license holders. import.meta.glob
// resolves statically: when src/paid/ is present it's code-split into the
// bundle; when absent everything gracefully falls back (Glass + Ring).

import { useEffect, useState, type ReactNode } from "react";
import type { Tokens } from "./tokens";
import type { SkinId, UsageSnapshot, WidgetStyle } from "../state/types";
import type { MeterReading } from "../state/store";

export interface PaidStyleArgs {
  shown: MeterReading[];
  meter: MeterReading | null; // primary
  multi: boolean;
  t: Tokens;
  usage: UsageSnapshot;
  numeralColor: string;
  now: Date;
}

export interface PaidModule {
  PAID_SKINS: Partial<Record<SkinId, Tokens>>;
  renderPaidStyle: (style: WidgetStyle, args: PaidStyleArgs) => ReactNode | null;
}

const mods = import.meta.glob<PaidModule>("../paid/index.ts");

let cached: PaidModule | null = null;
let pending: Promise<PaidModule | null> | null = null;

export function loadPaidPack(): Promise<PaidModule | null> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    const loader = mods["../paid/index.ts"];
    pending = loader
      ? loader().then((m) => (cached = m))
      : Promise.resolve(null);
  }
  return pending;
}

/** Loads the pack once customization is active; null until then (or when the
 * pack isn't present in this build). */
export function usePaidPack(active: boolean): PaidModule | null {
  const [pack, setPack] = useState<PaidModule | null>(cached);
  useEffect(() => {
    if (!active || pack) return;
    let cancelled = false;
    loadPaidPack().then((p) => {
      if (!cancelled) setPack(p);
    });
    return () => {
      cancelled = true;
    };
  }, [active, pack]);
  return pack;
}
