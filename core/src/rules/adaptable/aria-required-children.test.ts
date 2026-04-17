import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaRequiredChildren } from "./aria-required-children";

const RULE_ID = "adaptable/aria-required-children";

describe(RULE_ID, () => {
  it("passes list with listitems", () => {
    expectNoViolations(ariaRequiredChildren, '<ul role="list"><li role="listitem">Item</li></ul>');
  });

  it("passes native list elements", () => {
    expectNoViolations(ariaRequiredChildren, "<ul><li>Item 1</li><li>Item 2</li></ul>");
  });

  it("reports list without listitems", () => {
    expectViolations(ariaRequiredChildren, '<div role="list"><div>Not a listitem</div></div>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /listitem/,
    });
  });

  it("passes tablist with tabs", () => {
    expectNoViolations(
      ariaRequiredChildren,
      '<div role="tablist"><button role="tab">Tab 1</button></div>',
    );
  });

  it("reports tablist without tabs", () => {
    expectViolations(ariaRequiredChildren, '<div role="tablist"><button>Not a tab</button></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes menu with menuitems", () => {
    expectNoViolations(
      ariaRequiredChildren,
      '<div role="menu"><div role="menuitem">Item</div></div>',
    );
  });

  it("passes grid with rows", () => {
    expectNoViolations(
      ariaRequiredChildren,
      '<div role="grid"><div role="row"><div role="gridcell">Cell</div></div></div>',
    );
  });

  it("passes radiogroup with radios", () => {
    expectNoViolations(
      ariaRequiredChildren,
      '<div role="radiogroup"><div role="radio">Option</div></div>',
    );
  });

  it("supports aria-owns for children", () => {
    expectNoViolations(
      ariaRequiredChildren,
      '<div role="list" aria-owns="item1"></div><div id="item1" role="listitem">Item</div>',
    );
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(
      ariaRequiredChildren,
      '<div role="list" aria-hidden="true"><div>No items</div></div>',
    );
  });

  it("skips elements with aria-busy=true", () => {
    expectNoViolations(
      ariaRequiredChildren,
      '<div role="list" aria-busy="true"><div>Loading...</div></div>',
    );
  });

  it("skips empty reviewEmpty roles (e.g. empty list)", () => {
    expectNoViolations(ariaRequiredChildren, '<div role="list"></div>');
  });

  it("flags non-empty reviewEmpty roles with wrong children", () => {
    expectViolations(ariaRequiredChildren, '<div role="list"><div>Not a listitem</div></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("flags empty non-reviewEmpty roles (e.g. empty menu)", () => {
    expectViolations(ariaRequiredChildren, '<div role="menu"></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("skips collapsed combobox", () => {
    expectNoViolations(ariaRequiredChildren, '<div role="combobox" aria-expanded="false"></div>');
  });

  it("skips combobox without aria-expanded", () => {
    expectNoViolations(ariaRequiredChildren, '<div role="combobox"></div>');
  });

  it("skips input with role combobox", () => {
    expectNoViolations(ariaRequiredChildren, '<input role="combobox" aria-expanded="true">');
  });

  it("flags expanded div combobox without required children", () => {
    expectViolations(
      ariaRequiredChildren,
      '<div role="combobox" aria-expanded="true"><span>text</span></div>',
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });
});
