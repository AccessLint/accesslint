import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaCommandName } from "./aria-command-name";


describe("labels-and-names/aria-command-name", () => {
  it("passes command with text", () => {
    const doc = makeDoc('<div role="button">Click me</div>');
    expect(ariaCommandName.run(doc)).toHaveLength(0);
  });

  it("passes command with aria-label", () => {
    const doc = makeDoc('<div role="button" aria-label="Close"></div>');
    expect(ariaCommandName.run(doc)).toHaveLength(0);
  });

  it("reports command without name", () => {
    const doc = makeDoc('<div role="button"></div>');
    const violations = ariaCommandName.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("skips native buttons (handled by button-name)", () => {
    const doc = makeDoc("<button></button>");
    expect(ariaCommandName.run(doc)).toHaveLength(0);
  });

  it("passes menuitem with name", () => {
    const doc = makeDoc('<div role="menuitem">Edit</div>');
    expect(ariaCommandName.run(doc)).toHaveLength(0);
  });

  it("passes command with img alt inside", () => {
    const doc = makeDoc('<div role="button"><img src="x.png" alt="Icon"></div>');
    expect(ariaCommandName.run(doc)).toHaveLength(0);
  });
});
