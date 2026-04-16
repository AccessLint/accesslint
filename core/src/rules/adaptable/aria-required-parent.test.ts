import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaRequiredParent } from "./aria-required-parent";


describe("adaptable/aria-required-parent", () => {
  it("passes listitem in list", () => {
    const doc = makeDoc('<ul><li role="listitem">Item</li></ul>');
    expect(ariaRequiredParent.run(doc)).toHaveLength(0);
  });

  it("reports listitem without list parent", () => {
    const doc = makeDoc('<div><div role="listitem">Orphan</div></div>');
    const violations = ariaRequiredParent.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("list");
  });

  it("passes tab in tablist", () => {
    const doc = makeDoc('<div role="tablist"><button role="tab">Tab</button></div>');
    expect(ariaRequiredParent.run(doc)).toHaveLength(0);
  });

  it("reports tab without tablist parent", () => {
    const doc = makeDoc('<div><button role="tab">Orphan Tab</button></div>');
    const violations = ariaRequiredParent.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes menuitem in menu", () => {
    const doc = makeDoc('<div role="menu"><div role="menuitem">Item</div></div>');
    expect(ariaRequiredParent.run(doc)).toHaveLength(0);
  });

  it("passes option in listbox", () => {
    const doc = makeDoc('<div role="listbox"><div role="option">Option</div></div>');
    expect(ariaRequiredParent.run(doc)).toHaveLength(0);
  });

  it("passes row in table", () => {
    const doc = makeDoc('<div role="table"><div role="row"><div role="cell">Cell</div></div></div>');
    expect(ariaRequiredParent.run(doc)).toHaveLength(0);
  });

  it("finds parent through intermediate elements", () => {
    const doc = makeDoc('<div role="list"><div class="wrapper"><div role="listitem">Item</div></div></div>');
    expect(ariaRequiredParent.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<div><div role="listitem" aria-hidden="true">Hidden</div></div>');
    expect(ariaRequiredParent.run(doc)).toHaveLength(0);
  });

  it("passes cell inside row", () => {
    const doc = makeDoc('<div role="table"><div role="row"><div role="cell">Data</div></div></div>');
    expect(ariaRequiredParent.run(doc)).toHaveLength(0);
  });

  it("reports cell without row parent", () => {
    const doc = makeDoc('<div role="table"><div role="cell">Orphan</div></div>');
    const violations = ariaRequiredParent.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("row");
  });

  it("reports columnheader without row parent", () => {
    const doc = makeDoc('<div role="grid"><div role="columnheader">Header</div></div>');
    const violations = ariaRequiredParent.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("row");
  });

  it("passes gridcell inside row", () => {
    const doc = makeDoc('<div role="grid"><div role="row"><div role="gridcell">Cell</div></div></div>');
    expect(ariaRequiredParent.run(doc)).toHaveLength(0);
  });

  it("reports rowheader without row parent", () => {
    const doc = makeDoc('<div role="table"><div role="rowheader">Header</div></div>');
    const violations = ariaRequiredParent.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("row");
  });
});
