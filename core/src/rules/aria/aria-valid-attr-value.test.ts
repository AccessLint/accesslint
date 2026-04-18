import { describe, it } from "vitest";
import { ariaValidAttrValue } from "./aria-valid-attr-value";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "aria/aria-valid-attr-value";

describe(RULE_ID, () => {
  it("passes valid boolean value", () => {
    expectNoViolations(
      ariaValidAttrValue,
      "<html><body><div aria-hidden='true'>x</div></body></html>",
    );
  });

  it("passes tristate value 'mixed' on aria-checked", () => {
    expectNoViolations(
      ariaValidAttrValue,
      "<html><body><div role='checkbox' aria-checked='mixed'></div></body></html>",
    );
  });

  it("passes valid token on aria-live", () => {
    expectNoViolations(
      ariaValidAttrValue,
      "<html><body><div aria-live='polite'></div></body></html>",
    );
  });

  it("passes aria-labelledby pointing at an existing id", () => {
    expectNoViolations(
      ariaValidAttrValue,
      "<html><body><span id='x'>x</span><div aria-labelledby='x'></div></body></html>",
    );
  });

  it("passes numeric aria-valuenow", () => {
    expectNoViolations(
      ariaValidAttrValue,
      "<html><body><div role='slider' aria-valuenow='50' aria-valuemin='0' aria-valuemax='100'></div></body></html>",
    );
  });

  // IDREF resolution: ACT rule 6a7281 is spec-ambiguous about whether the
  // referenced id must exist. axe-core takes the same position we do —
  // syntactically-valid IDREF is sufficient. The missing-target case is
  // instead surfaced by the element-specific name rules (button-name,
  // summary-name, etc.), which do check resolution when computing the
  // accessible name.
  it("passes aria-labelledby pointing at a missing id (syntactic-only validation)", () => {
    expectNoViolations(
      ariaValidAttrValue,
      "<html><body><div aria-labelledby='ghost'></div></body></html>",
    );
  });

  it("reports invalid boolean value 'yes' on aria-hidden", () => {
    expectViolations(
      ariaValidAttrValue,
      "<html><body><div aria-hidden='yes'>x</div></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports invalid tristate value on aria-checked", () => {
    expectViolations(
      ariaValidAttrValue,
      "<html><body><div role='checkbox' aria-checked='foo'></div></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports unrecognized token on aria-live", () => {
    expectViolations(
      ariaValidAttrValue,
      "<html><body><div aria-live='invalid'></div></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports non-numeric aria-valuenow", () => {
    expectViolations(
      ariaValidAttrValue,
      "<html><body><div role='slider' aria-valuenow='abc' aria-valuemin='0' aria-valuemax='100'></div></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
  });
});
