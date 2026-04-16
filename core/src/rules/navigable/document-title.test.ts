import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { documentTitle } from "./document-title";


describe("navigable/document-title", () => {
  it("reports missing title element", () => {
    const doc = makeDoc("<html><head></head><body>Content</body></html>");
    const violations = documentTitle.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("navigable/document-title");
    expect(violations[0].message).toContain("missing");
  });

  it("reports empty title element", () => {
    const doc = makeDoc("<html><head><title></title></head><body>Content</body></html>");
    const violations = documentTitle.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("empty");
  });

  it("reports whitespace-only title element", () => {
    const doc = makeDoc("<html><head><title>   </title></head><body>Content</body></html>");
    const violations = documentTitle.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes with valid title", () => {
    const doc = makeDoc("<html><head><title>My Page Title</title></head><body>Content</body></html>");
    expect(documentTitle.run(doc)).toHaveLength(0);
  });
});
