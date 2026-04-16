import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { region } from "./region";


describe("landmarks/region", () => {
  it("passes when all content is in landmarks", () => {
    const doc = makeDoc(`
      <html><body>
        <header>Header</header>
        <main>Content</main>
        <footer>Footer</footer>
      </body></html>
    `);
    expect(region.run(doc)).toHaveLength(0);
  });

  it("reports content outside landmarks", () => {
    const doc = makeDoc(`
      <html><body>
        <div>Orphan content</div>
        <main>Main content</main>
      </body></html>
    `);
    const violations = region.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("landmarks/region");
  });

  it("allows skip links outside landmarks", () => {
    const doc = makeDoc(`
      <html><body>
        <a href="#main">Skip to content</a>
        <main id="main">Content</main>
      </body></html>
    `);
    expect(region.run(doc)).toHaveLength(0);
  });

  it("allows wrapper divs containing landmarks", () => {
    const doc = makeDoc(`
      <html><body>
        <div class="wrapper">
          <main>Content</main>
        </div>
      </body></html>
    `);
    expect(region.run(doc)).toHaveLength(0);
  });
});
