import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { letterSpacing } from "./letter-spacing";

describe("distinguishable/letter-spacing", () => {
  it("passes without inline styles", () => {
    const doc = makeDoc("<html><body><p>Text</p></body></html>");
    expect(letterSpacing.run(doc)).toHaveLength(0);
  });

  it("passes letter-spacing without !important", () => {
    const doc = makeDoc('<html><body><p style="letter-spacing: 0.05em">Text</p></body></html>');
    expect(letterSpacing.run(doc)).toHaveLength(0);
  });

  it("passes letter-spacing at threshold (0.12em)", () => {
    const doc = makeDoc('<html><body><p style="letter-spacing: 0.12em !important">Text</p></body></html>');
    expect(letterSpacing.run(doc)).toHaveLength(0);
  });

  it("reports letter-spacing below threshold with !important", () => {
    const doc = makeDoc('<html><body><p style="letter-spacing: 0.05em !important">Text</p></body></html>');
    const violations = letterSpacing.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("distinguishable/letter-spacing");
    expect(violations[0].message).toContain("letter-spacing");
    expect(violations[0].message).toContain("!important");
  });

  it("passes inherit with !important", () => {
    const doc = makeDoc('<html><body><p style="letter-spacing: inherit !important">Text</p></body></html>');
    expect(letterSpacing.run(doc)).toHaveLength(0);
  });

  it("reports normal with !important (effectively 0)", () => {
    const doc = makeDoc('<html><body><p style="letter-spacing: normal !important">Text</p></body></html>');
    const violations = letterSpacing.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<html><body><p aria-hidden="true" style="letter-spacing: 0.01em !important">Text</p></body></html>');
    expect(letterSpacing.run(doc)).toHaveLength(0);
  });
});
