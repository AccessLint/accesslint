import { describe, it } from "vitest";
import type { Rule } from "../types";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { bannerIsTopLevel } from "./banner-is-top-level";
import { contentinfoIsTopLevel } from "./contentinfo-is-top-level";
import { mainIsTopLevel } from "./main-is-top-level";
import { complementaryIsTopLevel } from "./complementary-is-top-level";

interface LandmarkCase {
  rule: Rule;
  passes: { label: string; body: string }[];
  violates: { label: string; body: string }[];
}

const cases: LandmarkCase[] = [
  {
    rule: bannerIsTopLevel,
    passes: [{ label: "top-level banner", body: '<div role="banner">Header</div>' }],
    violates: [
      { label: "nested role=banner", body: '<main><div role="banner">Nested</div></main>' },
    ],
  },
  {
    rule: contentinfoIsTopLevel,
    passes: [{ label: "top-level contentinfo", body: '<div role="contentinfo">Footer</div>' }],
    violates: [
      {
        label: "nested role=contentinfo",
        body: '<article><div role="contentinfo">Nested</div></article>',
      },
    ],
  },
  {
    rule: mainIsTopLevel,
    passes: [
      { label: "top-level main", body: "<main>Content</main>" },
      {
        label: "main inside bare section (no landmark role)",
        body: '<section id="primary"><main>Content</main></section>',
      },
    ],
    violates: [
      {
        label: "main nested in named section (region landmark)",
        body: '<section aria-label="Region"><main>Nested</main></section>',
      },
      { label: "main nested in article", body: "<article><main>Nested</main></article>" },
    ],
  },
  {
    rule: complementaryIsTopLevel,
    passes: [
      { label: "top-level aside", body: "<aside>Sidebar</aside>" },
      { label: "aside inside main", body: "<main><aside>Related</aside></main>" },
      {
        label: "aside inside bare section (no landmark role)",
        body: "<section><aside>Sidebar</aside></section>",
      },
    ],
    violates: [
      { label: "aside nested in article", body: "<article><aside>Nested</aside></article>" },
    ],
  },
];

for (const { rule, passes, violates } of cases) {
  describe(rule.id, () => {
    it.each(passes)("passes for $label", ({ body }) => {
      expectNoViolations(rule, `<html><body>${body}</body></html>`);
    });

    it.each(violates)("reports $label", ({ body }) => {
      expectViolations(rule, `<html><body>${body}</body></html>`, {
        count: 1,
        ruleId: rule.id,
      });
    });
  });
}
