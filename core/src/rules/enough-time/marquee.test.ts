import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { marquee } from "./marquee";


describe("enough-time/marquee", () => {
  it("reports marquee element", () => {
    const doc = makeDoc("<html><body><marquee>Scrolling text</marquee></body></html>");
    const violations = marquee.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("enough-time/marquee");
  });

  it("passes without marquee element", () => {
    const doc = makeDoc("<html><body><p>Static text</p></body></html>");
    expect(marquee.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden marquee", () => {
    const doc = makeDoc('<html><body><marquee aria-hidden="true">Hidden</marquee></body></html>');
    expect(marquee.run(doc)).toHaveLength(0);
  });

  it("reports multiple marquee elements", () => {
    const doc = makeDoc("<html><body><marquee>One</marquee><marquee>Two</marquee></body></html>");
    const violations = marquee.run(doc);
    expect(violations).toHaveLength(2);
  });
});
