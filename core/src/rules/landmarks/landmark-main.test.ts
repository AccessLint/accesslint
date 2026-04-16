import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { landmarkMain } from "./landmark-main";


describe("landmarks/landmark-main", () => {
  it("reports missing main landmark", () => {
    const doc = makeDoc("<html><body><div>Content</div></body></html>");
    const violations = landmarkMain.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("no main");
  });

  it("passes with main element", () => {
    const doc = makeDoc("<html><body><main>Content</main></body></html>");
    expect(landmarkMain.run(doc)).toHaveLength(0);
  });

  it("passes with role=main", () => {
    const doc = makeDoc('<html><body><div role="main">Content</div></body></html>');
    expect(landmarkMain.run(doc)).toHaveLength(0);
  });

  it("reports multiple main landmarks", () => {
    const doc = makeDoc("<html><body><main>One</main><main>Two</main></body></html>");
    const violations = landmarkMain.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("multiple");
  });
});
