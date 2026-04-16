import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { scrollableRegion } from "./scrollable-region";


describe("keyboard-accessible/scrollable-region", () => {
  it("passes scrollable region with tabindex", () => {
    const doc = makeDoc(`
      <div style="overflow: auto; height: 100px;" tabindex="0">
        <div style="height: 200px;">Tall content</div>
      </div>
    `);
    // Note: In jsdom, computed styles may not work as expected
    // This test verifies the rule logic
    expect(scrollableRegion.run(doc)).toHaveLength(0);
  });

  it("passes scrollable region with focusable child", () => {
    const doc = makeDoc(`
      <div style="overflow: auto; height: 100px;">
        <button>Focusable child</button>
      </div>
    `);
    expect(scrollableRegion.run(doc)).toHaveLength(0);
  });

  it("passes non-scrollable region", () => {
    const doc = makeDoc('<div style="overflow: hidden;">Content</div>');
    expect(scrollableRegion.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden regions", () => {
    const doc = makeDoc('<div style="overflow: scroll;" aria-hidden="true">Hidden</div>');
    expect(scrollableRegion.run(doc)).toHaveLength(0);
  });
});
