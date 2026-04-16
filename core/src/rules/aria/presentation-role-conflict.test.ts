import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { presentationRoleConflict } from "./presentation-role-conflict";


describe("aria/presentation-role-conflict", () => {
  it("passes role=presentation on non-focusable element", () => {
    const doc = makeDoc('<img role="presentation" src="spacer.gif">');
    expect(presentationRoleConflict.run(doc)).toHaveLength(0);
  });

  it("passes role=none on non-focusable element", () => {
    const doc = makeDoc('<div role="none">Decorative</div>');
    expect(presentationRoleConflict.run(doc)).toHaveLength(0);
  });

  it("reports focusable button with role=presentation", () => {
    const doc = makeDoc('<button role="presentation">Click</button>');
    const violations = presentationRoleConflict.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("focusable");
  });

  it("reports link with role=none", () => {
    const doc = makeDoc('<a href="/" role="none">Link</a>');
    const violations = presentationRoleConflict.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports element with tabindex and role=presentation", () => {
    const doc = makeDoc('<div role="presentation" tabindex="0">Focusable</div>');
    const violations = presentationRoleConflict.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports element with aria-label and role=none", () => {
    const doc = makeDoc('<div role="none" aria-label="Named">Content</div>');
    const violations = presentationRoleConflict.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("accessible name");
  });

  it("reports element with aria-labelledby and role=presentation", () => {
    const doc = makeDoc('<span id="lbl">Label</span><div role="presentation" aria-labelledby="lbl">Content</div>');
    const violations = presentationRoleConflict.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports element with aria-describedby and role=none", () => {
    const doc = makeDoc('<div role="none" aria-describedby="desc">Content</div>');
    const violations = presentationRoleConflict.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports element with aria-controls and role=presentation", () => {
    const doc = makeDoc('<div role="presentation" aria-controls="panel">Content</div>');
    const violations = presentationRoleConflict.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes disabled button with role=presentation", () => {
    const doc = makeDoc('<button role="presentation" disabled>Disabled</button>');
    expect(presentationRoleConflict.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<button role="presentation" aria-hidden="true">Hidden</button>');
    expect(presentationRoleConflict.run(doc)).toHaveLength(0);
  });

  it("passes tabindex=-1 (not in tab order)", () => {
    const doc = makeDoc('<div role="none" tabindex="-1">Not in tab order</div>');
    expect(presentationRoleConflict.run(doc)).toHaveLength(0);
  });
});
