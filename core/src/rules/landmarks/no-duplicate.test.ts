import { describe, it } from "vitest";
import type { Rule } from "../types";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { noDuplicateBanner } from "./no-duplicate-banner";
import { noDuplicateContentinfo } from "./no-duplicate-contentinfo";
import { noDuplicateMain } from "./no-duplicate-main";

interface NoDuplicateCase {
  rule: Rule;
  passes: { label: string; body: string }[];
  violates: { label: string; body: string }[];
}

const cases: NoDuplicateCase[] = [
  {
    rule: noDuplicateBanner,
    passes: [
      { label: "single header", body: "<header>Site header</header><main>Content</main>" },
      {
        label: "headers inside sectioning elements are ignored",
        body: "<header>Site</header><article><header>Article</header></article>",
      },
    ],
    violates: [
      { label: "duplicate top-level headers", body: "<header>One</header><header>Two</header>" },
    ],
  },
  {
    rule: noDuplicateContentinfo,
    passes: [{ label: "single footer", body: "<main>Content</main><footer>Site footer</footer>" }],
    violates: [
      { label: "duplicate top-level footers", body: "<footer>One</footer><footer>Two</footer>" },
    ],
  },
  {
    rule: noDuplicateMain,
    passes: [{ label: "single main", body: "<main>Content</main>" }],
    violates: [{ label: "duplicate mains", body: "<main>One</main><main>Two</main>" }],
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
