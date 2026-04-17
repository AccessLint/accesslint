import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaProgressbarName } from "./aria-progressbar-name";

const RULE_ID = "labels-and-names/aria-progressbar-name";

describe(RULE_ID, () => {
  it("passes progressbar with aria-label", () => {
    expectNoViolations(
      ariaProgressbarName,
      '<div role="progressbar" aria-valuenow="50" aria-label="Upload progress"></div>',
    );
  });

  it("reports progressbar without name", () => {
    expectViolations(ariaProgressbarName, '<div role="progressbar" aria-valuenow="50"></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });
});
