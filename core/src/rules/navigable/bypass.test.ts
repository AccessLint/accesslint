import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { bypass } from "./bypass";


describe("navigable/bypass", () => {
  it("passes with main landmark", () => {
    expectNoViolations(bypass, "<html><body><main>Content</main></body></html>");
  });

  it("passes with role=main", () => {
    expectNoViolations(bypass, '<html><body><div role="main">Content</div></body></html>');
  });

  it("passes with skip link", () => {
    expectNoViolations(
      bypass,
      '<html><body><a href="#main">Skip to content</a><nav>Nav</nav><div id="main">Content</div></body></html>',
    );
  });

  it("passes with headings", () => {
    expectNoViolations(bypass, "<html><body><h1>Main content</h1><p>Text</p></body></html>");
  });

  it("reports page with no bypass mechanism", () => {
    expectViolations(bypass, "<html><body><div>Just content</div></body></html>", {
      count: 1,
      ruleId: "navigable/bypass",
    });
  });
});
