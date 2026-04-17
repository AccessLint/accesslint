import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { scopeAttrValid } from "./scope-attr-valid";

const RULE_ID = "adaptable/scope-attr-valid";

describe(RULE_ID, () => {
  it("passes valid scope values", () => {
    expectNoViolations(
      scopeAttrValid,
      `
      <table>
        <tr><th scope="col">Name</th><th scope="col">Age</th></tr>
        <tr><th scope="row">John</th><td>30</td></tr>
      </table>
    `,
    );
  });

  it("reports invalid scope value", () => {
    expectViolations(
      scopeAttrValid,
      `
      <table>
        <tr><th scope="column">Name</th></tr>
      </table>
    `,
      {
        count: 1,
        ruleId: RULE_ID,
        messageMatches: /column/,
      },
    );
  });

  it("passes rowgroup and colgroup", () => {
    expectNoViolations(
      scopeAttrValid,
      `
      <table>
        <tr><th scope="colgroup" colspan="2">Group</th></tr>
        <tr><th scope="rowgroup">Subgroup</th><td>Data</td></tr>
      </table>
    `,
    );
  });

  it("is case-insensitive", () => {
    expectNoViolations(
      scopeAttrValid,
      `
      <table>
        <tr><th scope="COL">Name</th></tr>
      </table>
    `,
    );
  });
});
