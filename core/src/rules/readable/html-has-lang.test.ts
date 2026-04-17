import { describe, it, expect } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { htmlHasLang } from "./html-has-lang";

const RULE_ID = "readable/html-has-lang";

describe(RULE_ID, () => {
  it("reports missing lang", () => {
    expectViolations(htmlHasLang, "<html><body></body></html>", { count: 1, ruleId: RULE_ID });
  });

  it("returns 'html' as the selector", () => {
    const violations = expectViolations(htmlHasLang, "<html><body></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
    expect(violations[0].selector).toBe("html");
  });

  it("passes with lang", () => {
    expectNoViolations(htmlHasLang, '<html lang="en"><body></body></html>');
  });

  it("reports empty lang", () => {
    expectViolations(htmlHasLang, '<html lang=""><body></body></html>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });
});
