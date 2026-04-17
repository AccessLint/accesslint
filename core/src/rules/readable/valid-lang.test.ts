import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { validLang } from "./valid-lang";

const RULE_ID = "readable/valid-lang";

describe(RULE_ID, () => {
  it("passes valid lang on element", () => {
    expectNoViolations(validLang, '<html lang="en"><body><p lang="fr">Bonjour</p></body></html>');
  });

  it("reports invalid lang on element", () => {
    expectViolations(validLang, '<html lang="en"><body><p lang="zzzz">Hello</p></body></html>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports empty lang on element with visible text", () => {
    expectViolations(validLang, '<html lang="en"><body><p lang=" ">Hello</p></body></html>', {
      count: 1,
      messageMatches: /^Empty lang attribute value\.$/,
    });
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(
      validLang,
      '<html lang="en"><body><p lang="zzzz" aria-hidden="true">Hidden</p></body></html>',
    );
  });

  it("skips element when lang text is overridden by descendant", () => {
    expectNoViolations(
      validLang,
      '<html lang="en"><body><div lang="zzzz"><span lang="fr">Bonjour</span></div></body></html>',
    );
  });

  it("reports invalid lang on element with img alt text", () => {
    expectViolations(
      validLang,
      '<html lang="en"><body><div lang="zzzz"><img alt="photo"></div></body></html>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("skips the html element (handled by html-lang-valid)", () => {
    expectNoViolations(validLang, '<html lang="zzzz"><body><p>Hello</p></body></html>');
  });
});
