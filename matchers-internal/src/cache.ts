/**
 * Per-document audit cache. Used by matcher packages that opt into fixture-style
 * reuse: when a test body runs multiple `toBeAccessible()` assertions against
 * the same DOM, the runAudit() result can be computed once and shared.
 *
 * The cache is stored on the Document via Symbol-keyed properties, so it's
 * runner-agnostic. Vitest plugs into it via a `test.extend` fixture; Jest
 * consumers may wire a beforeEach/afterEach pair if they want the same reuse.
 */
import type { Violation } from "@accesslint/core";

export interface A11yFixture {
  /**
   * Drop any cached audits for the current document — call after mutating
   * the DOM between assertions to force a fresh audit on the next matcher.
   */
  refresh(): void;
}

type Cache = Map<string, Violation[]>;

const CACHE_KEY = Symbol.for("accesslint.audit-cache");

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
 * whether to reuse cached audits — we only cache when a fixture has
 * explicitly opted in for this test.
 */
const FIXTURE_ACTIVE_KEY = Symbol.for("accesslint.fixture-active");

interface DocumentWithFixture extends Document {
  [FIXTURE_ACTIVE_KEY]?: boolean;
}

export function isFixtureActive(doc: Document): boolean {
  return !!(doc as DocumentWithFixture)[FIXTURE_ACTIVE_KEY];
}

export function setFixtureActive(doc: Document, active: boolean): void {
  if (active) {
    (doc as DocumentWithFixture)[FIXTURE_ACTIVE_KEY] = true;
  } else {
    delete (doc as DocumentWithFixture)[FIXTURE_ACTIVE_KEY];
  }
}
