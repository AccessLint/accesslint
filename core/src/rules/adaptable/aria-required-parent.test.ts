import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaRequiredParent } from "./aria-required-parent";

const RULE_ID = "adaptable/aria-required-parent";

describe(RULE_ID, () => {
  it("passes listitem in list", () => {
    expectNoViolations(ariaRequiredParent, '<ul><li role="listitem">Item</li></ul>');
  });

  it("reports listitem without list parent", () => {
    expectViolations(ariaRequiredParent, '<div><div role="listitem">Orphan</div></div>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /list/,
    });
  });

  it("passes tab in tablist", () => {
    expectNoViolations(
      ariaRequiredParent,
      '<div role="tablist"><button role="tab">Tab</button></div>',
    );
  });

  it("reports tab without tablist parent", () => {
    expectViolations(ariaRequiredParent, '<div><button role="tab">Orphan Tab</button></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes menuitem in menu", () => {
    expectNoViolations(
      ariaRequiredParent,
      '<div role="menu"><div role="menuitem">Item</div></div>',
    );
  });

  it("passes option in listbox", () => {
    expectNoViolations(
      ariaRequiredParent,
      '<div role="listbox"><div role="option">Option</div></div>',
    );
  });

  it("passes row in table", () => {
    expectNoViolations(
      ariaRequiredParent,
      '<div role="table"><div role="row"><div role="cell">Cell</div></div></div>',
    );
  });

  it("finds parent through intermediate elements", () => {
    expectNoViolations(
      ariaRequiredParent,
      '<div role="list"><div class="wrapper"><div role="listitem">Item</div></div></div>',
    );
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(
      ariaRequiredParent,
      '<div><div role="listitem" aria-hidden="true">Hidden</div></div>',
    );
  });

  it("passes cell inside row", () => {
    expectNoViolations(
      ariaRequiredParent,
      '<div role="table"><div role="row"><div role="cell">Data</div></div></div>',
    );
  });

  it("reports cell without row parent", () => {
    expectViolations(ariaRequiredParent, '<div role="table"><div role="cell">Orphan</div></div>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /row/,
    });
  });

  it("reports columnheader without row parent", () => {
    expectViolations(
      ariaRequiredParent,
      '<div role="grid"><div role="columnheader">Header</div></div>',
      {
        count: 1,
        ruleId: RULE_ID,
        messageMatches: /row/,
      },
    );
  });

  it("passes gridcell inside row", () => {
    expectNoViolations(
      ariaRequiredParent,
      '<div role="grid"><div role="row"><div role="gridcell">Cell</div></div></div>',
    );
  });

  it("reports rowheader without row parent", () => {
    expectViolations(
      ariaRequiredParent,
      '<div role="table"><div role="rowheader">Header</div></div>',
      {
        count: 1,
        ruleId: RULE_ID,
        messageMatches: /row/,
      },
    );
  });
});
