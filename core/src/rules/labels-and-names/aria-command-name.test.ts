import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaCommandName } from "./aria-command-name";

const RULE_ID = "labels-and-names/aria-command-name";

describe(RULE_ID, () => {
  it("passes command with text", () => {
    expectNoViolations(ariaCommandName, '<div role="button">Click me</div>');
  });

  it("passes command with aria-label", () => {
    expectNoViolations(ariaCommandName, '<div role="button" aria-label="Close"></div>');
  });

  it("reports command without name", () => {
    expectViolations(ariaCommandName, '<div role="button"></div>', { count: 1, ruleId: RULE_ID });
  });

  it("skips native buttons (handled by button-name)", () => {
    expectNoViolations(ariaCommandName, "<button></button>");
  });

  it("passes menuitem with name", () => {
    expectNoViolations(ariaCommandName, '<div role="menuitem">Edit</div>');
  });

  it("passes command with img alt inside", () => {
    expectNoViolations(ariaCommandName, '<div role="button"><img src="x.png" alt="Icon"></div>');
  });
});
