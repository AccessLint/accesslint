/**
 * Opt-in Vitest fixture that caches the result of `runAudit` within a single
 * test body. Subsequent `toBeAccessible()` calls on the same document share
 * work, provided they pass matching options (disabledRules, componentMode,
 * locale, …). Callers invalidate the cache with `a11y.refresh()` after
 * mutating the DOM between assertions.
 *
 *   import { test } from "@accesslint/vitest/fixture";
 *
 *   test("Form", ({ a11y }) => {
 *     render(<Form />);
 *     a11y.refresh();
 *     expect(screen.getByRole("form")).toBeAccessible();
 *     expect(screen.getByRole("button")).toBeAccessible();
 *   });
 */
import { test as base } from "vitest";
import { clearCachedAudit, setFixtureActive } from "@accesslint/matchers-internal";

export interface A11yFixture {
  /**
   * Drop any cached audits for the current document — call after mutating
   * the DOM between assertions to force a fresh audit on the next matcher.
   */
  refresh(): void;
}

export const test = base.extend<{ a11y: A11yFixture }>({
  // eslint-disable-next-line no-empty-pattern
  a11y: async ({}, use) => {
    const doc = typeof document !== "undefined" ? document : undefined;
    if (doc) setFixtureActive(doc, true);
    try {
      await use({
        refresh() {
          if (doc) clearCachedAudit(doc);
        },
      });
    } finally {
      if (doc) {
        clearCachedAudit(doc);
        setFixtureActive(doc, false);
      }
    }
  },
});
