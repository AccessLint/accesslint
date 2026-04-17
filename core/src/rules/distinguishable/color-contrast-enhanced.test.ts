import { describe, it, afterEach } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { colorContrastEnhanced } from "./color-contrast-enhanced";
import { clearColorCaches } from "../utils/color";

const RULE_ID = "distinguishable/color-contrast-enhanced";

describe(RULE_ID, () => {
  afterEach(() => {
    clearColorCaches();
  });

  it("fails: text with contrast below AAA threshold (7:1 for normal text)", () => {
    // rgb(100,100,100) on white ≈ 5.32:1 — passes AA (4.5:1) but fails AAA (7:1)
    expectViolations(
      colorContrastEnhanced,
      '<body><p style="color: rgb(100, 100, 100); background-color: rgb(255, 255, 255);">Low enhanced contrast</p></body>',
      { count: 1, ruleId: RULE_ID, messageMatches: /enhanced/ },
    );
  });

  it("passes: black text on white background (21:1 meets AAA)", () => {
    expectNoViolations(
      colorContrastEnhanced,
      '<body><p style="color: rgb(0, 0, 0); background-color: rgb(255, 255, 255);">High contrast</p></body>',
    );
  });

  it("passes: large text with 4.5:1 AAA threshold", () => {
    // Large text (>=24px) requires 4.5:1 at AAA
    // rgb(100,100,100) on white ≈ 5.32:1 — passes 4.5:1 for large text at AAA
    expectNoViolations(
      colorContrastEnhanced,
      '<body><p style="color: rgb(100, 100, 100); background-color: rgb(255, 255, 255); font-size: 24px;">Large text</p></body>',
    );
  });

  it("skips: hidden elements", () => {
    expectNoViolations(
      colorContrastEnhanced,
      '<body><p style="color: rgb(200, 200, 200); background-color: rgb(200, 200, 200); display: none;">Hidden</p></body>',
    );
  });
});
