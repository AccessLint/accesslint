import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaRequiredChildren } from "./aria-required-children";


describe("adaptable/aria-required-children", () => {
  it("passes list with listitems", () => {
    const doc = makeDoc('<ul role="list"><li role="listitem">Item</li></ul>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("passes native list elements", () => {
    const doc = makeDoc("<ul><li>Item 1</li><li>Item 2</li></ul>");
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("reports list without listitems", () => {
    const doc = makeDoc('<div role="list"><div>Not a listitem</div></div>');
    const violations = ariaRequiredChildren.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("listitem");
  });

  it("passes tablist with tabs", () => {
    const doc = makeDoc('<div role="tablist"><button role="tab">Tab 1</button></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("reports tablist without tabs", () => {
    const doc = makeDoc('<div role="tablist"><button>Not a tab</button></div>');
    const violations = ariaRequiredChildren.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes menu with menuitems", () => {
    const doc = makeDoc('<div role="menu"><div role="menuitem">Item</div></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("passes grid with rows", () => {
    const doc = makeDoc('<div role="grid"><div role="row"><div role="gridcell">Cell</div></div></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("passes radiogroup with radios", () => {
    const doc = makeDoc('<div role="radiogroup"><div role="radio">Option</div></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("supports aria-owns for children", () => {
    const doc = makeDoc('<div role="list" aria-owns="item1"></div><div id="item1" role="listitem">Item</div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<div role="list" aria-hidden="true"><div>No items</div></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("skips elements with aria-busy=true", () => {
    const doc = makeDoc('<div role="list" aria-busy="true"><div>Loading...</div></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("skips empty reviewEmpty roles (e.g. empty list)", () => {
    const doc = makeDoc('<div role="list"></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("flags non-empty reviewEmpty roles with wrong children", () => {
    const doc = makeDoc('<div role="list"><div>Not a listitem</div></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(1);
  });

  it("flags empty non-reviewEmpty roles (e.g. empty menu)", () => {
    const doc = makeDoc('<div role="menu"></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(1);
  });

  it("skips collapsed combobox", () => {
    const doc = makeDoc('<div role="combobox" aria-expanded="false"></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("skips combobox without aria-expanded", () => {
    const doc = makeDoc('<div role="combobox"></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("skips input with role combobox", () => {
    const doc = makeDoc('<input role="combobox" aria-expanded="true">');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(0);
  });

  it("flags expanded div combobox without required children", () => {
    const doc = makeDoc('<div role="combobox" aria-expanded="true"><span>text</span></div>');
    expect(ariaRequiredChildren.run(doc)).toHaveLength(1);
  });
});
