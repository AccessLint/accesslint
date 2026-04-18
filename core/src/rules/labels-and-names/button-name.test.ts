import { describe, it } from "vitest";
import { buttonName } from "./button-name";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "labels-and-names/button-name";

describe(RULE_ID, () => {
  it("passes button with text content", () => {
    expectNoViolations(buttonName, "<html><body><button>My button</button></body></html>");
  });

  it("passes button with img alt providing name", () => {
    expectNoViolations(
      buttonName,
      "<html><body><button><img src='x' alt='Delete'></button></body></html>",
    );
  });

  it("passes button with svg aria-label providing name", () => {
    expectNoViolations(
      buttonName,
      "<html><body><button><svg aria-label='Close'></svg></button></body></html>",
    );
  });

  it("passes button whose aria-hidden children don't contribute to the name", () => {
    expectNoViolations(
      buttonName,
      "<html><body><button><span aria-hidden='true'>×</span> Close</button></body></html>",
    );
  });

  it("passes button with title attribute as fallback name", () => {
    expectNoViolations(buttonName, "<html><body><button title='Submit'></button></body></html>");
  });

  it("passes button named via aria-labelledby to an existing id", () => {
    expectNoViolations(
      buttonName,
      "<html><body><span id='n'>Save</span><button aria-labelledby='n'></button></body></html>",
    );
  });

  it("passes input type=submit (UA default value provides name)", () => {
    expectNoViolations(buttonName, "<html><body><input type='submit'></body></html>");
  });

  it("passes div role=button with aria-label", () => {
    expectNoViolations(
      buttonName,
      "<html><body><div role='button' aria-label='X'></div></body></html>",
    );
  });

  it("reports empty button", () => {
    expectViolations(buttonName, "<html><body><button></button></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports button containing only whitespace", () => {
    expectViolations(buttonName, "<html><body><button>   </button></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports button whose aria-labelledby points to a missing id", () => {
    expectViolations(
      buttonName,
      "<html><body><button aria-labelledby='missing'></button></body></html>",
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });

  it("reports button with only an icon and no accessible name", () => {
    expectViolations(buttonName, "<html><body><button><svg></svg></button></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });
});
