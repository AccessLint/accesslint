import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { skipLink } from "./skip-link";


describe("navigable/skip-link", () => {
  // --- Pass cases ---

  it("passes: skip link with valid target", () => {
    const doc = makeDoc(
      '<body><a href="#main">Skip to main content</a><main id="main">Content</main></body>'
    );
    expect(skipLink.run(doc)).toHaveLength(0);
  });

  it("passes: non-skip anchor links with missing targets are ignored", () => {
    const doc = makeDoc(
      '<body><a href="#section1">Read more</a><a href="#section2">Details</a></body>'
    );
    expect(skipLink.run(doc)).toHaveLength(0);
  });

  it("passes: anchor with href='#' is skipped", () => {
    const doc = makeDoc(
      '<body><a href="#">Skip to main content</a></body>'
    );
    expect(skipLink.run(doc)).toHaveLength(0);
  });

  // --- Fail cases ---

  it("fails: skip link pointing to nonexistent target", () => {
    const doc = makeDoc(
      '<body><a href="#main">Skip to main content</a><div>No main landmark</div></body>'
    );
    const violations = skipLink.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("navigable/skip-link");
    expect(violations[0].impact).toBe("moderate");
    expect(violations[0].message).toContain("#main");
  });

  it("fails: jump to content link with missing target", () => {
    const doc = makeDoc(
      '<body><a href="#content">Jump to content</a><div>Body text</div></body>'
    );
    const violations = skipLink.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("navigable/skip-link");
    expect(violations[0].message).toContain("#content");
  });
});
