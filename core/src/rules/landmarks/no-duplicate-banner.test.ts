import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { noDuplicateBanner } from "./no-duplicate-banner";


describe("landmarks/no-duplicate-banner", () => {
  it("passes with single header", () => {
    const doc = makeDoc("<html><body><header>Site header</header><main>Content</main></body></html>");
    expect(noDuplicateBanner.run(doc)).toHaveLength(0);
  });

  it("reports duplicate top-level headers", () => {
    const doc = makeDoc("<html><body><header>One</header><header>Two</header></body></html>");
    const violations = noDuplicateBanner.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("ignores headers inside sectioning elements", () => {
    const doc = makeDoc("<html><body><header>Site</header><article><header>Article</header></article></body></html>");
    expect(noDuplicateBanner.run(doc)).toHaveLength(0);
  });
});
