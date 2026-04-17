import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaDialogName } from "./aria-dialog-name";

const RULE_ID = "labels-and-names/aria-dialog-name";

describe(RULE_ID, () => {
  it("passes dialog with aria-label", () => {
    expectNoViolations(ariaDialogName, '<div role="dialog" aria-label="Confirm action"></div>');
  });

  it("passes dialog with aria-labelledby", () => {
    expectNoViolations(
      ariaDialogName,
      '<div role="dialog" aria-labelledby="title"><h2 id="title">Settings</h2></div>',
    );
  });

  it("reports empty dialog without name", () => {
    expectViolations(ariaDialogName, '<div role="dialog"></div>', { count: 1, ruleId: RULE_ID });
  });

  it("checks alertdialog", () => {
    expectViolations(ariaDialogName, '<div role="alertdialog"></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes native dialog with aria-label", () => {
    expectNoViolations(ariaDialogName, '<dialog aria-label="Settings"><p>Content</p></dialog>');
  });
});
