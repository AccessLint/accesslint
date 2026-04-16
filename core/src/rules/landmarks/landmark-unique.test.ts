import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { landmarkUnique } from "./landmark-unique";


describe("landmarks/landmark-unique", () => {
  it("passes with uniquely labeled navs", () => {
    const doc = makeDoc(`
      <html><body>
        <nav aria-label="Main">Links</nav>
        <nav aria-label="Footer">More links</nav>
      </body></html>
    `);
    expect(landmarkUnique.run(doc)).toHaveLength(0);
  });

  it("reports duplicate nav labels", () => {
    const doc = makeDoc(`
      <html><body>
        <nav aria-label="Navigation">Links</nav>
        <nav aria-label="Navigation">More links</nav>
      </body></html>
    `);
    const violations = landmarkUnique.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports navs with same text content", () => {
    // Navs with same text content are considered duplicates
    const doc = makeDoc(`
      <html><body>
        <nav>Links</nav>
        <nav>Links</nav>
      </body></html>
    `);
    const violations = landmarkUnique.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes with single nav", () => {
    const doc = makeDoc("<html><body><nav>Links</nav></body></html>");
    expect(landmarkUnique.run(doc)).toHaveLength(0);
  });
});
