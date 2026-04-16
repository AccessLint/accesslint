import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaMeterName } from "./aria-meter-name";


describe("labels-and-names/aria-meter-name", () => {
  it("passes meter with aria-label", () => {
    const doc = makeDoc('<div role="meter" aria-valuenow="70" aria-label="Battery level"></div>');
    expect(ariaMeterName.run(doc)).toHaveLength(0);
  });

  it("reports meter without name", () => {
    const doc = makeDoc('<div role="meter" aria-valuenow="70"></div>');
    const violations = ariaMeterName.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes native meter with aria-label", () => {
    const doc = makeDoc('<meter value="0.7" aria-label="Progress"></meter>');
    expect(ariaMeterName.run(doc)).toHaveLength(0);
  });
});
