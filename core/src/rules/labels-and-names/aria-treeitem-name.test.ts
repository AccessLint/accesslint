import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaTreeitemName } from "./aria-treeitem-name";

const RULE_ID = "labels-and-names/aria-treeitem-name";

describe(RULE_ID, () => {
  it("passes treeitem with text", () => {
    expectNoViolations(ariaTreeitemName, '<div role="treeitem">Documents</div>');
  });

  it("reports treeitem without name", () => {
    expectViolations(ariaTreeitemName, '<div role="treeitem"></div>', { count: 1, ruleId: RULE_ID });
  });
});
