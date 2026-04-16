/**
 * Vitest plugin that automatically registers AccessLint's afterEach annotation
 * so that running component tests produces per-story accessibility badges.
 *
 * Usage in vitest.config.ts (or the storybook vitest workspace):
 *
 *   import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
 *   import { accesslintTest } from "@accesslint/storybook-addon/vitest-plugin";
 *
 *   export default defineConfig({
 *     plugins: [storybookTest(), accesslintTest()],
 *   });
 */

export interface AccessLintTestOptions {
  /**
   * Tags-based filtering for which stories to audit.
   *
   *   accesslintTest({ tags: { skip: ["skip-accesslint"] } })
   *
   * Stories with any of the `skip` tags will not be audited.
   */
  tags?: {
    skip?: string[];
  };
}

export function accesslintTest(
  options?: AccessLintTestOptions,
): { name: string; config: () => Record<string, unknown> } {
  // Allow Vite to serve the setup file even when this package is symlinked
  // outside the consuming project's root (common during local development).
  const distDir = new URL(".", import.meta.url).pathname;

  return {
    name: "@accesslint/storybook-addon",
    config() {
      const config: Record<string, unknown> = {
        server: {
          fs: {
            allow: [distDir],
          },
        },
        test: {
          setupFiles: ["@accesslint/storybook-addon/vitest-setup"],
        },
      };

      // Pass tags configuration via Vite's define so it's available in browser
      if (options?.tags) {
        (config as Record<string, Record<string, unknown>>).define = {
          "__ACCESSLINT_SKIP_TAGS__": JSON.stringify(options.tags.skip ?? []),
        };
      }

      return config;
    },
  };
}
