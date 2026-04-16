import type { SnapshotMatcherOptions } from "./dist/matchers";

declare global {
  namespace PlaywrightTest {
    interface Matchers<R, T> {
      toBeAccessible(options?: SnapshotMatcherOptions): Promise<R>;
    }
  }
}
