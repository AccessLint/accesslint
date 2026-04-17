import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaProhibitedAttr } from "./aria-prohibited-attr";

const RULE_ID = "aria/aria-prohibited-attr";

describe(RULE_ID, () => {
  it("reports aria-label on role=none", () => {
    expectViolations(ariaProhibitedAttr, '<img role="none" aria-label="Decorative" src="bg.png">', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /aria-label/,
    });
  });

  it("reports aria-labelledby on role=presentation", () => {
    expectViolations(ariaProhibitedAttr, '<img role="presentation" aria-labelledby="desc" src="bg.png">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports aria-label on role=generic", () => {
    expectViolations(ariaProhibitedAttr, '<div role="generic" aria-label="Container"></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("allows aria-label on span without role (common real-world pattern)", () => {
    // span and i are excluded from no-name-elements to avoid false positives
    expectNoViolations(ariaProhibitedAttr, '<span aria-label="Text">Some text</span>');
  });

  it("reports aria-label on code element", () => {
    expectViolations(ariaProhibitedAttr, '<code aria-label="Code snippet">const x = 1</code>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports aria-label on strong element", () => {
    expectViolations(ariaProhibitedAttr, '<strong aria-label="Important">Warning</strong>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes aria-label on div without role (div can take role)", () => {
    // div without role has implicit generic role, but checking varies
    // This test ensures we don't over-report
    expectNoViolations(ariaProhibitedAttr, '<div aria-label="Container">Content</div>');
  });

  it("passes aria-label on button", () => {
    expectNoViolations(ariaProhibitedAttr, '<button aria-label="Close">X</button>');
  });

  it("passes aria-label on link", () => {
    expectNoViolations(ariaProhibitedAttr, '<a href="/" aria-label="Home">Home</a>');
  });

  it("reports aria-label on em element", () => {
    expectViolations(ariaProhibitedAttr, '<em aria-label="Emphasis">text</em>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports aria-label on mark element", () => {
    expectViolations(ariaProhibitedAttr, '<mark aria-label="Highlighted">text</mark>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(ariaProhibitedAttr, '<span aria-label="Hidden" aria-hidden="true">Text</span>');
  });

  it("allows aria-describedby on paragraph (global attr)", () => {
    expectNoViolations(ariaProhibitedAttr, '<p aria-describedby="note">Text</p>');
  });
});
