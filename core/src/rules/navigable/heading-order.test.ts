import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { headingOrder } from "./heading-order";


describe("navigable/heading-order", () => {
  it("passes sequential headings", () => {
    const doc = makeDoc("<html><body><h1>A</h1><h2>B</h2><h3>C</h3></body></html>");
    expect(headingOrder.run(doc)).toHaveLength(0);
  });

  it("reports skipped heading level", () => {
    const doc = makeDoc("<html><body><h1>A</h1><h3>C</h3></body></html>");
    const v = headingOrder.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].message).toContain("3");
  });

  it("allows same level headings", () => {
    const doc = makeDoc("<html><body><h2>A</h2><h2>B</h2></body></html>");
    expect(headingOrder.run(doc)).toHaveLength(0);
  });

  it("allows going back to lower level", () => {
    const doc = makeDoc("<html><body><h1>A</h1><h2>B</h2><h1>C</h1></body></html>");
    expect(headingOrder.run(doc)).toHaveLength(0);
  });
});
