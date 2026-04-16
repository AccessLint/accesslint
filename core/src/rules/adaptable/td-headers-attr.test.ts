import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { tdHeadersAttr } from "./td-headers-attr";


describe("adaptable/td-headers-attr", () => {
  it("passes valid headers attribute", () => {
    const doc = makeDoc(`
      <table>
        <tr><th id="name">Name</th><th id="age">Age</th></tr>
        <tr><td headers="name">John</td><td headers="age">30</td></tr>
      </table>
    `);
    expect(tdHeadersAttr.run(doc)).toHaveLength(0);
  });

  it("reports invalid headers reference", () => {
    const doc = makeDoc(`
      <table>
        <tr><th id="name">Name</th></tr>
        <tr><td headers="invalid">John</td></tr>
      </table>
    `);
    const violations = tdHeadersAttr.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("invalid");
  });

  it("passes multiple valid headers", () => {
    const doc = makeDoc(`
      <table>
        <tr><th id="name">Name</th><th id="type">Type</th></tr>
        <tr><td headers="name type">John Developer</td></tr>
      </table>
    `);
    expect(tdHeadersAttr.run(doc)).toHaveLength(0);
  });
});
