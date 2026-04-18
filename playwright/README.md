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

  /** Include AAA-level rules (excluded by default). */
  includeAAA: true,

  /** Skip page-level rules — defaults to true for Locator targets. */
  componentMode: true,

  /** Translated rule messages (e.g. "en", "es"). */
  locale: "es",

  /** Minimum impact that causes failure. "minor" (default) fails on anything. */
  failOn: "serious",

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
| `includeAAA`       | Include AAA-level rules (excluded by default).                                   |
| `componentMode`    | Skip page-level rules. Defaults to `true` for Locator targets, `false` for Page. |
| `locale`           | Language for violation messages.                                                 |
| `failOn`           | Minimum impact to fail on: `critical`, `serious`, `moderate`, `minor`.           |
| `includeFrames`    | Also audit iframe content.                                                       |
| `includeShadowDom` | Also audit shadow DOM content.                                                   |
| `snapshot`         | Compare against a baseline; see [Snapshot baselines](#snapshot-baselines) below. |
| `snapshotDir`      | Directory for snapshot files.                                                    |

> `additionalRules` (supported by `@accesslint/jest` and `@accesslint/vitest`) isn't available here yet — rule functions can't cross the browser-page boundary. Let us know if you need it.

### Snapshot baselines

When you have existing violations that can't be fixed immediately, snapshot baselines let you track them without blocking your test suite. The first run captures a baseline; subsequent runs only fail if **new** violations appear:

```ts
await expect(page).toBeAccessible({ snapshot: "dashboard" });
```

Snapshots are stored in `accessibility-snapshots/` and should be committed to version control. Violations are identified by a tiered multi-signal matcher from [`@accesslint/heal-diff`](../heal-diff): exact Playwright locator first, then anchor attribute, then ARIA role + name, then HTML fingerprint, then relative-location. When a later tier matches the baseline auto-heals to the new selector and the test still passes; a `"healed"` event is logged to `.history.ndjson`.

Per-violation PNG screenshots are captured by default into `<snapshotName>-screenshots/` alongside the JSON. When a violation can't heal but weaker signals suggest it's the same element in a new place, the failure output prints baseline and current screenshot paths so you can confirm visually. Disable with `toBeAccessible({ snapshot: "x", visualSnapshots: false })`.

When violations are fixed, the baseline ratchets down automatically. To force-update all snapshots to the current state:

```sh
npx playwright test -u
# or
ACCESSLINT_UPDATE=1 npx playwright test
```

### Trend reports

Every create / ratchet-down / force-update / healed event appends a record to `accessibility-snapshots/.history.ndjson`. Generate a trend report from that history with [`@accesslint/report`](../report):

```sh
npx @accesslint/report --format md > a11y-report.md
npx @accesslint/report --format html --out a11y-report.html
```

The report shows a stacked chart of total violations per snapshot over time and a per-rule movement table with WCAG metadata joined from `@accesslint/core`. The sidecar file is append-only and safe to commit.

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

Failures include impact, WCAG criterion, level, selector, and — when available — remediation guidance:

```
Expected no accessibility violations, but found 2:

  [critical] text-alternatives/img-alt (WCAG 1.1.1, A) — Images must have alternate text
    selector: body > img

  [serious] distinguishable/color-contrast (WCAG 1.4.3, AA) — Text must have sufficient color contrast
    selector: p.subtitle
```

## What it checks

The matcher runs WCAG 2.2 Level A and AA rules via [`@accesslint/core`](../core), covering images, forms, ARIA attributes, color contrast, landmarks, links, tables, document language, and more. See the [core rules table](../core/README.md#rules) for the full list.

## TypeScript

Types are included. Importing the package augments Playwright's `expect` with `toBeAccessible()` automatically.

## License

MIT
