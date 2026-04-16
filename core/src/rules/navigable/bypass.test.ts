import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { bypass } from "./bypass";


describe("navigable/bypass", () => {
  it("passes with main landmark", () => {
    const doc = makeDoc("<html><body><main>Content</main></body></html>");
    expect(bypass.run(doc)).toHaveLength(0);
  });

  it("passes with role=main", () => {
    const doc = makeDoc('<html><body><div role="main">Content</div></body></html>');
    expect(bypass.run(doc)).toHaveLength(0);
  });

  it("passes with skip link", () => {
    const doc = makeDoc('<html><body><a href="#main">Skip to content</a><nav>Nav</nav><div id="main">Content</div></body></html>');
    expect(bypass.run(doc)).toHaveLength(0);
  });

  it("passes with headings", () => {
    const doc = makeDoc("<html><body><h1>Main content</h1><p>Text</p></body></html>");
    expect(bypass.run(doc)).toHaveLength(0);
  });

  it("reports page with no bypass mechanism", () => {
    const doc = makeDoc("<html><body><div>Just content</div></body></html>");
    const violations = bypass.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("navigable/bypass");
  });
});
