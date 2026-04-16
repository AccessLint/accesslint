import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaProgressbarName } from "./aria-progressbar-name";


describe("labels-and-names/aria-progressbar-name", () => {
  it("passes progressbar with aria-label", () => {
    const doc = makeDoc('<div role="progressbar" aria-valuenow="50" aria-label="Upload progress"></div>');
    expect(ariaProgressbarName.run(doc)).toHaveLength(0);
  });

  it("reports progressbar without name", () => {
    const doc = makeDoc('<div role="progressbar" aria-valuenow="50"></div>');
    const violations = ariaProgressbarName.run(doc);
    expect(violations).toHaveLength(1);
  });
});
