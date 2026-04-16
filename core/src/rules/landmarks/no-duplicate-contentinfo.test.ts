import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { noDuplicateContentinfo } from "./no-duplicate-contentinfo";


describe("landmarks/no-duplicate-contentinfo", () => {
  it("passes with single footer", () => {
    const doc = makeDoc("<html><body><main>Content</main><footer>Site footer</footer></body></html>");
    expect(noDuplicateContentinfo.run(doc)).toHaveLength(0);
  });

  it("reports duplicate top-level footers", () => {
    const doc = makeDoc("<html><body><footer>One</footer><footer>Two</footer></body></html>");
    const violations = noDuplicateContentinfo.run(doc);
    expect(violations).toHaveLength(1);
  });
});
