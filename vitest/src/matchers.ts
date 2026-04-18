/**
 * Public re-export for `@accesslint/vitest/matchers` — exposes the matcher
 * without registering it with `expect`. Use this when wiring the matcher
 * manually with `expect.extend()`; for auto-registration, import the default
 * entry `@accesslint/vitest` instead.
 */
export * from "@accesslint/matchers-internal/matchers";
