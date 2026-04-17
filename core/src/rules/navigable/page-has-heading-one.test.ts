import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { pageHasHeadingOne } from "./page-has-heading-one";

describe("navigable/page-has-heading-one", () => {
  it("passes with h1 element", () => {
    expectNoViolations(pageHasHeadingOne, "<html><body><h1>Page Title</h1></body></html>");
  });

  it("passes with role=heading aria-level=1", () => {
    expectNoViolations(
      pageHasHeadingOne,
      '<html><body><div role="heading" aria-level="1">Page Title</div></body></html>',
    );
  });

  it("reports missing h1", () => {
    expectViolations(
      pageHasHeadingOne,
      "<html><body><h2>Section</h2><p>Content</p></body></html>",
      {
        count: 1,
        ruleId: "navigable/page-has-heading-one",
      },
    );
  });

  it("reports empty h1", () => {
    expectViolations(pageHasHeadingOne, "<html><body><h1></h1></body></html>", {
      count: 1,
      ruleId: "navigable/page-has-heading-one",
    });
  });

  it("passes with h1 that has aria-label", () => {
    expectNoViolations(
      pageHasHeadingOne,
      '<html><body><h1 aria-label="Page Title"></h1></body></html>',
    );
  });
});
