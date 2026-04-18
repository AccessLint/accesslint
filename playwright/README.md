# @accesslint/playwright

Accessibility assertions for Playwright. Adds a `toBeAccessible()` matcher powered by [AccessLint](https://www.accesslint.com?ref=readme_playwright) that checks for WCAG 2.2 Level A and AA violations.

## Installation

```sh
npm install --save-dev @accesslint/playwright
```

`@playwright/test` >= 1.40 is required as a peer dependency.

## Setup

Import `@accesslint/playwright` in your test file to auto-register the `toBeAccessible()` matcher:

```ts
import "@accesslint/playwright";
```

### Manual registration

If you prefer to register the matcher yourself:

```ts
import { accesslintMatchers } from "@accesslint/playwright/matchers";
import { expect } from "@playwright/test";

expect.extend(accesslintMatchers);
```

## Usage

### Page-level assertions

```ts
import { test, expect } from "@playwright/test";
import "@accesslint/playwright";

test("homepage is accessible", async ({ page }) => {
  await page.goto("https://example.com");
  await expect(page).toBeAccessible();
});
```

### Scoping to a locator

The matcher accepts a `Locator` to scope violations to a specific region of the page:

```ts
test("navigation is accessible", async ({ page }) => {
  await page.goto("https://example.com");
  await expect(page.locator("nav")).toBeAccessible();
});
```

## Options

```ts
await expect(page).toBeAccessible({
  /** Rule IDs to disable for this assertion. */
  disabledRules: ["distinguishable/color-contrast"],

  /** Audit iframe content as well as the top-level page. */
  includeFrames: true,

  /** Audit shadow DOM content. */
  includeShadowDom: true,

  /** Compare against a baseline instead of asserting zero violations. */
  snapshot: "dashboard",

  /** Where to store snapshot files. Defaults to {cwd}/accessibility-snapshots/. */
  snapshotDir: "./test/a11y-snapshots",
});
```

| Option             | Description                                                                      |
| ------------------ | -------------------------------------------------------------------------------- |
| `disabledRules`    | Rule IDs to skip for this assertion.                                             |
| `includeFrames`    | Also audit iframe content.                                                       |
| `includeShadowDom` | Also audit shadow DOM content.                                                   |
| `snapshot`         | Compare against a baseline; see [Snapshot baselines](#snapshot-baselines) below. |
| `snapshotDir`      | Directory for snapshot files.                                                    |

### Snapshot baselines

When you have existing violations that can't be fixed immediately, snapshot baselines let you track them without blocking your test suite. The first run captures a baseline; subsequent runs only fail if **new** violations appear:

```ts
await expect(page).toBeAccessible({ snapshot: "dashboard" });
```

Snapshots are stored in `accessibility-snapshots/` and should be committed to version control. Violations are identified by stable Playwright selectors (like `getByRole('img')`) so snapshots survive class-name and ID churn.

When violations are fixed, the baseline ratchets down automatically. To force-update all snapshots to the current state:

```sh
npx playwright test -u
# or
ACCESSLINT_UPDATE=1 npx playwright test
```

### Standalone function

For more control, use `accesslintAudit` directly to get the full audit result:

```ts
import { accesslintAudit } from "@accesslint/playwright";

test("check specific violations", async ({ page }) => {
  await page.goto("https://example.com");
  const result = await accesslintAudit(page);
  console.log(result.violations);
});
```

### Failure messages

When violations are found, the matcher reports each one with its rule ID, WCAG level, success criterion, description, and the selector of the offending element:

```
Expected no accessibility violations, but found 2:

  text-alternatives/img-alt [A] (1.1.1): Image element missing alt attribute.
    body > img

  distinguishable/color-contrast [AA] (1.4.3): Text must have sufficient color contrast.
    p.subtitle
```

## What it checks

The matcher runs WCAG 2.2 Level A and AA rules via [`@accesslint/core`](../core), covering images, forms, ARIA attributes, color contrast, landmarks, links, tables, document language, and more. See the [core rules table](../core/README.md#rules) for the full list.

## TypeScript

Types are included. Importing the package augments Playwright's `expect` with `toBeAccessible()` automatically.

## License

MIT
