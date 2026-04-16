[![npm version](https://img.shields.io/npm/v/@accesslint/storybook-addon)](https://www.npmjs.com/package/@accesslint/storybook-addon)
[![license](https://img.shields.io/github/license/AccessLint/storybook-addon)](https://github.com/AccessLint/storybook-addon/blob/main/LICENSE)

# @accesslint/storybook-addon

Catch accessibility violations in your Storybook stories as you develop. Powered by [@accesslint/core](https://www.accesslint.com/core?ref=readme_storybook).

<img height="414" alt="Storybook screenshot with alt text violation in the details of the AccessLint tab" src="https://github.com/user-attachments/assets/42bb12ee-3a07-4443-8b60-35c2c9c735a9" />


## Getting Started

```sh
npm install @accesslint/storybook-addon
```

Add the addon to your `.storybook/main.ts` (or `.storybook/main.js`):

```ts
const config = {
  addons: ["@accesslint/storybook-addon"],
};

export default config;
```

Restart Storybook and an **AccessLint** panel will appear in the addon bar. Every story is audited automatically after it renders.

Expand any violation to see the failing element, WCAG criteria, and remediation guidance. Click **Highlight** to outline the element in the preview.

## Vitest integration

If you use [`@storybook/addon-vitest`](https://storybook.js.org/docs/writing-tests/vitest-plugin), add the AccessLint plugin next to `storybookTest()` in your Vite config:

```ts
import { accesslintTest } from "@accesslint/storybook-addon/vitest-plugin";

// Inside your Storybook test project:
plugins: [
  storybookTest({ configDir: ".storybook" }),
  accesslintTest(),
],
```

This gives you:

- Per-story status dots in the sidebar (green/yellow/red)
- A test widget in the sidebar's testing module
- The `toBeAccessible()` matcher registered automatically
- Accessibility results in CI alongside your component tests

## Accessibility assertions

Use `toBeAccessible()` to make accessibility a first-class assertion in your tests and play functions.

### With the Vitest plugin

If you added `accesslintTest()` above, the matcher is already registered. Use it directly in play functions:

```ts
import { expect } from "storybook/test";

export const Default = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toBeAccessible();
  },
};
```

### Without the Vitest plugin

For play functions or standalone tests without the plugin, import the matchers entry point to register `toBeAccessible()`:

```ts
import "@accesslint/storybook-addon/matchers";
```

Then use it in a play function:

```ts
import { expect } from "storybook/test";
import "@accesslint/storybook-addon/matchers";

export const Default = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toBeAccessible();
  },
};
```

Or in a standalone Vitest/Jest test:

```ts
import "@accesslint/storybook-addon/matchers";
import { render } from "@testing-library/react";

test("LoginForm is accessible", () => {
  const { container } = render(<LoginForm />);
  expect(container).toBeAccessible();
});
```

### Disabling rules per assertion

```ts
await expect(canvasElement).toBeAccessible({
  disabledRules: ["accesslint-045"],
});
```

### Failure output

When the assertion fails, the error message lists each violation with its rule ID, WCAG criteria, conformance level, message, and the CSS selector of the failing element:

```
Expected element to have no accessibility violations, but found 2:

  accesslint-001 [A] (1.1.1): Image is missing alt text
    img[src="hero.png"]

  accesslint-012 [A] (1.3.1): Form input is missing a label
    input[type="email"]
```

### TypeScript support

Add the type reference to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@accesslint/storybook-addon/matchers"]
  }
}
```

Or add a triple-slash reference in a `.d.ts` file:

```ts
/// <reference types="@accesslint/storybook-addon/matchers" />
```

## Configuration

### Test mode

Control how violations are reported via `parameters.accesslint`:

```ts
// .storybook/preview.ts — applies to all stories
const preview = {
  parameters: {
    accesslint: {
      test: "todo", // "error" (default) | "todo" | "off"
    },
  },
};

export default preview;
```

| Mode | Behavior |
| --- | --- |
| `"error"` | Violations fail the test (default) |
| `"todo"` | Violations show as warnings — yellow sidebar dots, non-blocking in CI |
| `"off"` | Skip auditing entirely |

Override per-story:

```ts
export const Experimental = {
  parameters: {
    accesslint: { test: "off" },
  },
};
```

### Disabling rules

Disable specific rules globally in your preview file:

```ts
// .storybook/preview.ts
import { configureRules } from "@accesslint/core";

configureRules({
  disabledRules: ["accesslint-045"], // e.g. disable landmark region rule
});
```

### Skipping stories with tags

Tag individual stories or entire components with `"skip-accesslint"` to skip auditing:

```ts
// Skip a single story
export const Prototype = {
  tags: ["skip-accesslint"],
};

// Skip all stories for a component
export default {
  component: ExperimentalWidget,
  tags: ["skip-accesslint"],
};
```

With the Vitest plugin, you can also define custom skip tags:

```ts
accesslintTest({
  tags: { skip: ["skip-accesslint", "wip"] },
});
```

## Portable stories

Use AccessLint with [`composeStories`](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest) outside of Storybook (plain Vitest, Jest, or Playwright CT).

In your test setup file, pass the AccessLint annotations to `setProjectAnnotations`:

```ts
// vitest.setup.ts
import { setProjectAnnotations } from "@storybook/react";
import { enableAccessLint } from "@accesslint/storybook-addon/portable";
import * as previewAnnotations from "./.storybook/preview";

const project = setProjectAnnotations([
  previewAnnotations,
  enableAccessLint(),
]);

beforeAll(project.beforeAll);
```

Then in your tests:

```ts
import { composeStories } from "@storybook/react";
import * as stories from "./Button.stories";

const { Primary } = composeStories(stories);

test("Primary button is accessible", async () => {
  await Primary.run();
  // AccessLint afterEach runs automatically via the annotations
});
```

## API reference

### Exports

| Entry point | Description |
| --- | --- |
| `@accesslint/storybook-addon` | Main addon registration (manager + preview) |
| `@accesslint/storybook-addon/vitest-plugin` | `accesslintTest()` Vite plugin for Vitest integration |
| `@accesslint/storybook-addon/vitest-setup` | Setup file registered by the Vite plugin |
| `@accesslint/storybook-addon/matchers` | `toBeAccessible()` custom matcher |
| `@accesslint/storybook-addon/portable` | `enableAccessLint()` for portable stories |
| `@accesslint/storybook-addon/preview` | Preview annotations (afterEach hook) |

### `accesslintTest(options?)`

Vite plugin that registers AccessLint's `afterEach` annotation and the `toBeAccessible()` matcher for Vitest story tests.

| Option | Type | Description |
| --- | --- | --- |
| `tags.skip` | `string[]` | Stories with any of these tags will not be audited |

### `parameters.accesslint`

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `test` | `"todo" \| "error" \| "off"` | `"error"` | Controls how violations are reported |
| `disable` | `boolean` | `false` | Set to `true` to skip auditing (same as `test: "off"`) |

### `toBeAccessible(options?)`

Custom matcher for asserting an element has no accessibility violations.

| Option | Type | Description |
| --- | --- | --- |
| `disabledRules` | `string[]` | Rule IDs to skip for this assertion |

### `enableAccessLint()`

Returns AccessLint's preview annotations for use with `setProjectAnnotations` in portable stories setups.

## Compatibility

| Addon version | Storybook version |
| ------------- | ----------------- |
| 0.7.x         | 10.x              |
| 0.6.x         | 10.x              |

## Issues

Please report issues in the [AccessLint core repository](https://github.com/AccessLint/core/issues).

## License

MIT
