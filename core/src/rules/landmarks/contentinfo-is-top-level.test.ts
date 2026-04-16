import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { contentinfoIsTopLevel } from "./contentinfo-is-top-level";


describe("landmarks/contentinfo-is-top-level", () => {
  it("passes for top-level contentinfo", () => {
    const doc = makeDoc('<html><body><div role="contentinfo">Footer</div></body></html>');
    expect(contentinfoIsTopLevel.run(doc)).toHaveLength(0);
  });

  it("reports nested role=contentinfo", () => {
    const doc = makeDoc('<html><body><article><div role="contentinfo">Nested</div></article></body></html>');
    const violations = contentinfoIsTopLevel.run(doc);
    expect(violations).toHaveLength(1);
  });
});
