import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { htmlHasLang } from "./html-has-lang";


describe("readable/html-has-lang", () => {
  it("reports missing lang", () => {
    const doc = makeDoc("<html><body></body></html>");
    expect(htmlHasLang.run(doc)).toHaveLength(1);
  });

  it("returns 'html' as the selector", () => {
    const doc = makeDoc("<html><body></body></html>");
    const violations = htmlHasLang.run(doc);
    expect(violations[0].selector).toBe("html");
  });

  it("passes with lang", () => {
    const doc = makeDoc('<html lang="en"><body></body></html>');
    expect(htmlHasLang.run(doc)).toHaveLength(0);
  });

  it("reports empty lang", () => {
    const doc = makeDoc('<html lang=""><body></body></html>');
    expect(htmlHasLang.run(doc)).toHaveLength(1);
  });
});
