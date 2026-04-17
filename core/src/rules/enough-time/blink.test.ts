import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { blink } from "./blink";

describe("enough-time/blink", () => {
  it("reports blink element", () => {
    expectViolations(blink, "<html><body><blink>Attention!</blink></body></html>", {
      count: 1,
      ruleId: "enough-time/blink",
    });
  });

  it("passes without blink element", () => {
    expectNoViolations(blink, "<html><body><p>Normal text</p></body></html>");
  });

  it("skips aria-hidden blink", () => {
    expectNoViolations(blink, '<html><body><blink aria-hidden="true">Hidden</blink></body></html>');
  });
});
