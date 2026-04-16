import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { htmlLangValid } from "./html-lang-valid";


describe("readable/html-lang-valid", () => {
  it("passes valid lang", () => {
    const doc = makeDoc('<html lang="en"><body></body></html>');
    expect(htmlLangValid.run(doc)).toHaveLength(0);
  });

  it("passes valid lang with region", () => {
    const doc = makeDoc('<html lang="en-US"><body></body></html>');
    expect(htmlLangValid.run(doc)).toHaveLength(0);
  });

  it("reports invalid lang", () => {
    const doc = makeDoc('<html lang="xyz123"><body></body></html>');
    expect(htmlLangValid.run(doc)).toHaveLength(1);
  });
});
