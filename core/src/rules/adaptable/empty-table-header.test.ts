import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { emptyTableHeader } from "./empty-table-header";


describe("adaptable/empty-table-header", () => {
  it("passes header with text", () => {
    const doc = makeDoc(`
      <table>
        <tr><th>Name</th><th>Age</th></tr>
      </table>
    `);
    expect(emptyTableHeader.run(doc)).toHaveLength(0);
  });

  it("reports empty header", () => {
    const doc = makeDoc(`
      <table>
        <tr><th></th><th>Name</th></tr>
      </table>
    `);
    const violations = emptyTableHeader.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("adaptable/empty-table-header");
  });

  it("passes header with aria-label", () => {
    const doc = makeDoc(`
      <table>
        <tr><th aria-label="Select all"></th><th>Name</th></tr>
      </table>
    `);
    expect(emptyTableHeader.run(doc)).toHaveLength(0);
  });

  it("reports whitespace-only header", () => {
    const doc = makeDoc(`
      <table>
        <tr><th>   </th><th>Name</th></tr>
      </table>
    `);
    const violations = emptyTableHeader.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("skips presentational tables", () => {
    const doc = makeDoc(`
      <table role="none">
        <tr><th></th></tr>
      </table>
    `);
    expect(emptyTableHeader.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden headers", () => {
    const doc = makeDoc(`
      <table>
        <tr><th aria-hidden="true"></th></tr>
      </table>
    `);
    expect(emptyTableHeader.run(doc)).toHaveLength(0);
  });
});
