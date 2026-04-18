# Testing Library Ecosystem PR — draft

Content for a pull request against [`testing-library/testing-library-docs`](https://github.com/testing-library/testing-library-docs) adding `@accesslint/jest` and `@accesslint/vitest` to the Ecosystem sidebar.

## Files to add / change

1. `docs/ecosystem-accesslint-jest.mdx` (new)
2. `docs/ecosystem-accesslint-vitest.mdx` (new)
3. `sidebars.js` (append two entries to the `Ecosystem` category)

## 1. `docs/ecosystem-accesslint-jest.mdx`

````
---
id: ecosystem-accesslint-jest
title: accesslint/jest
---

[`@accesslint/jest`][gh] is a companion library for Testing Library that adds a
synchronous `toBeAccessible()` matcher for Jest, covering WCAG 2.2 Level A and
AA accessibility rules. Works under `jsdom` and `happy-dom`.

​```bash npm2yarn
npm install --save-dev @accesslint/jest
​```

Register the matcher once via `setupFilesAfterEnv` in your Jest config, then
assert on any rendered element:

​```jsx
import { render } from '@testing-library/react'
import { LoginForm } from './LoginForm'

test('LoginForm is accessible', () => {
  const { container } = render(<LoginForm />)
  expect(container).toBeAccessible()
})
​```

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

> **Note:** the `​` characters before the triple backticks above are zero-width-space markers to prevent nested-fence mangling in this draft — remove them when copying the content into the real `.mdx` file.

## 2. `docs/ecosystem-accesslint-vitest.mdx`

````
---
id: ecosystem-accesslint-vitest
title: accesslint/vitest
---

[`@accesslint/vitest`][gh] is a companion library for Testing Library that adds
a synchronous `toBeAccessible()` matcher for Vitest, covering WCAG 2.2 Level A
and AA accessibility rules. Works under `jsdom` and `happy-dom`.

​```bash npm2yarn
npm install --save-dev @accesslint/vitest
​```

Add it as a setup file in your Vitest config, then assert on any rendered
element:

​```jsx
import { render } from '@testing-library/react'
import { LoginForm } from './LoginForm'

test('LoginForm is accessible', () => {
  const { container } = render(<LoginForm />)
  expect(container).toBeAccessible()
})
​```

Options include `disabledRules`, `failOn` impact thresholds, an opt-in audit
memoization fixture for component tests that chain multiple assertions, and
snapshot baselines that auto-ratchet as you fix violations.

- [@accesslint/vitest on GitHub][gh]
- [@accesslint/vitest on npm][npm]

[gh]: https://github.com/AccessLint/accesslint/tree/main/vitest
[npm]: https://www.npmjs.com/package/@accesslint/vitest
````

## 3. `sidebars.js`

The existing `Ecosystem` array isn't alphabetical — it grows by addition. Appending the two new entries at the end is the least invasive change:

```diff
       Ecosystem: [
         'ecosystem-jest-dom',
         'ecosystem-bs-jest-dom',
         'ecosystem-jest-native',
         'ecosystem-react-select-event',
         'ecosystem-eslint-plugin-testing-library',
         'ecosystem-eslint-plugin-jest-dom',
         'ecosystem-riot-testing-library',
         'ecosystem-jasmine-dom',
         'ecosystem-query-extensions',
         'ecosystem-rtl-simple-queries',
         'ecosystem-testing-library-selector',
         'ecosystem-cli-testing-library',
+        'ecosystem-accesslint-jest',
+        'ecosystem-accesslint-vitest',
       ],
```

## PR metadata

**Title:** `Add @accesslint/jest and @accesslint/vitest to the Ecosystem`

**Body:**

> Adds two new Ecosystem entries for the `@accesslint/*` accessibility-matcher packages. Both provide a `toBeAccessible()` matcher that works with any DOM produced by Testing Library (`container`, `screen.getByRole(...)`, etc.) — the same matcher composes across `@testing-library/react`, `@testing-library/vue`, `@testing-library/svelte`, and `@testing-library/angular`.
>
> The libraries are synchronous, run under `jsdom` and `happy-dom`, and cover WCAG 2.2 Level A and AA via [`@accesslint/core`](https://github.com/AccessLint/accesslint/tree/main/core).
>
> Follows the same page structure as `ecosystem-jasmine-dom` and `ecosystem-jest-native`.

## How to submit

From a working directory of your choice:

```sh
gh repo fork testing-library/testing-library-docs --clone
cd testing-library-docs
git checkout -b add-accesslint-ecosystem

# Create the two .mdx files (content above, without the zero-width-space markers)
# Edit sidebars.js per the diff above

git add docs/ecosystem-accesslint-jest.mdx docs/ecosystem-accesslint-vitest.mdx sidebars.js
git commit -m "Add @accesslint/jest and @accesslint/vitest to the Ecosystem"
git push -u origin add-accesslint-ecosystem

gh pr create \
  --repo testing-library/testing-library-docs \
  --title "Add @accesslint/jest and @accesslint/vitest to the Ecosystem" \
  --body-file - <<'EOF'
Adds two new Ecosystem entries for the `@accesslint/*` accessibility-matcher packages. Both provide a `toBeAccessible()` matcher that works with any DOM produced by Testing Library (`container`, `screen.getByRole(...)`, etc.) — the same matcher composes across `@testing-library/react`, `@testing-library/vue`, `@testing-library/svelte`, and `@testing-library/angular`.

The libraries are synchronous, run under `jsdom` and `happy-dom`, and cover WCAG 2.2 Level A and AA via [`@accesslint/core`](https://github.com/AccessLint/accesslint/tree/main/core).

Follows the same page structure as `ecosystem-jasmine-dom` and `ecosystem-jest-native`.
EOF
```

You can also do this through the GitHub web UI — fork the repo, edit the three files in the branch editor, and open the PR from there.
