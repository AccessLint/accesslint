import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { scopeAttrValid } from "./scope-attr-valid";


describe("adaptable/scope-attr-valid", () => {
  it("passes valid scope values", () => {
    const doc = makeDoc(`
      <table>
        <tr><th scope="col">Name</th><th scope="col">Age</th></tr>
        <tr><th scope="row">John</th><td>30</td></tr>
      </table>
    `);
    expect(scopeAttrValid.run(doc)).toHaveLength(0);
  });

  it("reports invalid scope value", () => {
    const doc = makeDoc(`
      <table>
        <tr><th scope="column">Name</th></tr>
      </table>
    `);
    const violations = scopeAttrValid.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("column");
  });

  it("passes rowgroup and colgroup", () => {
    const doc = makeDoc(`
      <table>
        <tr><th scope="colgroup" colspan="2">Group</th></tr>
        <tr><th scope="rowgroup">Subgroup</th><td>Data</td></tr>
      </table>
    `);
    expect(scopeAttrValid.run(doc)).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const doc = makeDoc(`
      <table>
        <tr><th scope="COL">Name</th></tr>
      </table>
    `);
    expect(scopeAttrValid.run(doc)).toHaveLength(0);
  });
});
