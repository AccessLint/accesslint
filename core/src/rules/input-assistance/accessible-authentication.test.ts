import { describe, it, expect } from "vitest";
import { accessibleAuthentication } from "./accessible-authentication";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "input-assistance/accessible-authentication";

describe(RULE_ID, () => {
  // --- Passing cases ---
  it("passes password field with autocomplete=current-password", () => {
    expectNoViolations(
      accessibleAuthentication,
      '<input type="password" autocomplete="current-password">',
    );
  });

  it("passes password field with autocomplete=new-password", () => {
    expectNoViolations(
      accessibleAuthentication,
      '<input type="password" autocomplete="new-password">',
    );
  });

  it("passes password field with no autocomplete attribute", () => {
    expectNoViolations(accessibleAuthentication, '<input type="password">');
  });

  it("passes password field with empty autocomplete", () => {
    expectNoViolations(accessibleAuthentication, '<input type="password" autocomplete="">');
  });

  it("passes non-password input with autocomplete=off", () => {
    expectNoViolations(accessibleAuthentication, '<input type="text" autocomplete="off">');
  });

  it("passes password field with benign onpaste", () => {
    expectNoViolations(accessibleAuthentication, '<input type="password" onpaste="handlePaste()">');
  });

  // --- Violations ---
  it("reports password field with autocomplete=off", () => {
    const v = expectViolations(
      accessibleAuthentication,
      '<input type="password" autocomplete="off">',
      {
        count: 1,
        ruleId: RULE_ID,
        impact: "critical",
        messageMatches: /autocomplete/,
      },
    );
    expect(v[0].fix).toEqual({
      type: "set-attribute",
      attribute: "autocomplete",
      value: "current-password",
    });
  });

  it("reports password field with onpaste=return false", () => {
    const v = expectViolations(
      accessibleAuthentication,
      '<input type="password" onpaste="return false">',
      { count: 1, ruleId: RULE_ID, messageMatches: /pasting/ },
    );
    expect(v[0].fix).toEqual({
      type: "remove-attribute",
      attribute: "onpaste",
    });
  });

  it("reports password field with onpaste using preventDefault", () => {
    expectViolations(
      accessibleAuthentication,
      '<input type="password" onpaste="event.preventDefault()">',
      { count: 1, ruleId: RULE_ID, messageMatches: /pasting/ },
    );
  });

  it("reports only autocomplete=off when both violations present", () => {
    // autocomplete=off triggers first, and we continue past it
    expectViolations(
      accessibleAuthentication,
      '<input type="password" autocomplete="off" onpaste="return false">',
      { count: 1, ruleId: RULE_ID, messageMatches: /autocomplete/ },
    );
  });

  it("reports multiple password fields independently", () => {
    expectViolations(
      accessibleAuthentication,
      `
      <input type="password" autocomplete="off">
      <input type="password" onpaste="return false">
    `,
      { count: 2, ruleId: RULE_ID },
    );
  });

  // --- Skipped elements ---
  it("skips aria-hidden password fields", () => {
    expectNoViolations(
      accessibleAuthentication,
      '<input type="password" autocomplete="off" aria-hidden="true">',
    );
  });

  it("skips disabled password fields", () => {
    expectNoViolations(
      accessibleAuthentication,
      '<input type="password" autocomplete="off" disabled>',
    );
  });

  it("skips aria-disabled password fields", () => {
    expectNoViolations(
      accessibleAuthentication,
      '<input type="password" autocomplete="off" aria-disabled="true">',
    );
  });

  it("skips computed-hidden password fields", () => {
    expectNoViolations(
      accessibleAuthentication,
      '<input type="password" autocomplete="off" style="display:none">',
    );
  });
});
