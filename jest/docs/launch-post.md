---
title: "Introducing `@accesslint/jest`: synchronous accessibility assertions"
summary: "@accesslint/jest is a Jest adapter that runs WCAG 2.2 checks against any Testing-Library-rendered element — synchronously, under jsdom or happy-dom, with no dependency on axe-core. Here's what it changes, what it doesn't, and how to migrate."
---

# Introducing `@accesslint/jest`: synchronous accessibility assertions

Accessibility testing has a strong culture in the JavaScript ecosystem — largely thanks to `axe-core` and the `jest-axe` wrapper, which have introduced a lot of teams to catching WCAG violations in CI. [`@accesslint/jest`](https://www.npmjs.com/package/@accesslint/jest) is a newer adapter that targets the same goal with a different shape: a **synchronous** `toBeAccessible()` matcher that runs WCAG 2.2 Level A and AA checks against any DOM your Testing Library render produces.

It's built on [`@accesslint/core`](https://www.npmjs.com/package/@accesslint/core), an independent rule engine written directly from the WCAG criteria and validated against the [W3C ACT-R fixture corpus](https://act-rules.github.io/). There's no intermediate dependency on `axe-core`.

If you're migrating from `jest-axe`, you can skip straight to the one-liner:

```sh
npx @accesslint/codemod jest-axe 'src/**/*.test.{ts,tsx}'
```

That's the full migration in most projects. Read on for what the new matcher does, what changes in your test code, and where to look after the codemod finishes.

## What changes under Jest

Three things are different once `@accesslint/jest` is in your setup file.

### 1. The matcher is synchronous

`toBeAccessible()` runs the audit and returns immediately. No `await`, no intermediate `results` variable.

```ts
// Before
import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

test("login form is accessible", async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// After
import "@accesslint/jest";

test("login form is accessible", () => {
  const { container } = render(<LoginForm />);
  expect(container).toBeAccessible();
});
```

Some teams find this easier to thread through snapshot assertions and error-path tests, where mixing `async` with the rest of a synchronous assertion chain adds friction.

### 2. Color contrast runs under jsdom and happy-dom

`@accesslint/core` computes color contrast directly from the style cascade. That means contrast violations fire in a virtual DOM without a real browser or additional configuration. A component with low-contrast text fails the matcher at assertion time:

```tsx
test("caption has sufficient contrast", () => {
  const { container } = render(<p style={{ color: "#888", background: "#fff" }}>Details below</p>);
  expect(container).toBeAccessible();
});
```

```
Expected element to have no accessibility violations, but found 1:

  [serious] distinguishable/color-contrast (WCAG 1.4.3, AA) — Insufficient color contrast ratio of 3.54:1 (required 4.5:1).
    selector: div > p
    context: foreground: #888888 rgb(136, 136, 136), background: #ffffff rgb(255, 255, 255), ratio: 3.54:1, required: 4.5:1
    fix: Change the text color or background color so the contrast ratio meets 4.5:1. Current foreground is #888888, background is #ffffff.
    guidance: WCAG SC 1.4.3 requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (>=24px or >=18.66px bold). Increase the contrast by darkening the text or lightening the background, or vice versa.
```

### 3. Impact thresholds and snapshot baselines are built in

Two options are built into the matcher directly.

`failOn` accepts a minimum impact — `critical`, `serious`, `moderate`, or `minor` — and filters out anything below it. Useful for projects adopting the matcher incrementally or gating CI at a policy line:

```ts
expect(container).toBeAccessible({ failOn: "serious" });
```

`snapshot: "name"` locks the current violations as a baseline. Subsequent runs pass as long as no **new** violations appear; fixed ones ratchet the baseline down automatically:

```ts
expect(container).toBeAccessible({ snapshot: "login-form" });
```

The baseline lives at `accessibility-snapshots/login-form.json` — commit it alongside your tests. It's a pragmatic way to adopt the matcher on a legacy codebase: you get regression protection immediately, and the baseline shrinks as the backlog does.

## Migrating from `jest-axe`

The codemod handles the common patterns:

```sh
npx @accesslint/codemod jest-axe 'src/**/*.test.{ts,tsx}' --dry --print
```

Run with `--dry --print` first to inspect the diff. A typical test file transforms to:

```diff
- import { axe, toHaveNoViolations } from "jest-axe";
- expect.extend(toHaveNoViolations);
+ import "@accesslint/jest";

  test("form is accessible", async () => {
    const { container } = render(<Form />);
-   const results = await axe(container);
-   expect(results).toHaveNoViolations();
+   expect(container).toBeAccessible();
  });
```

Three things the codemod doesn't do automatically, and where to handle them:

- **`configureAxe({ rules: ... })` globals.** There's no per-project global in AccessLint — options are passed per call. The codemod leaves `configureAxe` imports in place and adds a `TODO(accesslint-codemod):` comment reminding you to reapply those settings via `toBeAccessible({ disabledRules, failOn, ... })` where you need them.
- **Per-call rule filters with axe IDs.** `axe(container, { rules: { "color-contrast": { enabled: false } } })` collapses to `expect(container).toBeAccessible()` with a TODO. AccessLint uses namespaced IDs — remap to `toBeAccessible({ disabledRules: ["distinguishable/color-contrast"] })`. The [jest package README](https://github.com/AccessLint/accesslint/tree/main/jest#migrating-from-jest-axe) includes a mapping table for the ten most common rules.
- **Swapping the devDep.** The codemod doesn't touch `package.json` — run `npm install --save-dev @accesslint/jest && npm uninstall jest-axe` after you're happy with the diff.

Full transform rules and flags are documented in the [`@accesslint/codemod` README](https://github.com/AccessLint/accesslint/tree/main/codemod).

## What doesn't change

Plenty stays the same, which is the point — this is a drop-in adapter, not a rewrite of how you test:

- **WCAG 2.2 Level A and AA coverage** is the goal both implementations aim at. AccessLint and axe-core are independent rule engines; expect rule outputs to agree on most violations and differ in count or phrasing on others.
- **Testing Library compatibility is identical.** `toBeAccessible()` accepts any `Element` — `container`, `screen.getByRole('form')`, `document.body`, or a plain `document.createElement(...)`. React, Vue, Svelte, and Angular Testing Library all work the same way they did before.
- **Jest setup shape is the same.** `testEnvironment: "jsdom"` and a `setupFilesAfterEnv` entry — exactly one line added to your config.
- **TypeScript is supported out of the box.** The package augments both the modern `@jest/globals` `expect.Matchers` interface and the legacy global `jest.Matchers` namespace, so `expect(el).toBeAccessible(...)` type-checks with either setup.

Violation counts may differ from what `axe-core` reports on the same markup — that's expected from independent implementations of the same specifications, not a bug. Treat those differences as a point to investigate rather than a regression signal.

## Install and first test

For a new project, or to try the matcher alongside an existing test file:

```sh
npm install --save-dev @accesslint/jest
```

```js
// jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["@accesslint/jest"],
};
```

```tsx
// LoginForm.test.tsx
import { render } from "@testing-library/react";
import { LoginForm } from "./LoginForm";

test("LoginForm is accessible", () => {
  const { container } = render(<LoginForm />);
  expect(container).toBeAccessible();
});
```

That's the whole getting-started story. The [package README](https://github.com/AccessLint/accesslint/tree/main/jest) has deeper coverage of options, snapshot baselines, and framework-specific recipes for Vue / Svelte / Angular.

## What's next

A few things are either in flight or on the near-term roadmap:

- A listing on [the Testing Library ecosystem page](https://testing-library.com/docs/) is pending review ([PR #1535](https://github.com/testing-library/testing-library-docs/pull/1535)).
- Equivalent matchers ship for Vitest ([`@accesslint/vitest`](https://www.npmjs.com/package/@accesslint/vitest)) and Playwright ([`@accesslint/playwright`](https://www.npmjs.com/package/@accesslint/playwright)) — the three share a runner-agnostic matcher core, so the API and failure-message format are consistent across stacks.
- The fastest way to shape the v0.x series is [filing an issue](https://github.com/AccessLint/accesslint/issues) when you find a rough edge. Rule-coverage gaps, migration patterns the codemod doesn't cover, framework integrations that aren't documented — all welcome.

If `@accesslint/jest` ends up in your Jest setup, let us know what you hit.
