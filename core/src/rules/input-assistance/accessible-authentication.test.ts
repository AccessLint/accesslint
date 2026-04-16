import { describe, it, expect } from "vitest";
import { accessibleAuthentication } from "./accessible-authentication";
import { makeDoc } from "../../test-helpers";

describe("input-assistance/accessible-authentication", () => {
  // --- Passing cases ---
  it("passes password field with autocomplete=current-password", () => {
    const doc = makeDoc('<input type="password" autocomplete="current-password">');
    expect(accessibleAuthentication.run(doc)).toHaveLength(0);
  });

  it("passes password field with autocomplete=new-password", () => {
    const doc = makeDoc('<input type="password" autocomplete="new-password">');
    expect(accessibleAuthentication.run(doc)).toHaveLength(0);
  });

  it("passes password field with no autocomplete attribute", () => {
    const doc = makeDoc('<input type="password">');
    expect(accessibleAuthentication.run(doc)).toHaveLength(0);
  });

  it("passes password field with empty autocomplete", () => {
    const doc = makeDoc('<input type="password" autocomplete="">');
    expect(accessibleAuthentication.run(doc)).toHaveLength(0);
  });

  it("passes non-password input with autocomplete=off", () => {
    const doc = makeDoc('<input type="text" autocomplete="off">');
    expect(accessibleAuthentication.run(doc)).toHaveLength(0);
  });

  it("passes password field with benign onpaste", () => {
    const doc = makeDoc('<input type="password" onpaste="handlePaste()">');
    expect(accessibleAuthentication.run(doc)).toHaveLength(0);
  });

  // --- Violations ---
  it("reports password field with autocomplete=off", () => {
    const doc = makeDoc('<input type="password" autocomplete="off">');
    const v = accessibleAuthentication.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe("input-assistance/accessible-authentication");
    expect(v[0].impact).toBe("critical");
    expect(v[0].message).toContain("autocomplete");
    expect(v[0].fix).toEqual({
      type: "set-attribute",
      attribute: "autocomplete",
      value: "current-password",
    });
  });

  it("reports password field with onpaste=return false", () => {
    const doc = makeDoc('<input type="password" onpaste="return false">');
    const v = accessibleAuthentication.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].message).toContain("pasting");
    expect(v[0].fix).toEqual({
      type: "remove-attribute",
      attribute: "onpaste",
    });
  });

  it("reports password field with onpaste using preventDefault", () => {
    const doc = makeDoc('<input type="password" onpaste="event.preventDefault()">');
    const v = accessibleAuthentication.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].message).toContain("pasting");
  });

  it("reports only autocomplete=off when both violations present", () => {
    const doc = makeDoc(
      '<input type="password" autocomplete="off" onpaste="return false">'
    );
    // autocomplete=off triggers first, and we continue past it
    const v = accessibleAuthentication.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].message).toContain("autocomplete");
  });

  it("reports multiple password fields independently", () => {
    const doc = makeDoc(`
      <input type="password" autocomplete="off">
      <input type="password" onpaste="return false">
    `);
    const v = accessibleAuthentication.run(doc);
    expect(v).toHaveLength(2);
  });

  // --- Skipped elements ---
  it("skips aria-hidden password fields", () => {
    const doc = makeDoc(
      '<input type="password" autocomplete="off" aria-hidden="true">'
    );
    expect(accessibleAuthentication.run(doc)).toHaveLength(0);
  });

  it("skips disabled password fields", () => {
    const doc = makeDoc('<input type="password" autocomplete="off" disabled>');
    expect(accessibleAuthentication.run(doc)).toHaveLength(0);
  });

  it("skips aria-disabled password fields", () => {
    const doc = makeDoc(
      '<input type="password" autocomplete="off" aria-disabled="true">'
    );
    expect(accessibleAuthentication.run(doc)).toHaveLength(0);
  });

  it("skips computed-hidden password fields", () => {
    const doc = makeDoc(
      '<input type="password" autocomplete="off" style="display:none">'
    );
    expect(accessibleAuthentication.run(doc)).toHaveLength(0);
  });
});
