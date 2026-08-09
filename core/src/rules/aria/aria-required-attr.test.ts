import { describe, it, expect } from "vitest";
import { ariaRequiredAttr } from "./aria-required-attr";
import { expectViolations, expectNoViolations, makeDoc } from "../../test-helpers";

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

  it("exempts checked native <input type=checkbox role=switch>", () => {
    expectNoViolations(
      ariaRequiredAttr,
      "<html><body><input type='checkbox' role='switch' checked></body></html>",
    );
  });

  it("exempts unchecked native <input type=checkbox role=switch>", () => {
    expectNoViolations(
      ariaRequiredAttr,
      "<html><body><input type='checkbox' role='switch'></body></html>",
    );
  });

  it("exempts native switch whose checked state was set via the IDL property", () => {
    const doc = makeDoc("<html><body><input type='checkbox' role='switch'></body></html>");
    const input = doc.querySelector("input") as HTMLInputElement;
    input.checked = true;
    expect(ariaRequiredAttr.run(doc)).toHaveLength(0);
  });

  it("exempts native <input type=radio role=menuitemradio>", () => {
    expectNoViolations(
      ariaRequiredAttr,
      "<html><body><input type='radio' role='menuitemradio'></body></html>",
    );
  });

  it("exempts native <input type=range role=slider>", () => {
    expectNoViolations(
      ariaRequiredAttr,
      "<html><body><input type='range' role='slider'></body></html>",
    );
  });

  it("exempts native <meter role=meter>", () => {
    expectNoViolations(
      ariaRequiredAttr,
      "<html><body><meter role='meter' value='0.5'></meter></body></html>",
    );
  });

  it("exempts native <h2 role=heading> (implicit aria-level)", () => {
    expectNoViolations(ariaRequiredAttr, "<html><body><h2 role='heading'>Title</h2></body></html>");
  });

  it("reports <div role=switch> without aria-checked (no native state)", () => {
    expectViolations(ariaRequiredAttr, "<html><body><div role='switch'></div></body></html>", {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /aria-checked/,
    });
  });

  it("reports <span role=switch tabindex=0> without aria-checked", () => {
    expectViolations(
      ariaRequiredAttr,
      "<html><body><span role='switch' tabindex='0'>Off</span></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports <input type=text role=switch> (text input has no checked state)", () => {
    expectViolations(
      ariaRequiredAttr,
      "<html><body><input type='text' role='switch'></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
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

  it("reports role=spinbutton without aria-valuenow", () => {
    expectViolations(ariaRequiredAttr, "<html><body><div role='spinbutton'></div></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });
});
