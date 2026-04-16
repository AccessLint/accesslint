import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { bannerIsTopLevel } from "./banner-is-top-level";


describe("landmarks/banner-is-top-level", () => {
  it("passes for top-level banner", () => {
    const doc = makeDoc('<html><body><div role="banner">Header</div></body></html>');
    expect(bannerIsTopLevel.run(doc)).toHaveLength(0);
  });

  it("reports nested role=banner", () => {
    const doc = makeDoc('<html><body><main><div role="banner">Nested</div></main></body></html>');
    const violations = bannerIsTopLevel.run(doc);
    expect(violations).toHaveLength(1);
  });
});
