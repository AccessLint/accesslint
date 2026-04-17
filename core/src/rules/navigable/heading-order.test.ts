import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { headingOrder } from "./heading-order";


describe("navigable/heading-order", () => {
  it("passes sequential headings", () => {
    expectNoViolations(headingOrder, "<html><body><h1>A</h1><h2>B</h2><h3>C</h3></body></html>");
  });

  it("reports skipped heading level", () => {
    expectViolations(headingOrder, "<html><body><h1>A</h1><h3>C</h3></body></html>", {
      count: 1,
      ruleId: "navigable/heading-order",
      messageMatches: /3/,
    });
  });

  it("allows same level headings", () => {
    expectNoViolations(headingOrder, "<html><body><h2>A</h2><h2>B</h2></body></html>");
  });

  it("allows going back to lower level", () => {
    expectNoViolations(headingOrder, "<html><body><h1>A</h1><h2>B</h2><h1>C</h1></body></html>");
  });
});
