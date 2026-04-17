import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { region } from "./region";

const RULE_ID = "landmarks/region";

describe(RULE_ID, () => {
  it("passes when all content is in landmarks", () => {
    expectNoViolations(
      region,
      `
      <html><body>
        <header>Header</header>
        <main>Content</main>
        <footer>Footer</footer>
      </body></html>
    `,
    );
  });

  it("reports content outside landmarks", () => {
    expectViolations(
      region,
      `
      <html><body>
        <div>Orphan content</div>
        <main>Main content</main>
      </body></html>
    `,
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("allows skip links outside landmarks", () => {
    expectNoViolations(
      region,
      `
      <html><body>
        <a href="#main">Skip to content</a>
        <main id="main">Content</main>
      </body></html>
    `,
    );
  });

  it("allows wrapper divs containing landmarks", () => {
    expectNoViolations(
      region,
      `
      <html><body>
        <div class="wrapper">
          <main>Content</main>
        </div>
      </body></html>
    `,
    );
  });
});
