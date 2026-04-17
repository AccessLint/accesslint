import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { accesskeys } from "./accesskeys";

const RULE_ID = "keyboard-accessible/accesskeys";

describe(RULE_ID, () => {
  it("reports duplicate accesskeys", () => {
    expectViolations(
      accesskeys,
      `
      <button accesskey="s">Save</button>
      <button accesskey="s">Submit</button>
    `,
      { count: 1, ruleId: RULE_ID, messageMatches: /s/ },
    );
  });

  it("passes unique accesskeys", () => {
    expectNoViolations(
      accesskeys,
      `
      <button accesskey="s">Save</button>
      <button accesskey="d">Delete</button>
    `,
    );
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(
      accesskeys,
      `
      <button accesskey="s">Save</button>
      <button accesskey="s" aria-hidden="true">Hidden</button>
    `,
    );
  });

  it("matches accesskeys case-insensitively", () => {
    expectViolations(
      accesskeys,
      `
      <button accesskey="S">Save</button>
      <button accesskey="s">Submit</button>
    `,
      { count: 1, ruleId: RULE_ID },
    );
  });
});
