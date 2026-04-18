# @accesslint/codemod

Automated migration from [`jest-axe`](https://github.com/nickcolley/jest-axe), [`vitest-axe`](https://github.com/chaance/vitest-axe), and [`jasmine-axe`](https://github.com/fcrozatier/jasmine-axe) to their AccessLint equivalents.

## Quick start

```sh
# Migrate a jest-axe project
npx @accesslint/codemod jest-axe 'src/**/*.{test,spec}.{ts,tsx}'

# Migrate a vitest-axe project
npx @accesslint/codemod vitest-axe 'src/**/*.{test,spec}.{ts,tsx}'

# Auto-detect from package.json and run all applicable migrations
npx @accesslint/codemod auto 'src/**/*.{test,spec}.{ts,tsx}'
```

Recommended flow: run with `--dry --print` first to inspect the diff, then rerun without `--dry`.

```sh
npx @accesslint/codemod jest-axe --dry --print 'src/**/*.test.tsx'
```

## Subcommands

| Subcommand    | Source              | Target                 |
| ------------- | ------------------- | ---------------------- |
| `jest-axe`    | `jest-axe`          | `@accesslint/jest`     |
| `vitest-axe`  | `vitest-axe`        | `@accesslint/vitest`   |
| `jasmine-axe` | `jasmine-axe`       | `@accesslint/jest`     |
| `auto`        | _detected from package.json_ | _per-plugin_  |

## What's transformed

1. **Imports** are rewritten to a side-effect import of the target package:
   ```diff
   - import { axe, toHaveNoViolations } from "jest-axe";
   + import "@accesslint/jest";
   ```
   Named, aliased, namespace, and CJS `require()` forms are all recognized.

2. **`expect.extend(toHaveNoViolations)`** is removed — the side-effect import auto-registers the `toBeAccessible()` matcher. Identifier, object (`{ toHaveNoViolations }`), and spread (`{ ...toHaveNoViolations }`) forms are all handled.

3. **Two-statement pattern** is collapsed:
   ```diff
   - const results = await axe(container);
   - expect(results).toHaveNoViolations();
   + expect(container).toBeAccessible();
   ```

4. **Inline pattern** is collapsed:
   ```diff
   - expect(await axe(container)).toHaveNoViolations();
   + expect(container).toBeAccessible();
   ```

## What's _not_ transformed

- **`configureAxe(...)` globals** — there is no per-project global in AccessLint; options are per-call. When `configureAxe` is imported, the codemod keeps the source import (for `configureAxe` only), adds the target side-effect import, and prepends a TODO comment reminding you to reapply those options via `toBeAccessible({ disabledRules, failOn, ... })`.

- **axe rule IDs → AccessLint rule IDs** — `axe(container, { rules: { "color-contrast": { enabled: false } } })` is collapsed to `expect(container).toBeAccessible()` with a TODO comment. AccessLint uses namespaced rule IDs (`distinguishable/color-contrast`); see the [rule-ID mapping table](../jest/README.md#migrating-from-jest-axe) in `@accesslint/jest`'s README and reapply as `toBeAccessible({ disabledRules: ["distinguishable/color-contrast"] })`.

- **Builder-shaped axe plugins** — `@axe-core/playwright`, `@axe-core/webdriverjs`, `@axe-core/puppeteer`, and `cypress-axe` use a different API (`new AxeBuilder({ page }).analyze()` / `cy.checkA11y(...)`) and target `@accesslint/playwright`. These aren't supported in v0.1.

## Flags

| Flag                     | Default             | Meaning |
| ------------------------ | ------------------- | ------- |
| `--dry`                  | `false`             | Don't write files; report what would change |
| `--print`                | `false`             | Print transformed source to stdout (use with `--dry`) |
| `--parser=<name>`        | `tsx`               | jscodeshift parser: `babel`, `babylon`, `flow`, `ts`, `tsx` |
| `--extensions=<csv>`     | `js,jsx,ts,tsx`     | Comma-separated list of file extensions to process |
| `--verbose=<0\|1\|2>`    | `0`                 | Verbosity level |

## After running

1. Review any `TODO(accesslint-codemod):` comments — those are the spots that need a human decision (typically `configureAxe` options or per-call axe rule filters).
2. Install the target package (the codemod doesn't touch your `package.json`):
   ```sh
   npm install --save-dev @accesslint/jest    # or @accesslint/vitest
   npm uninstall jest-axe                     # or vitest-axe / jasmine-axe
   ```
3. Run your test script and confirm nothing regressed. Some assertions may produce different violation counts because AccessLint and axe are independent rule implementations — see [`@accesslint/jest`'s "What's different" notes](../jest/README.md#whats-different).

## License

MIT
