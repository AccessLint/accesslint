# @accesslint/playwright

Accessibility assertions for Playwright. Adds a `toBeAccessible()` matcher powered by [AccessLint](https://www.accesslint.com?ref=readme_playwright) that checks for WCAG 2.1 Level A and AA violations.

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

### Disabling rules

To ignore specific rules, pass `disabledRules`:

```ts
await expect(page).toBeAccessible({
  disabledRules: ["accesslint-092"],
});
```

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

  accesslint-011 [A] (1.1.1): Image element missing alt attribute.
    body > img

  accesslint-092 [AA] (1.4.3): Text must have sufficient color contrast.
    p.subtitle
```

## What it checks

The matcher runs 93 WCAG 2.1 Level A and AA rules via `@accesslint/core`, covering images, forms, ARIA attributes, color contrast, landmarks, links, tables, document language, and more.

## TypeScript

Types are included. Importing the package augments Playwright's `expect` with `toBeAccessible()` automatically.

## License

MIT
