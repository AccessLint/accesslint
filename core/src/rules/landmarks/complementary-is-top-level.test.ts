import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { complementaryIsTopLevel } from "./complementary-is-top-level";


describe("landmarks/complementary-is-top-level", () => {
  it("passes for top-level aside", () => {
    const doc = makeDoc("<html><body><aside>Sidebar</aside></body></html>");
    expect(complementaryIsTopLevel.run(doc)).toHaveLength(0);
  });

  it("passes for aside inside main", () => {
    const doc = makeDoc("<html><body><main><aside>Related</aside></main></body></html>");
    expect(complementaryIsTopLevel.run(doc)).toHaveLength(0);
  });

  it("passes for aside inside bare section (no landmark role)", () => {
    const doc = makeDoc('<html><body><section><aside>Sidebar</aside></section></body></html>');
    expect(complementaryIsTopLevel.run(doc)).toHaveLength(0);
  });

  it("reports aside nested in article", () => {
    const doc = makeDoc("<html><body><article><aside>Nested</aside></article></body></html>");
    const violations = complementaryIsTopLevel.run(doc);
    expect(violations).toHaveLength(1);
  });
});
