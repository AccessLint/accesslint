import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaTooltipName } from "./aria-tooltip-name";


describe("labels-and-names/aria-tooltip-name", () => {
  it("passes tooltip with text content", () => {
    const doc = makeDoc('<div role="tooltip">Helpful hint</div>');
    expect(ariaTooltipName.run(doc)).toHaveLength(0);
  });

  it("reports empty tooltip", () => {
    const doc = makeDoc('<div role="tooltip"></div>');
    const violations = ariaTooltipName.run(doc);
    expect(violations).toHaveLength(1);
  });
});
