import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { htmlXmlLangMismatch } from "./html-xml-lang-mismatch";

describe("readable/html-xml-lang-mismatch", () => {
  it("passes when lang and xml:lang match", () => {
    expectNoViolations(htmlXmlLangMismatch, '<html lang="en" xml:lang="en"><body></body></html>');
  });

  it("reports when lang and xml:lang mismatch", () => {
    expectViolations(htmlXmlLangMismatch, '<html lang="en" xml:lang="fr"><body></body></html>', {
      count: 1,
      ruleId: "readable/html-xml-lang-mismatch",
    });
  });

  it("passes when only lang is present", () => {
    expectNoViolations(htmlXmlLangMismatch, '<html lang="en"><body></body></html>');
  });

  it("passes when only xml:lang is present", () => {
    expectNoViolations(htmlXmlLangMismatch, '<html xml:lang="en"><body></body></html>');
  });

  it("passes when region differs but primary language matches", () => {
    expectNoViolations(
      htmlXmlLangMismatch,
      '<html lang="en-US" xml:lang="en-GB"><body></body></html>',
    );
  });
});
