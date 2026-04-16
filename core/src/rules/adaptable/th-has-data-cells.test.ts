import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { thHasDataCells } from "./th-has-data-cells";


describe("adaptable/th-has-data-cells", () => {
  it("passes table with headers and data", () => {
    const doc = makeDoc(`
      <table>
        <tr><th>Name</th><th>Age</th></tr>
        <tr><td>John</td><td>30</td></tr>
      </table>
    `);
    expect(thHasDataCells.run(doc)).toHaveLength(0);
  });

  it("reports table with only headers", () => {
    const doc = makeDoc(`
      <table>
        <tr><th>Col 1</th><th>Col 2</th></tr>
        <tr><th>Row 1</th><th>Row 2</th></tr>
      </table>
    `);
    const violations = thHasDataCells.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("skips presentational tables", () => {
    const doc = makeDoc(`
      <table role="presentation">
        <tr><th>Header</th></tr>
      </table>
    `);
    expect(thHasDataCells.run(doc)).toHaveLength(0);
  });
});
