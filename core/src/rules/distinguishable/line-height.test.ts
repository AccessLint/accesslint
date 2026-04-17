import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { lineHeight } from "./line-height";

const RULE_ID = "distinguishable/line-height";

describe(RULE_ID, () => {
  it("passes without inline styles", () => {
    expectNoViolations(lineHeight, "<html><body><p>Text</p></body></html>");
  });

  it("passes line-height at threshold (1.5)", () => {
    expectNoViolations(lineHeight, '<html><body><p style="line-height: 1.5 !important">Text</p></body></html>');
  });

  it("reports line-height below threshold with !important", () => {
    expectViolations(
      lineHeight,
      '<html><body><p style="line-height: 1.1 !important">Text</p></body></html>',
      { count: 1, ruleId: RULE_ID, messageMatches: /Line height/ },
    );
  });

  it("reports line-height percentage below threshold", () => {
    expectViolations(
      lineHeight,
      '<html><body><p style="line-height: 110% !important">Text</p></body></html>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes line-height percentage at threshold (150%)", () => {
    expectNoViolations(lineHeight, '<html><body><p style="line-height: 150% !important">Text</p></body></html>');
  });
});
