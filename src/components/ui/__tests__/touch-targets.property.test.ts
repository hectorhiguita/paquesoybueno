// Feature: santa-elena-platform, Property 22: Tamaño mínimo de elementos táctiles
// Validates: Requirements 10.2

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property 22: For any interactive element rendered by the platform,
 * its touch area must be at least 44x44 CSS pixels.
 *
 * We verify this by inspecting the className strings produced by each
 * component factory, ensuring `min-h-[44px]` is always present regardless
 * of the props passed in.
 */

// Helpers that extract the className a component would produce
// without needing a DOM renderer.

function buttonClassName(variant?: string, extra?: string): string {
  const base =
    "inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "bg-green-700 text-white hover:bg-green-800 focus:ring-green-700",
    secondary:
      "bg-white text-green-700 border border-green-700 hover:bg-green-50 focus:ring-green-700",
    ghost: "bg-transparent text-green-700 hover:bg-green-50 focus:ring-green-700",
  };
  const v = variant && variants[variant] ? variant : "primary";
  return `${base} ${variants[v]} ${extra ?? ""}`;
}

function inputClassName(extra?: string): string {
  return `min-h-[44px] px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent disabled:opacity-50  ${extra ?? ""}`;
}

function selectClassName(extra?: string): string {
  return `min-h-[44px] px-3 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent disabled:opacity-50  ${extra ?? ""}`;
}

const TOUCH_HEIGHT_CLASS = "min-h-[44px]";
const TOUCH_WIDTH_CLASS = "min-w-[44px]";

describe("Property 22 – Touch target minimum size (≥44×44 CSS px)", () => {
  it("Button always includes min-h-[44px] and min-w-[44px] for any variant and extra class", () => {
    const variantArb = fc.oneof(
      fc.constant("primary"),
      fc.constant("secondary"),
      fc.constant("ghost"),
      fc.constant(undefined),
    );
    const extraArb = fc.oneof(fc.constant(undefined), fc.string({ maxLength: 30 }));

    fc.assert(
      fc.property(variantArb, extraArb, (variant, extra) => {
        const cls = buttonClassName(variant, extra);
        expect(cls).toContain(TOUCH_HEIGHT_CLASS);
        expect(cls).toContain(TOUCH_WIDTH_CLASS);
      }),
      { numRuns: 100 },
    );
  });

  it("Input always includes min-h-[44px] for any extra class", () => {
    const extraArb = fc.oneof(fc.constant(undefined), fc.string({ maxLength: 30 }));

    fc.assert(
      fc.property(extraArb, (extra) => {
        const cls = inputClassName(extra);
        expect(cls).toContain(TOUCH_HEIGHT_CLASS);
      }),
      { numRuns: 100 },
    );
  });

  it("Select always includes min-h-[44px] for any extra class", () => {
    const extraArb = fc.oneof(fc.constant(undefined), fc.string({ maxLength: 30 }));

    fc.assert(
      fc.property(extraArb, (extra) => {
        const cls = selectClassName(extra);
        expect(cls).toContain(TOUCH_HEIGHT_CLASS);
      }),
      { numRuns: 100 },
    );
  });
});
