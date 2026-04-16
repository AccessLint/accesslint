import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { pageHasHeadingOne } from "./page-has-heading-one";


describe("navigable/page-has-heading-one", () => {
  it("passes with h1 element", () => {
    const doc = makeDoc("<html><body><h1>Page Title</h1></body></html>");
    expect(pageHasHeadingOne.run(doc)).toHaveLength(0);
  });

  it("passes with role=heading aria-level=1", () => {
    const doc = makeDoc('<html><body><div role="heading" aria-level="1">Page Title</div></body></html>');
    expect(pageHasHeadingOne.run(doc)).toHaveLength(0);
  });

  it("reports missing h1", () => {
    const doc = makeDoc("<html><body><h2>Section</h2><p>Content</p></body></html>");
    const violations = pageHasHeadingOne.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("navigable/page-has-heading-one");
  });

  it("reports empty h1", () => {
    const doc = makeDoc("<html><body><h1></h1></body></html>");
    const violations = pageHasHeadingOne.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes with h1 that has aria-label", () => {
    const doc = makeDoc('<html><body><h1 aria-label="Page Title"></h1></body></html>');
    expect(pageHasHeadingOne.run(doc)).toHaveLength(0);
  });
});
