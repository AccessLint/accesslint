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
import type { Violation } from "@accesslint/core";

export interface A11yFixture {
  /**
   * Drop any cached audits for the current document — call after mutating
   * the DOM between assertions to force a fresh audit on the next matcher.
   */
  refresh(): void;
}

type Cache = Map<string, Violation[]>;

const CACHE_KEY = Symbol.for("accesslint.vitest.audit-cache");

interface DocumentWithCache extends Document {
  [CACHE_KEY]?: Cache;
}

function cache(doc: Document): Cache {
  const d = doc as DocumentWithCache;
  let c = d[CACHE_KEY];
  if (!c) {
    c = new Map();
    d[CACHE_KEY] = c;
  }
  return c;
}

export function getCachedAudit(doc: Document, key: string): Violation[] | undefined {
  return cache(doc).get(key);
}

export function setCachedAudit(doc: Document, key: string, violations: Violation[]): void {
  cache(doc).set(key, violations);
}

export function clearCachedAudit(doc: Document): void {
  delete (doc as DocumentWithCache)[CACHE_KEY];
}

/**
 * Is audit caching enabled for `doc`? The matcher consults this to decide
 * whether to reuse cached audits — we only cache when the fixture has
 * explicitly opted in for this test.
 */
const FIXTURE_ACTIVE_KEY = Symbol.for("accesslint.vitest.fixture-active");

interface DocumentWithFixture extends Document {
  [FIXTURE_ACTIVE_KEY]?: boolean;
}

export function isFixtureActive(doc: Document): boolean {
  return !!(doc as DocumentWithFixture)[FIXTURE_ACTIVE_KEY];
}

function setFixtureActive(doc: Document, active: boolean): void {
  if (active) {
    (doc as DocumentWithFixture)[FIXTURE_ACTIVE_KEY] = true;
  } else {
    delete (doc as DocumentWithFixture)[FIXTURE_ACTIVE_KEY];
  }
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
