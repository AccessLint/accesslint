import { describe, it } from "vitest";
import { ariaRequiredAttr } from "./aria-required-attr";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "aria/aria-required-attr";

describe(RULE_ID, () => {
  it("passes role=checkbox with aria-checked", () => {
    expectNoViolations(
      ariaRequiredAttr,
      "<html><body><div role='checkbox' aria-checked='false'></div></body></html>",
    );
  });

  it("exempts native <input type=checkbox> (implicit state)", () => {
    expectNoViolations(ariaRequiredAttr, "<html><body><input type='checkbox'></body></html>");
  });

  it("passes non-focusable role=separator (aria-valuenow only required when focusable)", () => {
    expectNoViolations(ariaRequiredAttr, "<html><body><div role='separator'></div></body></html>");
  });

  it("exempts native <hr> with no explicit role", () => {
    expectNoViolations(ariaRequiredAttr, "<html><body><hr></body></html>");
  });

  it("exempts native <h1> (no ARIA role applied)", () => {
    expectNoViolations(ariaRequiredAttr, "<html><body><h1>Title</h1></body></html>");
  });

  it("reports role=checkbox without aria-checked", () => {
    expectViolations(ariaRequiredAttr, "<html><body><div role='checkbox'></div></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports role=slider without aria-valuenow", () => {
    expectViolations(ariaRequiredAttr, "<html><body><div role='slider'></div></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports focusable role=separator without aria-valuenow", () => {
    expectViolations(
      ariaRequiredAttr,
      "<html><body><div role='separator' tabindex='0'></div></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports role=heading without aria-level", () => {
    expectViolations(ariaRequiredAttr, "<html><body><div role='heading'></div></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports role=scrollbar missing both aria-controls and aria-valuenow", () => {
    expectViolations(ariaRequiredAttr, "<html><body><div role='scrollbar'></div></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports role=scrollbar with only aria-valuenow (still missing aria-controls)", () => {
    expectViolations(
      ariaRequiredAttr,
      "<html><body><div role='scrollbar' aria-valuenow='50'></div></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports role=switch without aria-checked", () => {
    expectViolations(ariaRequiredAttr, "<html><body><div role='switch'></div></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports role=spinbutton without aria-valuenow", () => {
    expectViolations(ariaRequiredAttr, "<html><body><div role='spinbutton'></div></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });
});
