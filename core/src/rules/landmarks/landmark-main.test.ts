import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { landmarkMain } from "./landmark-main";

const RULE_ID = "landmarks/landmark-main";

describe(RULE_ID, () => {
  it("reports missing main landmark", () => {
    expectViolations(landmarkMain, "<html><body><div>Content</div></body></html>", {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /no main/,
    });
  });

  it("passes with main element", () => {
    expectNoViolations(landmarkMain, "<html><body><main>Content</main></body></html>");
  });

  it("passes with role=main", () => {
    expectNoViolations(landmarkMain, '<html><body><div role="main">Content</div></body></html>');
  });

  it("reports multiple main landmarks", () => {
    expectViolations(landmarkMain, "<html><body><main>One</main><main>Two</main></body></html>", {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /multiple/,
    });
  });
});
