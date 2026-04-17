import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { letterSpacing } from "./letter-spacing";

const RULE_ID = "distinguishable/letter-spacing";

describe(RULE_ID, () => {
  it("passes without inline styles", () => {
    expectNoViolations(letterSpacing, "<html><body><p>Text</p></body></html>");
  });

  it("passes letter-spacing without !important", () => {
    expectNoViolations(letterSpacing, '<html><body><p style="letter-spacing: 0.05em">Text</p></body></html>');
  });

  it("passes letter-spacing at threshold (0.12em)", () => {
    expectNoViolations(letterSpacing, '<html><body><p style="letter-spacing: 0.12em !important">Text</p></body></html>');
  });

  it("reports letter-spacing below threshold with !important", () => {
    expectViolations(
      letterSpacing,
      '<html><body><p style="letter-spacing: 0.05em !important">Text</p></body></html>',
      { count: 1, ruleId: RULE_ID, messageMatches: /letter-spacing.*!important|!important.*letter-spacing/ },
    );
  });

  it("passes inherit with !important", () => {
    expectNoViolations(letterSpacing, '<html><body><p style="letter-spacing: inherit !important">Text</p></body></html>');
  });

  it("reports normal with !important (effectively 0)", () => {
    expectViolations(
      letterSpacing,
      '<html><body><p style="letter-spacing: normal !important">Text</p></body></html>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(
      letterSpacing,
      '<html><body><p aria-hidden="true" style="letter-spacing: 0.01em !important">Text</p></body></html>',
    );
  });
});
