# @accesslint/core

[![npm version](https://img.shields.io/npm/v/@accesslint/core)](https://www.npmjs.com/package/@accesslint/core)
[![license](https://img.shields.io/npm/l/@accesslint/core)](https://github.com/AccessLint/core/blob/main/LICENSE)

Pure accessibility rule engine with zero browser dependencies. Covers WCAG 2.2 Level A and AA with best-practice rules included.

> Looking for CI? [AccessLint](https://www.accesslint.com?ref=readme_core) runs accessibility checks on every pull request and posts review comments directly on your GitHub PRs.

## Contents

- [Why @accesslint/core](#why-accesslintcore)
- [Install](#install)
- [Quick start](#quick-start)
- [API](#api)
- [Rules](#rules)
- [Compatibility](#compatibility)
- [Development](#development)

## Why @accesslint/core

- **Synchronous API** — `runAudit()` returns results immediately, no async/await needed
- **Works with happy-dom** — full support for happy-dom, jsdom, and real browsers with no polyfills or workarounds, including color contrast checks in virtual DOMs
- **Lightweight** — 43 KB gzipped (IIFE), zero runtime dependencies
- **Chunked audits** — time-budgeted processing via [`createChunkedAudit`](#createchunkedauditdoc-document-chunkedaudit) to avoid long tasks on the main thread
- **ESM, CJS, and IIFE** — tree-shakable ES modules, CommonJS for Node, and a single-file IIFE for script injection into any page

## Install

```sh
npm install @accesslint/core
```

## Quick start

### Vitest + React Testing Library

Audit a rendered component in your existing test suite:

```tsx
import { render } from "@testing-library/react";
import { runAudit } from "@accesslint/core";
import { LoginForm } from "./LoginForm";

test("LoginForm has no accessibility violations", () => {
  const { container } = render(<LoginForm />);
  const { violations } = runAudit(container.ownerDocument);
  expect(violations).toEqual([]);
});
```

### Playwright

Inject the library into the page and audit the live DOM:

```ts
// a11y.spec.ts
import { test, expect } from "@playwright/test";

const iife = require.resolve("@accesslint/core/iife");

test("page has no accessibility violations", async ({ page }) => {
  await page.goto("https://example.com");

  await page.addScriptTag({ path: iife });

  const violations = await page.evaluate(() => {
    const { runAudit } = (window as any).AccessLint;
    return runAudit(document).violations.map(
      (v: any) => ({ ruleId: v.ruleId, message: v.message, selector: v.selector, impact: v.impact })
    );
  });

  expect(violations).toEqual([]);
});
```

### Cypress

Inject the library into the page and audit the live DOM:

```js
// cypress/e2e/a11y.cy.js
Cypress.Commands.add("audit", () => {
  return cy
    .readFile("node_modules/@accesslint/core/dist/index.iife.js")
    .then((src) => {
      return cy.window().then((win) => {
        win.eval(src);
        const result = win.AccessLint.runAudit(win.document);
        return result.violations;
      });
    });
});

describe("sample.html accessibility audit", () => {
  beforeEach(() => {
    cy.visit("sample.html");
  });

  it("has no accessibility violations", () => {
    cy.audit().should("have.length", 0);
  });
});
```

## API

### `runAudit(doc: Document): AuditResult`

Run all active rules against a document and return violations.

```ts
interface AuditResult {
  url: string;
  timestamp: number;
  violations: Violation[];
  ruleCount: number;
}

interface Violation {
  ruleId: string;
  selector: string;
  html: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  message: string;
  context?: string;
  element?: Element;
}
```

### `createChunkedAudit(doc: Document): ChunkedAudit`

Create a chunked audit that processes rules in time-boxed batches to avoid long tasks.

```js
const audit = createChunkedAudit(document);

function processNext() {
  const hasMore = audit.processChunk(16); // 16ms budget per frame
  if (hasMore) requestAnimationFrame(processNext);
  else console.log(audit.getViolations());
}

processNext();
```

### `configureRules(options: ConfigureOptions)`

Customize which rules are active.

```js
import { configureRules } from "@accesslint/core";

// Disable a rule
configureRules({
  disabledRules: ["navigable/heading-order"],
});

// Include AAA-level rules (excluded by default)
configureRules({
  includeAAA: true,
});
```

### `rules`

Array of all bundled `Rule` objects.

### `getActiveRules(): Rule[]`

Returns bundled rules minus user-disabled rules, excluding AAA-level rules unless `includeAAA` is set (plus any additional rules from `configureRules()`).

### `getRuleById(id: string): Rule | undefined`

Look up a rule by its ID.

### Utilities

Helpers for building custom rules:

- `getAccessibleName(el)` — compute the accessible name of an element
- `getComputedRole(el)` — get the computed ARIA role
- `getImplicitRole(el)` — get the implicit (native) ARIA role
- `isAriaHidden(el)` — check if an element is hidden via `aria-hidden`
- `isValidRole(role)` — check if a string is a valid ARIA role
- `getAccessibleTextContent(el)` — get text content respecting `aria-hidden`
- `getSelector(el)` — generate a CSS selector for an element
- `getHtmlSnippet(el)` — get a truncated HTML snippet of an element

## Rules

Covers WCAG 2.2 Level A and AA, plus best-practice rules. One additional AAA-level rule (`distinguishable/color-contrast-enhanced`) is bundled but excluded by default; include it via `configureRules({ includeAAA: true })`.

Rule IDs match the `ruleId` field in violations and are used with `configureRules()` and `getRuleById()`.

<details>
<summary>View all rules</summary>

| Rule | Level | WCAG | Description |
| ---- | ----- | ---- | ----------- |
| `navigable/document-title` | A | 2.4.2 | Documents must have a `<title>` element. |
| `navigable/bypass` | A | — | Page must have a mechanism to bypass repeated blocks. |
| `navigable/page-has-heading-one` | A | — | Page should contain a level-one heading. |
| `labels-and-names/frame-title` | A | 4.1.2 | Frames must have an accessible name. |
| `labels-and-names/frame-title-unique` | A | 4.1.2 | Frame titles should be unique. |
| `distinguishable/meta-viewport` | AA | 1.4.4 | Viewport meta must not disable user scaling. |
| `enough-time/meta-refresh` | A | 2.2.1 | Meta refresh must not redirect or refresh automatically. |
| `enough-time/meta-refresh-no-exception` | A | 2.2.1 | Meta refresh must not be used with a delay (no exceptions). |
| `enough-time/blink` | A | 2.2.2 | `<blink>` must not be used. |
| `enough-time/marquee` | A | 2.2.2 | `<marquee>` must not be used. |
| `text-alternatives/img-alt` | A | 1.1.1 | Images must have alternate text. |
| `text-alternatives/svg-img-alt` | A | 1.1.1 | SVG images must have an accessible name. |
| `text-alternatives/input-image-alt` | A | 1.1.1, 4.1.2 | Image inputs must have alternate text. |
| `text-alternatives/image-redundant-alt` | A | — | Image alt should not duplicate adjacent text. |
| `text-alternatives/image-alt-words` | A | — | Alt text should not contain "image", "photo", etc. |
| `text-alternatives/area-alt` | A | 1.1.1, 4.1.2 | `<area>` elements must have alt text. |
| `text-alternatives/object-alt` | A | 1.1.1 | `<object>` elements must have alt text. |
| `text-alternatives/role-img-alt` | A | 1.1.1 | `role="img"` elements must have an accessible name. |
| `keyboard-accessible/server-image-map` | A | 2.1.1 | Server-side image maps must not be used. |
| `labels-and-names/form-label` | A | 4.1.2 | Form elements must have labels. |
| `labels-and-names/multiple-labels` | A | — | Form fields should not have multiple labels. |
| `labels-and-names/input-button-name` | A | 4.1.2 | Input buttons must have discernible text. |
| `adaptable/autocomplete-valid` | AA | 1.3.5 | Autocomplete attribute must use valid values. |
| `labels-and-names/label-content-mismatch` | A | — | Accessible name must contain visible text. |
| `labels-and-names/label-title-only` | A | — | Forms should not use title as the only label. |
| `keyboard-accessible/tabindex` | A | — | tabindex should not be greater than 0. |
| `keyboard-accessible/focus-order` | A | — | Focusable elements must have an appropriate role. |
| `keyboard-accessible/nested-interactive` | A | 4.1.2 | Interactive controls must not be nested. |
| `keyboard-accessible/scrollable-region` | A | 2.1.1 | Scrollable regions must be keyboard accessible. |
| `keyboard-accessible/accesskeys` | A | — | Accesskey values must be unique. |
| `keyboard-accessible/focus-visible` | AA | 2.4.7 | Elements in focus order must have a visible focus indicator. |
| `navigable/heading-order` | A | — | Heading levels should increase by one. |
| `navigable/empty-heading` | A | — | Headings must have discernible text. |
| `navigable/p-as-heading` | A | — | Paragraphs should not be styled as headings. |
| `landmarks/landmark-main` | A | — | Page should have one main landmark. |
| `landmarks/no-duplicate-banner` | A | — | No duplicate banner landmarks. |
| `landmarks/no-duplicate-contentinfo` | A | — | No duplicate contentinfo landmarks. |
| `landmarks/no-duplicate-main` | A | — | No duplicate main landmarks. |
| `landmarks/banner-is-top-level` | A | — | Banner landmark should be top-level. |
| `landmarks/contentinfo-is-top-level` | A | — | Contentinfo landmark should be top-level. |
| `landmarks/main-is-top-level` | A | — | Main landmark should be top-level. |
| `landmarks/complementary-is-top-level` | A | — | Aside landmark should be top-level. |
| `landmarks/landmark-unique` | A | — | Landmarks of the same type should have unique labels. |
| `landmarks/region` | A | — | All content should be within landmarks. |
| `adaptable/list-children` | A | 1.3.1 | `<ul>` and `<ol>` must only contain valid children. |
| `adaptable/listitem-parent` | A | 1.3.1 | `<li>` must be in a `<ul>`, `<ol>`, or `<menu>`. |
| `adaptable/dl-children` | A | 1.3.1 | `<dt>` and `<dd>` must be in a `<dl>`. |
| `adaptable/definition-list` | A | 1.3.1 | `<dl>` must only contain valid children. |
| `distinguishable/letter-spacing` | AA | 1.4.12 | Letter spacing with `!important` must be at least 0.12em. |
| `distinguishable/line-height` | AA | 1.4.12 | Line height with `!important` must be at least 1.5. |
| `distinguishable/word-spacing` | AA | 1.4.12 | Word spacing with `!important` must be at least 0.16em. |
| `adaptable/orientation-lock` | AA | 1.3.4 | Page orientation must not be restricted. |
| `aria/aria-roles` | A | 4.1.2 | ARIA role values must be valid. |
| `aria/aria-valid-attr` | A | 4.1.2 | ARIA attributes must be valid (correctly spelled). |
| `aria/aria-valid-attr-value` | A | 4.1.2 | ARIA attributes must have valid values. |
| `aria/aria-required-attr` | A | 4.1.2 | Required ARIA attributes must be present. |
| `aria/aria-allowed-attr` | A | 4.1.2 | ARIA attributes must be allowed for the role. |
| `aria/aria-allowed-role` | A | 4.1.2 | ARIA role must be appropriate for the element. |
| `adaptable/aria-required-children` | A | 1.3.1 | ARIA roles must have required child roles. |
| `adaptable/aria-required-parent` | A | 1.3.1 | ARIA roles must be in required parent roles. |
| `aria/aria-hidden-body` | A | 4.1.2 | `aria-hidden` must not be on `<body>`. |
| `aria/aria-hidden-focus` | A | 4.1.2 | `aria-hidden` regions must not contain focusable elements. |
| `labels-and-names/aria-command-name` | A | 4.1.2 | ARIA commands must have an accessible name. |
| `labels-and-names/aria-input-field-name` | A | 4.1.2 | ARIA input fields must have an accessible name. |
| `labels-and-names/aria-toggle-field-name` | A | 4.1.2 | ARIA toggle fields must have an accessible name. |
| `labels-and-names/aria-meter-name` | A | 4.1.2 | ARIA meters must have an accessible name. |
| `labels-and-names/aria-progressbar-name` | A | 4.1.2 | ARIA progressbars must have an accessible name. |
| `labels-and-names/aria-dialog-name` | A | 4.1.2 | ARIA dialogs must have an accessible name. |
| `labels-and-names/aria-tooltip-name` | A | 4.1.2 | ARIA tooltips must have an accessible name. |
| `labels-and-names/aria-treeitem-name` | A | 4.1.2 | ARIA treeitems must have an accessible name. |
| `aria/aria-prohibited-attr` | A | 4.1.2 | ARIA attributes must not be prohibited for the role. |
| `aria/presentation-role-conflict` | A | 4.1.2 | Presentation role must not conflict with focusability. |
| `aria/presentational-children-focusable` | A | 4.1.2 | Presentational children must not contain focusable content. |
| `labels-and-names/button-name` | A | 4.1.2 | Buttons must have discernible text. |
| `labels-and-names/summary-name` | A | 4.1.2 | `<summary>` elements must have an accessible name. |
| `navigable/link-name` | A | 2.4.4, 4.1.2 | Links must have discernible text. |
| `navigable/skip-link` | A | 2.4.1 | Skip links must point to a valid target. |
| `distinguishable/link-in-text-block` | A | 1.4.1 | Links in text blocks must be distinguishable by more than color. |
| `readable/html-has-lang` | A | 3.1.1 | `<html>` must have a `lang` attribute. |
| `readable/html-lang-valid` | A | 3.1.1 | `lang` on `<html>` must be valid. |
| `readable/valid-lang` | AA | 3.1.2 | `lang` attribute must have a valid value on all elements. |
| `readable/html-xml-lang-mismatch` | A | 3.1.1 | `lang` and `xml:lang` must match. |
| `adaptable/td-headers-attr` | A | 1.3.1 | Table headers references must be valid. |
| `adaptable/th-has-data-cells` | A | 1.3.1 | Table headers should be associated with data cells. |
| `adaptable/td-has-header` | A | 1.3.1 | Data cells in large tables should have associated headers. |
| `adaptable/scope-attr-valid` | A | 1.3.1 | `scope` attribute must have a valid value. |
| `adaptable/empty-table-header` | A | — | Table headers should have visible text. |
| `labels-and-names/duplicate-id-aria` | A | 4.1.2 | IDs used in ARIA must be unique. |
| `time-based-media/video-captions` | A | 1.2.2 | Videos must have captions. |
| `time-based-media/audio-transcript` | A | 1.2.1 | Audio elements should have a text alternative. |
| `distinguishable/color-contrast` | AA | 1.4.3 | Text must have sufficient color contrast. |
| `input-assistance/accessible-authentication` | AA | 3.3.8 | Password inputs must not block password managers. |
| `distinguishable/color-contrast-enhanced` | AAA | 1.4.6 | Text must have enhanced color contrast (AAA). |

</details>

## Compatibility

Tested in the following environments:

| Environment | Support |
| ----------- | ------- |
| Node.js 18+ | Yes |
| happy-dom | Yes |
| jsdom | Yes |
| Chrome / Edge | Yes |
| Firefox | Yes |
| Safari | Yes |

## Development

```sh
npm install
npm test        # 1191 tests
npm run bench   # performance benchmarks
npm run build   # produces dist/index.js, dist/index.cjs, dist/index.d.ts, dist/index.iife.js
```

Found a bug or have a suggestion? [Open an issue](https://github.com/AccessLint/core/issues).

## License

MIT
