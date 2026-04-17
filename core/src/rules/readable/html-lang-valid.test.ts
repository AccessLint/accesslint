import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { htmlLangValid } from "./html-lang-valid";


describe("readable/html-lang-valid", () => {
  it("passes valid lang", () => {
    expectNoViolations(htmlLangValid, '<html lang="en"><body></body></html>');
  });

  it("passes valid lang with region", () => {
    expectNoViolations(htmlLangValid, '<html lang="en-US"><body></body></html>');
  });

  it("reports invalid lang", () => {
    expectViolations(htmlLangValid, '<html lang="xyz123"><body></body></html>', {
      count: 1,
      ruleId: "readable/html-lang-valid",
    });
  });
});
