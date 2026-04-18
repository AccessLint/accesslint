# @accesslint/jest

[![npm version](https://img.shields.io/npm/v/@accesslint/jest)](https://www.npmjs.com/package/@accesslint/jest)
[![license](https://img.shields.io/npm/l/@accesslint/jest)](https://github.com/AccessLint/accesslint/blob/main/jest/LICENSE)

Accessibility assertions for Jest. Adds a synchronous `toBeAccessible()` matcher powered by [AccessLint](https://www.accesslint.com?ref=readme_jest) that checks for WCAG 2.2 Level A and AA violations and runs under jsdom and happy-dom.

## Installation

```sh
npm install --save-dev @accesslint/jest
```

`jest` >= 28 is required as a peer dependency.

## Setup

Register the matcher with Jest via `setupFilesAfterEnv` in your config:

```js
// jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["@accesslint/jest"],
};
```

Or import it once in an existing setup file:

```js
// jest.setup.js
import "@accesslint/jest";
```

That single import auto-registers `toBeAccessible()` on both the modern `expect` from `@jest/globals` and the legacy global `expect` used with `@types/jest`.

## Usage

Pass any DOM `Element` to `expect()` and call `toBeAccessible()`:

```ts
const container = document.createElement("div");
container.innerHTML = '<img src="photo.jpg" alt="A photo">';

expect(container).toBeAccessible();
```

Violations are scoped to descendants of the element you pass, so you can test components in isolation. When the element is not the document root, page-level rules (`html-has-lang`, `document-title`, landmarks, etc.) are skipped automatically — override with `componentMode: false` if you want them back.

## Framework recipes

Works with any DOM produced in a jsdom environment.

### React — `@testing-library/react`

```tsx
import { render } from "@testing-library/react";
import { LoginForm } from "./LoginForm";

test("LoginForm is accessible", () => {
  const { container } = render(<LoginForm />);
  expect(container).toBeAccessible();
});
```

### Vue — `@testing-library/vue`

```ts
import { render } from "@testing-library/vue";
import LoginForm from "./LoginForm.vue";

test("LoginForm is accessible", () => {
  const { container } = render(LoginForm);
  expect(container).toBeAccessible();
});
```

### Svelte — `@testing-library/svelte`

```ts
import { render } from "@testing-library/svelte";
import LoginForm from "./LoginForm.svelte";

test("LoginForm is accessible", () => {
  const { container } = render(LoginForm);
  expect(container).toBeAccessible();
});
```

### Angular — `@testing-library/angular`

```ts
import { render } from "@testing-library/angular";
import { LoginFormComponent } from "./login-form.component";

test("LoginForm is accessible", async () => {
  const { container } = await render(LoginFormComponent);
  expect(container).toBeAccessible();
});
```

The matcher accepts anything that's an `Element` — `container`, `screen.getByRole('form')`, a plain `document.createElement(...)`, or `document.body` for a full-page audit.

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
- **Force refresh** the baseline with `ACCESSLINT_UPDATE=1`.

Violation identity starts at `ruleId + selector` and falls back through a tiered multi-signal matcher powered by [`@accesslint/heal-diff`](../heal-diff):

1. Exact selector match (fast path).
2. Anchor attribute (`data-testid`, `id`, `name`, `href`, `for`, `aria-label`).
3. Computed ARIA role + accessible name.
4. HTML fingerprint (normalized outerHTML hash).
5. Relative location (nearest landmark trail), uniqueness-gated.

When a non-exact tier matches the baseline's selector auto-heals to the current one, the snapshot is rewritten, and a `"healed"` event is logged to `.history.ndjson`. The test still passes. When no tier matches but weaker signals overlap, the failure message attaches a `likely moved from:` hint so you can tell "same issue, different selector" from "genuinely new issue" at a glance.

### Trend reports

Every create / ratchet-down / force-update event appends a record to `accessibility-snapshots/.history.ndjson` alongside the baseline JSON files. Generate a trend report from that history with [`@accesslint/report`](../report):

```sh
npx @accesslint/report --format md > a11y-report.md
npx @accesslint/report --format html --out a11y-report.html
```

The report shows a stacked chart of total violations per snapshot over time, plus a per-rule movement table that joins in WCAG metadata from `@accesslint/core`. The sidecar file is append-only and safe to commit; merge conflicts on it resolve trivially by concatenating both sides.

## Migrating from `jest-axe`

```diff
- import { toHaveNoViolations, axe } from "jest-axe";
- expect.extend(toHaveNoViolations);
+ import "@accesslint/jest";

  test("form is accessible", async () => {
    const { container } = render(<Form />);
-   const results = await axe(container);
-   expect(results).toHaveNoViolations();
+   expect(container).toBeAccessible();
  });
```

### What's different

AccessLint and `jest-axe` are independent implementations of WCAG rule-checking; they make different tradeoffs. Some practical differences when running under Jest with jsdom:

- **Synchronous API** — `toBeAccessible()` returns immediately; no `await` per assertion.
- **Color contrast in virtual DOMs** — AccessLint computes color contrast from the style cascade directly, so contrast violations are detected under jsdom and happy-dom without additional configuration.
- **Independent rule engine** — rules in AccessLint are implemented from the WCAG criteria and validated against the [W3C ACT-R fixture corpus](https://act-rules.github.io/); there is no intermediate dependency on `axe-core`.
- **Built-in `failOn` impact threshold** and snapshot baselines with auto-ratchet, which have no direct equivalent in `jest-axe`.

See the [feature parity table](#feature-parity) below for a per-feature mapping.

### Feature parity

| `jest-axe`                                            | `@accesslint/jest`                                              |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `expect.extend(toHaveNoViolations)`                   | `import "@accesslint/jest"` (auto-register)                     |
| `await axe(container)` + `toHaveNoViolations()`       | `expect(container).toBeAccessible()`                            |
| `configureAxe({ rules: { id: { enabled: false } } })` | `toBeAccessible({ disabledRules: [id] })` — per-call, no global |
| Custom rules via axe's `checks`/`rules` config        | `toBeAccessible({ additionalRules: [...] })`                    |
| Filter `results.violations` manually by impact        | `failOn: "serious"` (built-in)                                  |
| (no built-in baseline)                                | `snapshot: "name"` baselines with auto-ratchet                  |

There is no global `configureAxe` equivalent — all options are per-call. If you always want the same set of disabled rules, wrap the matcher in a project helper.

<details>
<summary>Rule ID mapping (10 most common)</summary>

`disabledRules` lists migrate from axe IDs to AccessLint's namespaced IDs.

| axe-core ID (jest-axe) | AccessLint ID                    | WCAG  |
| ---------------------- | -------------------------------- | ----- |
| `image-alt`            | `text-alternatives/img-alt`      | 1.1.1 |
| `color-contrast`       | `distinguishable/color-contrast` | 1.4.3 |
| `label`                | `labels-and-names/form-label`    | 4.1.2 |
| `button-name`          | `labels-and-names/button-name`   | 4.1.2 |
| `link-name`            | `navigable/link-name`            | 2.4.4 |
| `aria-required-attr`   | `aria/aria-required-attr`        | 4.1.2 |
| `aria-valid-attr`      | `aria/aria-valid-attr`           | 4.1.2 |
| `document-title`       | `navigable/document-title`       | 2.4.2 |
| `html-has-lang`        | `readable/html-has-lang`         | 3.1.1 |
| `list`                 | `adaptable/list-children`        | 1.3.1 |

Full rule list: [@accesslint/core README](../core/README.md#rules).

</details>

### Violation shape

`jest-axe` returns axe-core's `Result` objects (nested `nodes[]` per rule). `@accesslint/jest` reports one `Violation` per offending element with a flat shape: `ruleId`, `selector`, `html`, `impact`, `message`, `context?`, `fix?`. If you relied on axe's `helpUrl` field, use AccessLint's `rule.guidance` via `getRuleById()`.

## TypeScript

Types are included. Importing the package augments both the modern `expect.Matchers` interface from `@jest/globals` and the legacy global `jest.Matchers` namespace used with `@types/jest`, so `expect(el).toBeAccessible(...)` type-checks under either setup.

## What it checks

WCAG 2.2 Level A and AA rules via [@accesslint/core](../core), covering images, forms, ARIA attributes, color contrast, landmarks, links, tables, document language, and more. See the [core rules table](../core/README.md#rules) for the full list.

## License

MIT
