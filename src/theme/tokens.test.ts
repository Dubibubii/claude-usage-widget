// insetOnly — drop-shadow segments paint a halo onto the desktop through the
// transparent window, so skin shadows keep ONLY their `inset …` segments.
// Splits on top-level commas (rgba() commas are inside parens).
// Run: bun test src/theme/tokens.test.ts

import { describe, expect, test } from "bun:test";
import { insetOnly } from "./tokens";

describe("insetOnly — keeps only inset segments of a box-shadow list", () => {
  test("mixed drop + inset → only the inset segment survives", () => {
    expect(
      insetOnly("0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)"),
    ).toBe("inset 0 1px 0 rgba(255,255,255,0.08)");
  });

  test("all-drop shadow → \"none\"", () => {
    expect(insetOnly("0 12px 32px rgba(0,0,0,0.45)")).toBe("none");
    expect(insetOnly("0 1px 2px rgba(0,0,0,0.2), 0 12px 32px rgba(0,0,0,0.45)")).toBe("none");
  });

  test("multiple insets are all preserved, in order, comma-joined", () => {
    expect(
      insetOnly(
        "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 12px rgba(0,0,0,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)",
      ),
    ).toBe("inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)");
  });

  test("rgba() commas never split a segment (depth tracking)", () => {
    // a single inset whose only commas live inside rgba(...)
    expect(insetOnly("inset 0 0 4px rgba(1,2,3,0.5)")).toBe("inset 0 0 4px rgba(1,2,3,0.5)");
  });

  test("pure-inset input passes through trimmed", () => {
    expect(insetOnly("  inset 0 1px 0 rgba(255,255,255,0.07)  ")).toBe(
      "inset 0 1px 0 rgba(255,255,255,0.07)",
    );
  });
});
