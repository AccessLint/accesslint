import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { noDuplicateMain } from "./no-duplicate-main";


describe("landmarks/no-duplicate-main", () => {
  it("passes with single main", () => {
    const doc = makeDoc("<html><body><main>Content</main></body></html>");
    expect(noDuplicateMain.run(doc)).toHaveLength(0);
  });

  it("reports duplicate mains", () => {
    const doc = makeDoc("<html><body><main>One</main><main>Two</main></body></html>");
    const violations = noDuplicateMain.run(doc);
    expect(violations).toHaveLength(1);
  });
});
