import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { tdHeadersAttr } from "./td-headers-attr";

const RULE_ID = "adaptable/td-headers-attr";

describe(RULE_ID, () => {
  it("passes valid headers attribute", () => {
    expectNoViolations(tdHeadersAttr, `
      <table>
        <tr><th id="name">Name</th><th id="age">Age</th></tr>
        <tr><td headers="name">John</td><td headers="age">30</td></tr>
      </table>
    `);
  });

  it("reports invalid headers reference", () => {
    expectViolations(tdHeadersAttr, `
      <table>
        <tr><th id="name">Name</th></tr>
        <tr><td headers="invalid">John</td></tr>
      </table>
    `, {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /invalid/,
    });
  });

  it("passes multiple valid headers", () => {
    expectNoViolations(tdHeadersAttr, `
      <table>
        <tr><th id="name">Name</th><th id="type">Type</th></tr>
        <tr><td headers="name type">John Developer</td></tr>
      </table>
    `);
  });
});
