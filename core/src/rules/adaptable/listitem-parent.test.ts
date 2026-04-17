import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { listitemParent } from "./listitem-parent";

const RULE_ID = "adaptable/listitem-parent";

describe(RULE_ID, () => {
  it("passes li inside ul", () => {
    expectNoViolations(listitemParent, "<html><body><ul><li>Item</li></ul></body></html>");
  });

  it("passes li inside ol", () => {
    expectNoViolations(listitemParent, "<html><body><ol><li>Item</li></ol></body></html>");
  });

  it("passes li inside menu", () => {
    expectNoViolations(listitemParent, "<html><body><menu><li>Item</li></menu></body></html>");
  });

  it("passes li inside role=list", () => {
    expectNoViolations(
      listitemParent,
      '<html><body><div role="list"><li>Item</li></div></body></html>',
    );
  });

  it("reports li inside div (no list role)", () => {
    expectViolations(listitemParent, "<html><body><div><li>Orphan</li></div></body></html>", {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /<li>/,
    });
  });

  it("reports li directly in body", () => {
    expectViolations(listitemParent, "<html><body><li>Orphan</li></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("skips aria-hidden li", () => {
    expectNoViolations(
      listitemParent,
      '<html><body><div><li aria-hidden="true">Hidden</li></div></body></html>',
    );
  });
});
