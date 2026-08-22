# Testing guide

This repo has three test environments. The right one depends on what you're testing. Most new tests should go in the first bucket.

## 1. Unit tests — `happy-dom`

**Location:** `core/src/**/*.test.ts` (excluding `.browser.test.ts` and `bench/memory.test.ts`)
**Runs via:** `bun run test` (or `bun run --filter=@accesslint/core test`)
**Environment:** `happy-dom` — a fast, mostly-compliant DOM in Node.

This is the default home for rule tests. Happy-dom is fast enough to run 800+ tests in under 3 seconds. Use it for anything that only needs basic DOM APIs — element creation, attributes, querySelector, ARIA reflection.

Tests are parameterized where possible (e.g. `core/src/rules/landmarks/is-top-level.test.ts` covers four rules). Use `describe.each` when adding a rule that follows an existing shape.

## 2. Browser tests — real Chromium via Vitest

**Location:** `core/src/**/*.browser.test.ts`
**Runs via:** `bun run --filter=@accesslint/core test:browser`
**Environment:** Vitest's browser mode with `@vitest/browser-playwright` + headless Chromium.

Use this when the rule depends on behavior happy-dom doesn't implement: computed styles, layout boxes, real CSS inheritance, `getComputedStyle(pseudo)`, scroll overflow. Examples: color contrast, line-height, letter-spacing, scrollable regions.

Browser tests share helpers via `core/src/integration/vitest-browser-helpers.ts` (`setContent`, `resetDocument`).

## 3. ACT conformance — Playwright

**Location:** `core/src/act/act-browser.spec.ts` (+ downloaded fixtures)
**Runs via:** `npx turbo run act --filter=@accesslint/core` (full pipeline) or `bun run --filter=@accesslint/core act:test` (just the Playwright spec)
**Environment:** Playwright in a separate process, driving Chromium against the [W3C ACT-R fixture corpus](https://act-rules.github.io/).

This is how we score conformance against the published rule set. Don't add rule tests here — add them at layer 1 or 2, and let ACT act as the downstream conformance gate.

The turbo pipeline has three stages: `act:fixtures` (download + process), `act:test` (run the Playwright spec, emits the EARL report), `act:check` (enforce the 80% conformance gate). Turbo handles ordering and caching automatically; rule source changes invalidate `act:fixtures`.

## Memory / perf benchmarks

`core/src/bench/memory.test.ts` runs under a separate vitest project so we can pass `--expose-gc` to Node. Invoke with `bun run --filter=@accesslint/core test:memory`. Don't add normal tests here.

## Matcher packages

`@accesslint/vitest` and `@accesslint/playwright` both publish a `toBeAccessible()` matcher. Each has its own test suite (co-located `*.test.ts`), typically with `@accesslint/core` mocked so the matcher logic is tested in isolation. These packages are thin wrappers over `runAudit()` from core — new rule behavior should be tested against core directly, not through the matcher packages.

## CLI and MCP

- `@accesslint/cli` has smoke tests for `audit.ts` and `inline-css.ts`. `ssrf-guard` and `safe-fetch` are covered transitively by `mcp/tests/security.test.ts` (which imports them directly from `@accesslint/cli/ssrf-guard` and `@accesslint/cli/safe-fetch`), so don't duplicate.
- `@accesslint/mcp` has tests in `mcp/tests/` covering tools, security, and output formatting. They run as the `unit` vitest project and mock `node:child_process`, so they check the argv the MCP builds and nothing about whether the binaries run.

### Tests that spawn real processes

Two failures shipped from the gap between "the argv is right" and "the binaries work": issue #4 and AccessLint/skills#8, the same Windows path-separator bug six weeks apart. Both needed a process to reproduce, and neither unit suite starts one.

- `scripts/smoke-scan.mjs` launches a managed Chrome, pipes HTML through `accesslint scan --stdin`, and asserts the engine loaded and reported the expected violation. Run it with `node scripts/smoke-scan.mjs` after a build.
- `mcp/tests/cli-runner.integration.test.ts` runs the MCP's own `ensureChrome` and `scanHtml` against the real CLI and Chrome binaries. It is the `integration` vitest project, kept out of `bun run test` because it needs built dists and a browser.

Both run on `ubuntu-latest` **and** `windows-latest` in CI. Keep the Windows leg: the win32 coverage in `cli/src/iife-source.test.ts` injects `path.win32` against a hand-written string, which is why it passed all through the bug it was meant to catch.

## Source audits — `@accesslint/source`

**Location:** `source/src/**/*.test.ts`
**Runs via:** `bun run --filter=@accesslint/source test`
**Environment:** Node with happy-dom installed by hand: `source/src/test-dom.ts` copies a shared `Window`'s properties onto `globalThis` and hands out fresh `Document`s, because the package's own API takes a `document` rather than assuming a global one.

Three suites: `audit.test.ts` holds the worked cases and the corpus regressions (one named test per false-positive class found by hand-triage, under "what the corpus taught"); `jsx/render.test.ts` covers JSX-to-HTML rendering; `invariants.test.ts` states the zero-false-positive contract as properties over component shapes crossed with mutations that introduce unknowns. A new "source never guesses" behavior belongs in `audit.test.ts`; rule behavior still belongs in core.

## Quick reference

| Task                                       | Command                                             |
| ------------------------------------------ | --------------------------------------------------- |
| All unit tests across the repo             | `bun run test`                                      |
| Core unit tests with coverage              | `bun run --filter=@accesslint/core test:coverage`   |
| Core browser tests (requires Chromium)     | `bun run --filter=@accesslint/core test:browser`    |
| Core memory/perf benchmarks                | `bun run --filter=@accesslint/core test:memory`     |
| ACT conformance against W3C fixture corpus | `npx turbo run act --filter=@accesslint/core`       |
| CLI end-to-end against a real Chrome       | `node scripts/smoke-scan.mjs`                       |
| MCP against the real CLI and Chrome bins   | `bun run --filter=@accesslint/mcp test:integration` |

## Writing a new rule test: which file?

- Rule logic works in DOM-only terms (attributes, roles, tree shape) → `core/src/rules/<category>/<rule>.test.ts` (unit).
- Rule depends on CSS / computed style / layout → `core/src/integration/<rule>.browser.test.ts` (browser).
- You're mapping a new rule to an ACT identifier → add to `core/src/act/act-mapping.ts` and let the existing `act-browser.spec.ts` pick it up.
