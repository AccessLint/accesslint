import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaMeterName } from "./aria-meter-name";

const RULE_ID = "labels-and-names/aria-meter-name";

describe(RULE_ID, () => {
  it("passes meter with aria-label", () => {
    expectNoViolations(
      ariaMeterName,
      '<div role="meter" aria-valuenow="70" aria-label="Battery level"></div>',
    );
  });

  it("reports meter without name", () => {
    expectViolations(ariaMeterName, '<div role="meter" aria-valuenow="70"></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes native meter with aria-label", () => {
    expectNoViolations(ariaMeterName, '<meter value="0.7" aria-label="Progress"></meter>');
  });
});
