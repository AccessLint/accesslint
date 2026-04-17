import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { linkName } from "./link-name";

describe("navigable/link-name", () => {
  it("reports empty links", () => {
    expectViolations(linkName, '<html><body><a href="/page"></a></body></html>', {
      count: 1,
      ruleId: "navigable/link-name",
    });
  });

  it("passes links with text", () => {
    expectNoViolations(linkName, '<html><body><a href="/page">About</a></body></html>');
  });

  it("passes links with aria-label", () => {
    expectNoViolations(
      linkName,
      '<html><body><a href="/page" aria-label="About us"></a></body></html>',
    );
  });

  it("passes links with img alt inside", () => {
    expectNoViolations(
      linkName,
      '<html><body><a href="/page"><img src="x.png" alt="Logo"></a></body></html>',
    );
  });

  it("reports link whose only text is inside a display:none child", () => {
    expectViolations(
      linkName,
      '<html><body><a href="/page"><span style="display: none;">Hidden</span></a></body></html>',
      { count: 1, ruleId: "navigable/link-name" },
    );
  });

  it("reports link whose only text is inside a visibility:hidden child", () => {
    expectViolations(
      linkName,
      '<html><body><a href="/page"><span style="visibility: hidden;">Hidden</span></a></body></html>',
      { count: 1, ruleId: "navigable/link-name" },
    );
  });

  it("passes link with mix of hidden and visible text", () => {
    expectNoViolations(
      linkName,
      '<html><body><a href="/page"><span style="display: none;">Icon</span> About</a></body></html>',
    );
  });
});
