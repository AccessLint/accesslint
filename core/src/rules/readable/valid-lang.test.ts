import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { validLang } from "./valid-lang";


describe("readable/valid-lang", () => {
  it("passes valid lang on element", () => {
    const doc = makeDoc('<html lang="en"><body><p lang="fr">Bonjour</p></body></html>');
    expect(validLang.run(doc)).toHaveLength(0);
  });

  it("reports invalid lang on element", () => {
    const doc = makeDoc('<html lang="en"><body><p lang="zzzz">Hello</p></body></html>');
    expect(validLang.run(doc)).toHaveLength(1);
  });

  it("reports empty lang on element with visible text", () => {
    const doc = makeDoc('<html lang="en"><body><p lang=" ">Hello</p></body></html>');
    expect(validLang.run(doc)).toHaveLength(1);
    expect(validLang.run(doc)[0].message).toBe("Empty lang attribute value.");
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<html lang="en"><body><p lang="zzzz" aria-hidden="true">Hidden</p></body></html>');
    expect(validLang.run(doc)).toHaveLength(0);
  });

  it("skips element when lang text is overridden by descendant", () => {
    const doc = makeDoc('<html lang="en"><body><div lang="zzzz"><span lang="fr">Bonjour</span></div></body></html>');
    expect(validLang.run(doc)).toHaveLength(0);
  });

  it("reports invalid lang on element with img alt text", () => {
    const doc = makeDoc('<html lang="en"><body><div lang="zzzz"><img alt="photo"></div></body></html>');
    expect(validLang.run(doc)).toHaveLength(1);
  });

  it("skips the html element (handled by html-lang-valid)", () => {
    const doc = makeDoc('<html lang="zzzz"><body><p>Hello</p></body></html>');
    expect(validLang.run(doc)).toHaveLength(0);
  });
});
