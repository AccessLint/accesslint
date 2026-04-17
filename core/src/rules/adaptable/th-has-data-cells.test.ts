import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { thHasDataCells } from "./th-has-data-cells";

const RULE_ID = "adaptable/th-has-data-cells";

describe(RULE_ID, () => {
  it("passes table with headers and data", () => {
    expectNoViolations(thHasDataCells, `
      <table>
        <tr><th>Name</th><th>Age</th></tr>
        <tr><td>John</td><td>30</td></tr>
      </table>
    `);
  });

  it("reports table with only headers", () => {
    expectViolations(thHasDataCells, `
      <table>
        <tr><th>Col 1</th><th>Col 2</th></tr>
        <tr><th>Row 1</th><th>Row 2</th></tr>
      </table>
    `, {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("skips presentational tables", () => {
    expectNoViolations(thHasDataCells, `
      <table role="presentation">
        <tr><th>Header</th></tr>
      </table>
    `);
  });
});
