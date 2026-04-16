import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaHiddenBody } from "./aria-hidden-body";


describe("aria/aria-hidden-body", () => {
  it("passes when body has no aria-hidden", () => {
    const doc = makeDoc("<html><body><main>Content</main></body></html>");
    expect(ariaHiddenBody.run(doc)).toHaveLength(0);
  });

  it("passes when body has aria-hidden=false", () => {
    const doc = makeDoc('<html><body aria-hidden="false"><main>Content</main></body></html>');
    expect(ariaHiddenBody.run(doc)).toHaveLength(0);
  });

  it("reports aria-hidden=true on body", () => {
    const doc = makeDoc('<html><body aria-hidden="true"><main>Content</main></body></html>');
    const violations = ariaHiddenBody.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("aria/aria-hidden-body");
    expect(violations[0].impact).toBe("critical");
  });
});
