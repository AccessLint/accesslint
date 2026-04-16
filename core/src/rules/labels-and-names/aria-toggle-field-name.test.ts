import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaToggleFieldName } from "./aria-toggle-field-name";


describe("labels-and-names/aria-toggle-field-name", () => {
  it("passes checkbox with name", () => {
    const doc = makeDoc('<div role="checkbox" aria-checked="false">Subscribe</div>');
    expect(ariaToggleFieldName.run(doc)).toHaveLength(0);
  });

  it("reports checkbox without name", () => {
    const doc = makeDoc('<div role="checkbox" aria-checked="false"></div>');
    const violations = ariaToggleFieldName.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes switch with aria-label", () => {
    const doc = makeDoc('<div role="switch" aria-checked="true" aria-label="Dark mode"></div>');
    expect(ariaToggleFieldName.run(doc)).toHaveLength(0);
  });

  it("skips native checkboxes", () => {
    const doc = makeDoc('<input type="checkbox">');
    expect(ariaToggleFieldName.run(doc)).toHaveLength(0);
  });
});
