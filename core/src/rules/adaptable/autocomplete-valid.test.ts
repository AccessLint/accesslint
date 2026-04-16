import { describe, it, expect } from "vitest";
import { autocompleteValid } from "./autocomplete-valid";
import { makeDoc } from "../../test-helpers";

describe("adaptable/autocomplete-valid", () => {
  // --- Valid values ---
  it("passes standard autocomplete values", () => {
    for (const value of ["name", "email", "tel", "street-address", "postal-code", "cc-number"]) {
      const doc = makeDoc(`<input type="text" autocomplete="${value}">`);
      expect(autocompleteValid.run(doc), `expected "${value}" to pass`).toHaveLength(0);
    }
  });

  it("passes compound value (shipping street-address)", () => {
    const doc = makeDoc('<input type="text" autocomplete="shipping street-address">');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });

  it("passes section-* token", () => {
    const doc = makeDoc('<input type="text" autocomplete="section-blue shipping street-address">');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });

  it("passes contact type on contact field (home tel)", () => {
    const doc = makeDoc('<input type="tel" autocomplete="home tel">');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });

  it("passes webauthn suffix", () => {
    const doc = makeDoc('<input type="text" autocomplete="username webauthn">');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });

  it("passes off value", () => {
    const doc = makeDoc('<input type="text" autocomplete="off">');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });

  it("passes on value", () => {
    const doc = makeDoc('<input type="text" autocomplete="on">');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });

  // --- Invalid values ---
  it("reports unknown autocomplete value", () => {
    const doc = makeDoc('<input type="text" autocomplete="nope">');
    const v = autocompleteValid.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe("adaptable/autocomplete-valid");
  });

  it("reports contact type on non-contact field", () => {
    const doc = makeDoc('<input type="text" autocomplete="home name">');
    const v = autocompleteValid.run(doc);
    expect(v).toHaveLength(1);
  });

  it("reports extra tokens", () => {
    const doc = makeDoc('<input type="text" autocomplete="name extra">');
    const v = autocompleteValid.run(doc);
    expect(v).toHaveLength(1);
  });

  // --- Skipped elements ---
  it("skips element without autocomplete attribute", () => {
    const doc = makeDoc('<input type="text">');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });

  it("skips empty autocomplete value", () => {
    const doc = makeDoc('<input type="text" autocomplete="">');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<input type="text" autocomplete="nope" aria-hidden="true">');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });

  it("skips disabled elements", () => {
    const doc = makeDoc('<input type="text" autocomplete="nope" disabled>');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });

  it("skips aria-disabled elements", () => {
    const doc = makeDoc('<input type="text" autocomplete="nope" aria-disabled="true">');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });

  it("skips computed-hidden elements", () => {
    const doc = makeDoc('<input type="text" autocomplete="nope" style="display:none">');
    expect(autocompleteValid.run(doc)).toHaveLength(0);
  });
});
