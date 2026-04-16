import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaTreeitemName } from "./aria-treeitem-name";


describe("labels-and-names/aria-treeitem-name", () => {
  it("passes treeitem with text", () => {
    const doc = makeDoc('<div role="treeitem">Documents</div>');
    expect(ariaTreeitemName.run(doc)).toHaveLength(0);
  });

  it("reports treeitem without name", () => {
    const doc = makeDoc('<div role="treeitem"></div>');
    const violations = ariaTreeitemName.run(doc);
    expect(violations).toHaveLength(1);
  });
});
