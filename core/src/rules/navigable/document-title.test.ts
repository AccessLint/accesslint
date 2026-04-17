import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { documentTitle } from "./document-title";

const RULE_ID = "navigable/document-title";

describe(RULE_ID, () => {
  it("reports missing title element", () => {
    expectViolations(documentTitle, "<html><head></head><body>Content</body></html>", {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /missing/,
    });
  });

  it("reports empty title element", () => {
    expectViolations(
      documentTitle,
      "<html><head><title></title></head><body>Content</body></html>",
      {
        count: 1,
        messageMatches: /empty/,
      },
    );
  });

  it("reports whitespace-only title element", () => {
    expectViolations(
      documentTitle,
      "<html><head><title>   </title></head><body>Content</body></html>",
      {
        count: 1,
      },
    );
  });

  it("passes with valid title", () => {
    expectNoViolations(
      documentTitle,
      "<html><head><title>My Page Title</title></head><body>Content</body></html>",
    );
  });
});
