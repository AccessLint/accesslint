# @accesslint/vitest

Accessibility assertions for Vitest. Adds a `toBeAccessible()` matcher powered by [AccessLint](https://www.accesslint.com?ref=readme_vitest) that checks for WCAG 2.2 Level A and AA violations.

## Installation

```sh
npm install --save-dev @accesslint/vitest
```

`vitest` >= 2.0 is required as a peer dependency.

## Setup

Add `@accesslint/vitest` as a setup file in your Vitest config:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["@accesslint/vitest"],
  },
});
```

This automatically registers the `toBeAccessible()` matcher.

### Manual registration

```ts
import { accesslintMatchers } from "@accesslint/vitest/matchers";
import { expect } from "vitest";

expect.extend(accesslintMatchers);
```

## Usage

Pass any DOM `Element` to `expect()` and call `toBeAccessible()`:

```ts
const container = document.createElement("div");
container.innerHTML = '<img src="photo.jpg" alt="A photo">';

expect(container).toBeAccessible();
```

Violations are scoped to descendants of the element you pass, so you can test components in isolation. When the element is not the document root, page-level rules (`html-has-lang`, `document-title`, landmarks, etc.) are skipped automatically — override with `componentMode: false` if you want them back.

## Options

```ts
expect(container).toBeAccessible({
  /** Rule IDs to disable for this assertion. */
  disabledRules: ["distinguishable/color-contrast"],

  /** Additional rules to run on top of the built-in set. */
  additionalRules: [myCompiledDeclarativeRule],

  /** Include AAA-level rules (excluded by default). */
  includeAAA: true,

  /** Skip page-level rules — defaults to true for non-root elements. */
  componentMode: true,

  /** Translated rule messages and guidance (e.g. "en", "es"). */
  locale: "es",

  /** Minimum impact that causes failure. "minor" (default) fails on anything. */
  failOn: "serious",

  /** Compare against a baseline instead of asserting zero violations. */
  snapshot: "login-form",

  /** Where to store snapshot files. Defaults to {cwd}/accessibility-snapshots/. */
  snapshotDir: "./test/a11y-snapshots",
});
```

### Failure messages

Failures include impact, WCAG criterion, level, selector, optional context, suggested fix, and remediation guidance:

```
Expected element to have no accessibility violations, but found 2:

  [critical] text-alternatives/img-alt (WCAG 1.1.1, A) — Images must have alternate text
    selector: img
    fix: add-attribute alt=""
    guidance: Decorative images should have alt=""; informative images should describe content.

  [serious] distinguishable/color-contrast (WCAG 1.4.3, AA) — Text must have sufficient color contrast
    selector: p.subtitle
```

## Snapshot baselines

Lock in the current accessibility state of a component and fail only on **new** violations. Useful when adopting AccessLint in a legacy codebase.

```ts
expect(container).toBeAccessible({ snapshot: "login-form" });
```

- **First run** creates `accessibility-snapshots/login-form.json` and passes.
- **Subsequent runs** fail if any new violation appears beyond the baseline.
- **Ratchet-down** — when only fixed violations are detected (none added), the baseline updates automatically.
- **Force refresh** the baseline with `ACCESSLINT_UPDATE=1` or Vitest's `-u` / `--update` flag.

Violation identity is `ruleId + getSelector(v.element)`. Because the matcher runs in happy-dom / jsdom with no browser, the selector is a tag-path rather than an ARIA-role selector — baselines are more sensitive to DOM refactors than the browser-based Playwright equivalent.

## Audit memoization (opt-in fixture)

By default every `toBeAccessible()` call runs a fresh audit. For component tests that chain multiple assertions against the same DOM state, import the fixture to reuse one audit across assertions:

```ts
import { test } from "@accesslint/vitest/fixture";
import { expect } from "vitest";

test("Form", ({ a11y }) => {
  render(<Form />);
  a11y.refresh(); // snapshot current DOM state

  // both assertions reuse one runAudit() call
  expect(screen.getByRole("form")).toBeAccessible();
  expect(screen.getByRole("button")).toBeAccessible();
});
```

Call `a11y.refresh()` after any DOM mutation that should be re-audited.

## TypeScript

Types are included. Importing the package augments Vitest's `expect` with `toBeAccessible()` automatically.

## What it checks

94 WCAG 2.2 Level A and AA rules via `@accesslint/core`, covering images, forms, ARIA attributes, color contrast, landmarks, links, tables, document language, and more.

## License

MIT
