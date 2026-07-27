/**
 * Contract: `@accesslint/core` and `@accesslint/heal-diff` must agree on what
 * counts as a framework-generated id.
 *
 * The two packages carry duplicate copies of the pattern list (see the
 * comments on each) because neither can depend on the other without dragging a
 * zero-dependency published package into the other's tree. This is the test
 * that makes the duplication safe, and it lives here because
 * `matchers-internal` is the one package that already depends on both.
 *
 * When the lists drift, ids stay baked into the `htmlFingerprint` while core
 * has already dropped them from the selector — the same unchanged element then
 * fingerprints differently on every render, the address tier refuses its own
 * match, and unchanged violations re-alert as new.
 */

import { describe, it, expect } from "vitest";
import { isGeneratedId as coreIsGeneratedId } from "@accesslint/core";
import { isGeneratedId as healIsGeneratedId } from "@accesslint/heal-diff/normalize";

/** One entry per pattern family in the list, plus authored ids that must survive. */
const GENERATED = [
  ":r0:",
  ":r2:",
  ":r1a:", // React base-32 useId counter — the drift that motivated this test
  ":R7:", // SSR form
  "«1»", // MUI/emotion bracket form
  "mui-123",
  "css-1ab2c3",
  "radix-:r5:",
  "headlessui-menu-:r3:",
  "reach-dialog-1",
  "a1b2c3d4", // long hex
  "field-9f3a1c", // prefix + hash suffix
];

const AUTHORED = [
  "submit",
  "email-field",
  "main-nav",
  "user_profile",
  "step1",
  "checkout",
  "newsletter-signup",
];

describe("generated-id contract between core and heal-diff", () => {
  it.each(GENERATED)("both packages treat %s as generated", (id) => {
    expect(coreIsGeneratedId(id)).toBe(true);
    expect(healIsGeneratedId(id)).toBe(true);
  });

  it.each(AUTHORED)("both packages keep the authored id %s", (id) => {
    expect(coreIsGeneratedId(id)).toBe(false);
    expect(healIsGeneratedId(id)).toBe(false);
  });

  it("agrees across a broad generated-shaped sample", () => {
    const sample = [
      ...GENERATED,
      ...AUTHORED,
      ":r:",
      ":rzz:",
      "«»",
      "mui-",
      "muix-1",
      "css-",
      "radix",
      "radixed-thing",
      "headlessui",
      "abc123",
      "a1b2c3d",
      "menu-abcdef",
      "menu-abcde",
      "",
    ];
    const disagreements = sample.filter((id) => coreIsGeneratedId(id) !== healIsGeneratedId(id));
    expect(disagreements).toEqual([]);
  });
});
