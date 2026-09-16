import type { SnapshotMatcherOptions } from "@accesslint/matchers-internal";

/**
 * Public re-export for `@accesslint/vitest/matchers` — exposes the matcher
 * without registering it with `expect`. Use this when wiring the matcher
 * manually with `expect.extend()`; for auto-registration, import the default
 * entry `@accesslint/vitest` instead.
 */
export * from "@accesslint/matchers-internal/matchers";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    toBeAccessible(options?: SnapshotMatcherOptions): R;
  }
}
