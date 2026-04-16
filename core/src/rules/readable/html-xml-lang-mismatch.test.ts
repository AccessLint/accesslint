import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { htmlXmlLangMismatch } from "./html-xml-lang-mismatch";


describe("readable/html-xml-lang-mismatch", () => {
  it("passes when lang and xml:lang match", () => {
    const doc = makeDoc('<html lang="en" xml:lang="en"><body></body></html>');
    expect(htmlXmlLangMismatch.run(doc)).toHaveLength(0);
  });

  it("reports when lang and xml:lang mismatch", () => {
    const doc = makeDoc('<html lang="en" xml:lang="fr"><body></body></html>');
    expect(htmlXmlLangMismatch.run(doc)).toHaveLength(1);
  });

  it("passes when only lang is present", () => {
    const doc = makeDoc('<html lang="en"><body></body></html>');
    expect(htmlXmlLangMismatch.run(doc)).toHaveLength(0);
  });

  it("passes when only xml:lang is present", () => {
    const doc = makeDoc('<html xml:lang="en"><body></body></html>');
    expect(htmlXmlLangMismatch.run(doc)).toHaveLength(0);
  });

  it("passes when region differs but primary language matches", () => {
    const doc = makeDoc('<html lang="en-US" xml:lang="en-GB"><body></body></html>');
    expect(htmlXmlLangMismatch.run(doc)).toHaveLength(0);
  });
});
