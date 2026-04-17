import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { wordSpacing } from "./word-spacing";

const RULE_ID = "distinguishable/word-spacing";

describe(RULE_ID, () => {
  it("passes without inline styles", () => {
    expectNoViolations(wordSpacing, "<html><body><p>Text</p></body></html>");
  });

  it("passes word-spacing at threshold (0.16em)", () => {
    expectNoViolations(
      wordSpacing,
      '<html><body><p style="word-spacing: 0.16em !important">Text</p></body></html>',
    );
  });

  it("reports word-spacing below threshold with !important", () => {
    expectViolations(
      wordSpacing,
      '<html><body><p style="word-spacing: 0.05em !important">Text</p></body></html>',
      {
        count: 1,
        ruleId: RULE_ID,
        messageMatches: /word-spacing.*!important|!important.*word-spacing/,
      },
    );
  });

  it("passes word-spacing without !important", () => {
    expectNoViolations(
      wordSpacing,
      '<html><body><p style="word-spacing: 0.01em">Text</p></body></html>',
    );
  });

  it("reports normal with !important (effectively 0)", () => {
    expectViolations(
      wordSpacing,
      '<html><body><p style="word-spacing: normal !important">Text</p></body></html>',
      { count: 1, ruleId: RULE_ID },
    );
  });
});
