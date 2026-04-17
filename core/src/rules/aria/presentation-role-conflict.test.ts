import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { presentationRoleConflict } from "./presentation-role-conflict";

const RULE_ID = "aria/presentation-role-conflict";

describe(RULE_ID, () => {
  it("passes role=presentation on non-focusable element", () => {
    expectNoViolations(presentationRoleConflict, '<img role="presentation" src="spacer.gif">');
  });

  it("passes role=none on non-focusable element", () => {
    expectNoViolations(presentationRoleConflict, '<div role="none">Decorative</div>');
  });

  it("reports focusable button with role=presentation", () => {
    expectViolations(presentationRoleConflict, '<button role="presentation">Click</button>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /focusable/,
    });
  });

  it("reports link with role=none", () => {
    expectViolations(presentationRoleConflict, '<a href="/" role="none">Link</a>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports element with tabindex and role=presentation", () => {
    expectViolations(presentationRoleConflict, '<div role="presentation" tabindex="0">Focusable</div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports element with aria-label and role=none", () => {
    expectViolations(presentationRoleConflict, '<div role="none" aria-label="Named">Content</div>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /accessible name/,
    });
  });

  it("reports element with aria-labelledby and role=presentation", () => {
    expectViolations(presentationRoleConflict, '<span id="lbl">Label</span><div role="presentation" aria-labelledby="lbl">Content</div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports element with aria-describedby and role=none", () => {
    expectViolations(presentationRoleConflict, '<div role="none" aria-describedby="desc">Content</div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports element with aria-controls and role=presentation", () => {
    expectViolations(presentationRoleConflict, '<div role="presentation" aria-controls="panel">Content</div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes disabled button with role=presentation", () => {
    expectNoViolations(presentationRoleConflict, '<button role="presentation" disabled>Disabled</button>');
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(presentationRoleConflict, '<button role="presentation" aria-hidden="true">Hidden</button>');
  });

  it("passes tabindex=-1 (not in tab order)", () => {
    expectNoViolations(presentationRoleConflict, '<div role="none" tabindex="-1">Not in tab order</div>');
  });
});
