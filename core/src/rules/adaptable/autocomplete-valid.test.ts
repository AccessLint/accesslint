import { describe, it } from "vitest";
import { autocompleteValid } from "./autocomplete-valid";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "adaptable/autocomplete-valid";

describe(RULE_ID, () => {
  // --- Valid values ---
  it("passes standard autocomplete values", () => {
    for (const value of ["name", "email", "tel", "street-address", "postal-code", "cc-number"]) {
      expectNoViolations(autocompleteValid, `<input type="text" autocomplete="${value}">`);
    }
  });

  it("passes compound value (shipping street-address)", () => {
    expectNoViolations(autocompleteValid, '<input type="text" autocomplete="shipping street-address">');
  });

  it("passes section-* token", () => {
    expectNoViolations(autocompleteValid, '<input type="text" autocomplete="section-blue shipping street-address">');
  });

  it("passes contact type on contact field (home tel)", () => {
    expectNoViolations(autocompleteValid, '<input type="tel" autocomplete="home tel">');
  });

  it("passes webauthn suffix", () => {
    expectNoViolations(autocompleteValid, '<input type="text" autocomplete="username webauthn">');
  });

  it("passes off value", () => {
    expectNoViolations(autocompleteValid, '<input type="text" autocomplete="off">');
  });

  it("passes on value", () => {
    expectNoViolations(autocompleteValid, '<input type="text" autocomplete="on">');
  });

  // --- Invalid values ---
  it("reports unknown autocomplete value", () => {
    expectViolations(autocompleteValid, '<input type="text" autocomplete="nope">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports contact type on non-contact field", () => {
    expectViolations(autocompleteValid, '<input type="text" autocomplete="home name">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports extra tokens", () => {
    expectViolations(autocompleteValid, '<input type="text" autocomplete="name extra">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  // --- Skipped elements ---
  it("skips element without autocomplete attribute", () => {
    expectNoViolations(autocompleteValid, '<input type="text">');
  });

  it("skips empty autocomplete value", () => {
    expectNoViolations(autocompleteValid, '<input type="text" autocomplete="">');
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(autocompleteValid, '<input type="text" autocomplete="nope" aria-hidden="true">');
  });

  it("skips disabled elements", () => {
    expectNoViolations(autocompleteValid, '<input type="text" autocomplete="nope" disabled>');
  });

  it("skips aria-disabled elements", () => {
    expectNoViolations(autocompleteValid, '<input type="text" autocomplete="nope" aria-disabled="true">');
  });

  it("skips computed-hidden elements", () => {
    expectNoViolations(autocompleteValid, '<input type="text" autocomplete="nope" style="display:none">');
  });
});
