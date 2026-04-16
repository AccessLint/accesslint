import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { focusOrder } from "./focus-order";


describe("keyboard-accessible/focus-order", () => {
  it("reports non-interactive element with tabindex=0 and no role", () => {
    const doc = makeDoc('<div tabindex="0">Custom widget</div>');
    const violations = focusOrder.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("div");
  });

  it("passes non-interactive element with tabindex=0 and a role", () => {
    const doc = makeDoc('<div tabindex="0" role="button">Custom button</div>');
    expect(focusOrder.run(doc)).toHaveLength(0);
  });

  it("passes interactive elements with tabindex=0", () => {
    const doc = makeDoc('<button tabindex="0">Button</button>');
    expect(focusOrder.run(doc)).toHaveLength(0);
  });
});
