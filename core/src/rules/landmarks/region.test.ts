import { describe, it, expect } from "vitest";
import { expectViolations, expectNoViolations, makeDoc } from "../../test-helpers";
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

  it("ignores content in a display:none subtree", () => {
    expectNoViolations(
      region,
      `
      <html><body>
        <main>Content</main>
        <div style="display: none">Untriggered popup</div>
      </body></html>
    `,
    );
  });

  it("ignores a hidden popup inside a visible wrapper", () => {
    expectNoViolations(
      region,
      `
      <html><body>
        <main>Content</main>
        <div class="wrapper">
          <div style="display: none">Untriggered popup</div>
        </div>
      </body></html>
    `,
    );
  });

  it("reports a visible popup inside a wrapper", () => {
    expectViolations(
      region,
      `
      <html><body>
        <main>Content</main>
        <div class="wrapper">
          <div>Triggered popup</div>
        </div>
      </body></html>
    `,
      { count: 1, ruleId: RULE_ID },
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

  it("ignores a misplaced <title> in the body", () => {
    const doc = makeDoc(`
      <html><body>
        <title>Page title</title>
        <main>Content</main>
      </body></html>
    `);
    // Guard the fixture: the parser must leave <title> in <body> for this to
    // exercise the malformed-markup case from the bug report.
    expect(Array.from(doc.body.children).map((c) => c.tagName)).toContain("TITLE");
    expect(region.run(doc)).toEqual([]);
  });

  it("ignores non-rendered head content misplaced in the body", () => {
    expectNoViolations(
      region,
      `
      <html><body>
        <title>Page title</title>
        <script>console.log("x")</script>
        <style>body { color: red }</style>
        <meta name="description" content="d">
        <link rel="canonical" href="/page">
        <template><p>Template content</p></template>
        <base href="/">
        <main>Content</main>
      </body></html>
    `,
    );
  });

  it("ignores a <noscript> the UA stylesheet hides", () => {
    // Chrome gives <noscript> display:none whenever scripting is enabled, which
    // is the only way we evaluate a document. happy-dom ships no UA rule for it,
    // so the fixture supplies one; the rule reads computed style either way.
    expectNoViolations(
      region,
      `
      <html><head><style>noscript { display: none }</style></head><body>
        <noscript>Enable JavaScript</noscript>
        <main>Content</main>
      </body></html>
    `,
    );
  });

  it("ignores a datalist, which belongs in the body but renders nothing", () => {
    expectNoViolations(
      region,
      `
      <html><body>
        <datalist id="fruits">
          <option value="Apple">Apple</option>
          <option value="Banana">Banana</option>
        </datalist>
        <main><input list="fruits"></main>
      </body></html>
    `,
    );
  });

  it("still reports rendered content alongside non-rendered tags", () => {
    expectViolations(
      region,
      `
      <html><body>
        <title>Page title</title>
        <div>Orphan content</div>
        <main>Main content</main>
      </body></html>
    `,
      { count: 1, ruleId: RULE_ID, selectorIncludes: "div" },
    );
  });
});
