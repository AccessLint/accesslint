import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaTooltipName } from "./aria-tooltip-name";

const RULE_ID = "labels-and-names/aria-tooltip-name";

describe(RULE_ID, () => {
  it("passes tooltip with text content", () => {
    expectNoViolations(ariaTooltipName, '<div role="tooltip">Helpful hint</div>');
  });

  it("reports empty tooltip", () => {
    expectViolations(ariaTooltipName, '<div role="tooltip"></div>', { count: 1, ruleId: RULE_ID });
  });
});
