import { useEffect, useState } from "react";
import { darkGlass, lightGlass, type Tokens } from "./tokens";
import type { SkinId } from "../state/types";
import type { PaidModule } from "./paidContent";

/** OS appearance, live (covers OS-scheduled night switching).
 * Fallback when no OS signal: light 07:00–19:00 local time. */
function useOsMode(): "light" | "dark" {
  const mq = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  const timeFallback = () => {
    const h = new Date().getHours();
    return h >= 7 && h < 19 ? "light" : "dark";
  };

  const [mode, setMode] = useState<"light" | "dark">(() =>
    mq ? (mq.matches ? "dark" : "light") : timeFallback(),
  );

  useEffect(() => {
    if (mq) {
      const onChange = (e: MediaQueryListEvent) => setMode(e.matches ? "dark" : "light");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    const t = setInterval(() => setMode(timeFallback()), 60_000);
    return () => clearInterval(t);
  }, []);

  return mode;
}

/** Skin precedence (spec §6): a non-Glass skin overrides the auto light/dark
 * pair entirely; switching back to Glass resumes auto theming. Paid skins
 * come from the pack — until it's loaded (or in builds without it) we fall
 * back to auto Glass. */
export function useTheme(
  skin: SkinId,
  pack: PaidModule | null,
): { t: Tokens; mode: "light" | "dark" } {
  const mode = useOsMode();
  if (skin !== "glass") {
    const t = pack?.PAID_SKINS[skin];
    if (t) return { t, mode: t.lightSurface ? "light" : "dark" };
  }
  return { t: mode === "dark" ? darkGlass : lightGlass, mode };
}
