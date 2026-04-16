# @accesslint/vitest

Accessibility assertions for Vitest. Adds a `toBeAccessible()` matcher powered by [AccessLint](https://www.accesslint.com?ref=readme_vitest) that checks for WCAG 2.1 Level A and AA violations.

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

If you prefer to register the matcher yourself:

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

The matcher scopes violations to descendants of the element you pass, so you can test components in isolation.

### Disabling rules

To ignore specific rules, pass `disabledRules`:

```ts
expect(container).toBeAccessible({
  disabledRules: ["color-contrast"],
});
```

### Failure messages

When violations are found, the matcher reports each one with its rule ID, WCAG level, success criterion, description, and the selector of the offending element:

```
Expected element to have no accessibility violations, but found 2:

  img-alt [A] (1.1.1): Images must have alternate text
    img

  color-contrast [AA] (1.4.3): Text must have sufficient color contrast
    p.subtitle
```

## What it checks

The matcher runs 92 WCAG 2.1 Level A and AA rules via `@accesslint/core`, covering images, forms, ARIA attributes, color contrast, landmarks, links, tables, document language, and more.

## TypeScript

Types are included. Importing the package augments Vitest's `expect` with `toBeAccessible()` automatically.

## License

MIT
