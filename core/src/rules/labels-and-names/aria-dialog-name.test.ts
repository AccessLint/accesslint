import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaDialogName } from "./aria-dialog-name";


describe("labels-and-names/aria-dialog-name", () => {
  it("passes dialog with aria-label", () => {
    const doc = makeDoc('<div role="dialog" aria-label="Confirm action"></div>');
    expect(ariaDialogName.run(doc)).toHaveLength(0);
  });

  it("passes dialog with aria-labelledby", () => {
    const doc = makeDoc('<div role="dialog" aria-labelledby="title"><h2 id="title">Settings</h2></div>');
    expect(ariaDialogName.run(doc)).toHaveLength(0);
  });

  it("reports empty dialog without name", () => {
    const doc = makeDoc('<div role="dialog"></div>');
    const violations = ariaDialogName.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("checks alertdialog", () => {
    const doc = makeDoc('<div role="alertdialog"></div>');
    const violations = ariaDialogName.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes native dialog with aria-label", () => {
    const doc = makeDoc('<dialog aria-label="Settings"><p>Content</p></dialog>');
    expect(ariaDialogName.run(doc)).toHaveLength(0);
  });
});
