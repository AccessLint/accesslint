import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { listitemParent } from "./listitem-parent";


describe("adaptable/listitem-parent", () => {
  it("passes li inside ul", () => {
    const doc = makeDoc("<html><body><ul><li>Item</li></ul></body></html>");
    expect(listitemParent.run(doc)).toHaveLength(0);
  });

  it("passes li inside ol", () => {
    const doc = makeDoc("<html><body><ol><li>Item</li></ol></body></html>");
    expect(listitemParent.run(doc)).toHaveLength(0);
  });

  it("passes li inside menu", () => {
    const doc = makeDoc("<html><body><menu><li>Item</li></menu></body></html>");
    expect(listitemParent.run(doc)).toHaveLength(0);
  });

  it("passes li inside role=list", () => {
    const doc = makeDoc('<html><body><div role="list"><li>Item</li></div></body></html>');
    expect(listitemParent.run(doc)).toHaveLength(0);
  });

  it("reports li inside div (no list role)", () => {
    const doc = makeDoc("<html><body><div><li>Orphan</li></div></body></html>");
    const violations = listitemParent.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("adaptable/listitem-parent");
    expect(violations[0].message).toContain("<li>");
  });

  it("reports li directly in body", () => {
    const doc = makeDoc("<html><body><li>Orphan</li></body></html>");
    const violations = listitemParent.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("skips aria-hidden li", () => {
    const doc = makeDoc('<html><body><div><li aria-hidden="true">Hidden</li></div></body></html>');
    expect(listitemParent.run(doc)).toHaveLength(0);
  });
});
