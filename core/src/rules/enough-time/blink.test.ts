import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { blink } from "./blink";


describe("enough-time/blink", () => {
  it("reports blink element", () => {
    const doc = makeDoc("<html><body><blink>Attention!</blink></body></html>");
    const violations = blink.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("enough-time/blink");
  });

  it("passes without blink element", () => {
    const doc = makeDoc("<html><body><p>Normal text</p></body></html>");
    expect(blink.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden blink", () => {
    const doc = makeDoc('<html><body><blink aria-hidden="true">Hidden</blink></body></html>');
    expect(blink.run(doc)).toHaveLength(0);
  });
});
