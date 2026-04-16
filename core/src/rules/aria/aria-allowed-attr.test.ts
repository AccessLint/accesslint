import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaAllowedAttr } from "./aria-allowed-attr";


describe("aria/aria-allowed-attr", () => {
  it("passes when ARIA attributes are allowed for role", () => {
    const doc = makeDoc('<button aria-pressed="true">Toggle</button>');
    expect(ariaAllowedAttr.run(doc)).toHaveLength(0);
  });

  it("passes global ARIA attributes on any role", () => {
    const doc = makeDoc('<div role="button" aria-label="Close" aria-describedby="desc">X</div>');
    expect(ariaAllowedAttr.run(doc)).toHaveLength(0);
  });

  it("reports aria-pressed on role=link", () => {
    const doc = makeDoc('<div role="link" aria-pressed="true">Link</div>');
    const violations = ariaAllowedAttr.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("aria-pressed");
    expect(violations[0].message).toContain("link");
  });

  it("reports aria-checked on role=button (without toggle)", () => {
    const doc = makeDoc('<div role="button" aria-checked="true">Button</div>');
    const violations = ariaAllowedAttr.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes aria-checked on checkbox role", () => {
    const doc = makeDoc('<div role="checkbox" aria-checked="false">Option</div>');
    expect(ariaAllowedAttr.run(doc)).toHaveLength(0);
  });

  it("passes aria-expanded on button role", () => {
    const doc = makeDoc('<button aria-expanded="true">Menu</button>');
    expect(ariaAllowedAttr.run(doc)).toHaveLength(0);
  });

  it("reports aria-sort on non-header role", () => {
    const doc = makeDoc('<div role="cell" aria-sort="ascending">Value</div>');
    const violations = ariaAllowedAttr.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes aria-sort on columnheader", () => {
    const doc = makeDoc('<div role="columnheader" aria-sort="ascending">Name</div>');
    expect(ariaAllowedAttr.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<div role="link" aria-pressed="true" aria-hidden="true">Hidden</div>');
    expect(ariaAllowedAttr.run(doc)).toHaveLength(0);
  });

  it("checks implicit roles from native elements", () => {
    // Button has implicit role="button", aria-level is not allowed
    const doc = makeDoc('<button aria-level="2">Button</button>');
    const violations = ariaAllowedAttr.run(doc);
    expect(violations).toHaveLength(1);
  });
});
