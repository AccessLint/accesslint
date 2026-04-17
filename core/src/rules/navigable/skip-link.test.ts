import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { skipLink } from "./skip-link";

const RULE_ID = "navigable/skip-link";

describe(RULE_ID, () => {
  // --- Pass cases ---

  it("passes: skip link with valid target", () => {
    expectNoViolations(
      skipLink,
      '<body><a href="#main">Skip to main content</a><main id="main">Content</main></body>',
    );
  });

  it("passes: non-skip anchor links with missing targets are ignored", () => {
    expectNoViolations(
      skipLink,
      '<body><a href="#section1">Read more</a><a href="#section2">Details</a></body>',
    );
  });

  it("passes: anchor with href='#' is skipped", () => {
    expectNoViolations(skipLink, '<body><a href="#">Skip to main content</a></body>');
  });

  // --- Fail cases ---

  it("fails: skip link pointing to nonexistent target", () => {
    expectViolations(
      skipLink,
      '<body><a href="#main">Skip to main content</a><div>No main landmark</div></body>',
      { count: 1, ruleId: RULE_ID, impact: "moderate", messageMatches: /#main/ },
    );
  });

  it("fails: jump to content link with missing target", () => {
    expectViolations(
      skipLink,
      '<body><a href="#content">Jump to content</a><div>Body text</div></body>',
      { count: 1, ruleId: RULE_ID, messageMatches: /#content/ },
    );
  });
});
