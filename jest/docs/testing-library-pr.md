# Testing Library Ecosystem PR — draft

Content for a pull request against [`testing-library/testing-library-docs`](https://github.com/testing-library/testing-library-docs) adding `@accesslint/jest` and `@accesslint/vitest` to the Ecosystem sidebar.

## Changes

Three file additions + one sidebars.js update.

### 1. `docs/ecosystem-accesslint-jest.mdx`

````mdx
---
id: ecosystem-accesslint-jest
title: accesslint/jest
---

[`@accesslint/jest`][gh] is a companion library for Testing Library that adds a
synchronous `toBeAccessible()` matcher for Jest, covering WCAG 2.2 Level A and
AA accessibility rules. Works under `jsdom` and `happy-dom` with full color
contrast support and no axe-core dependency.

```bash npm2yarn
npm install --save-dev @accesslint/jest
```
````

Register the matcher once via `setupFilesAfterEnv` in your Jest config, then
assert on any rendered element:

```jsx
import { render } from "@testing-library/react";
import { LoginForm } from "./LoginForm";

test("LoginForm is accessible", () => {
  const { container } = render(<LoginForm />);
  expect(container).toBeAccessible();
});
```

Violations are scoped to the element you pass, so components can be tested in
isolation. Options include `disabledRules`, `failOn` impact thresholds, and
snapshot baselines that auto-ratchet as you fix violations.

Check out [@accesslint/jest's documentation][gh] for setup, options, and a
migration guide from `jest-axe`.

- [@accesslint/jest on GitHub][gh]
- [@accesslint/jest on npm][npm]

[gh]: https://github.com/AccessLint/accesslint/tree/main/jest
[npm]: https://www.npmjs.com/package/@accesslint/jest

````

### 2. `docs/ecosystem-accesslint-vitest.mdx`

```mdx
---
id: ecosystem-accesslint-vitest
title: accesslint/vitest
---

[`@accesslint/vitest`][gh] is a companion library for Testing Library that adds
a synchronous `toBeAccessible()` matcher for Vitest, covering WCAG 2.2 Level A
and AA accessibility rules. Works under `jsdom` and `happy-dom` with full color
contrast support and no axe-core dependency.

```bash npm2yarn
npm install --save-dev @accesslint/vitest
````

Add it as a setup file in your Vitest config, then assert on any rendered
element:

```jsx
import { render } from "@testing-library/react";
import { LoginForm } from "./LoginForm";

test("LoginForm is accessible", () => {
  const { container } = render(<LoginForm />);
  expect(container).toBeAccessible();
});
```

Options include `disabledRules`, `failOn` impact thresholds, an opt-in audit
memoization fixture for component tests that chain multiple assertions, and
snapshot baselines that auto-ratchet as you fix violations.

- [@accesslint/vitest on GitHub][gh]
- [@accesslint/vitest on npm][npm]

[gh]: https://github.com/AccessLint/accesslint/tree/main/vitest
[npm]: https://www.npmjs.com/package/@accesslint/vitest

````

### 3. `sidebars.js`

Add the two new IDs to the `Ecosystem` category, maintaining alphabetical order:

```diff
       Ecosystem: [
+        'ecosystem-accesslint-jest',
+        'ecosystem-accesslint-vitest',
         'ecosystem-bs-jest-dom',
         'ecosystem-cli-testing-library',
         'ecosystem-eslint-plugin-jest-dom',
         'ecosystem-eslint-plugin-testing-library',
         'ecosystem-jasmine-dom',
         'ecosystem-jest-dom',
         'ecosystem-jest-native',
         'ecosystem-query-extensions',
         'ecosystem-riot-testing-library',
         'ecosystem-react-select-event',
         'ecosystem-rtl-simple-queries',
         'ecosystem-testing-library-selector',
       ],
````

(Exact ordering depends on how the current `sidebars.js` groups them — apply the same convention.)

## PR body

> **Add `@accesslint/jest` and `@accesslint/vitest` to the Ecosystem**
>
> Adds two new Ecosystem entries for the `@accesslint/*` accessibility-matcher packages. Both add a `toBeAccessible()` matcher that works with any DOM produced by Testing Library (`container`, `screen.getByRole(...)`, etc.) — React, Vue, Svelte, and Angular testing-library packages all compose directly.
>
> The libraries are synchronous, run under jsdom and happy-dom (including color contrast), and cover WCAG 2.2 Level A and AA via `@accesslint/core`.
>
> Follows the same structure as `ecosystem-jasmine-dom` and `ecosystem-jest-native`.
