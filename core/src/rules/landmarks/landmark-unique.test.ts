import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { landmarkUnique } from "./landmark-unique";

const RULE_ID = "landmarks/landmark-unique";

describe(RULE_ID, () => {
  it("passes with uniquely labeled navs", () => {
    expectNoViolations(
      landmarkUnique,
      `
      <html><body>
        <nav aria-label="Main">Links</nav>
        <nav aria-label="Footer">More links</nav>
      </body></html>
    `,
    );
  });

  it("reports duplicate nav labels", () => {
    expectViolations(
      landmarkUnique,
      `
      <html><body>
        <nav aria-label="Navigation">Links</nav>
        <nav aria-label="Navigation">More links</nav>
      </body></html>
    `,
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports navs with same text content", () => {
    // Navs with same text content are considered duplicates
    expectViolations(
      landmarkUnique,
      `
      <html><body>
        <nav>Links</nav>
        <nav>Links</nav>
      </body></html>
    `,
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes with single nav", () => {
    expectNoViolations(landmarkUnique, "<html><body><nav>Links</nav></body></html>");
  });
});
