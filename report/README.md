# @accesslint/report

Generate trend reports from [`@accesslint/jest`](../jest), [`@accesslint/vitest`](../vitest), and [`@accesslint/playwright`](../playwright) snapshot history.

Those packages append one NDJSON record to `accessibility-snapshots/.history.ndjson` every time a baseline is created, ratcheted down, or force-updated. This tool reads that sidecar and emits a report showing how violations have trended over time.

## Usage

```sh
# Markdown (default) — good for PR comments
npx @accesslint/report > a11y-report.md

# Single-file HTML with an SVG chart per snapshot
npx @accesslint/report --format html --out a11y-report.html

# Raw JSON for downstream tooling
npx @accesslint/report --format json

# Filter to a single snapshot
npx @accesslint/report --snapshot login-form

# Point at a non-default directory
npx @accesslint/report --dir ./test/a11y-snapshots
```

## What's in the report

- **Summary** — totals for events, snapshots, added/removed violations, and the observed window.
- **Per-snapshot timeline** — an event log plus a stacked-area chart (HTML only) of total violations over time.
- **Rule movement** — which rules appeared and were fixed across the history, joined to WCAG level + criterion from [`@accesslint/core`](../core).

## Limits

- The sidecar only records events from runs that _wrote_ the snapshot file (created / ratchet / force-update). Passing runs that matched the baseline leave no trace — they're visible in your CI logs, not here.
- Events are classified by what the matcher saw, not by git intent. A `force-update` that adds violations means someone ran with `ACCESSLINT_UPDATE=1` or `-u`; the report surfaces that so regressions don't disappear silently.
- Rule metadata lookups against `@accesslint/core` only succeed for built-in rules. Custom rules passed via `additionalRules` show up as `level: "unknown"` with empty WCAG.

## Programmatic API

```ts
import { loadAllHistory, aggregate, emitMarkdown } from "@accesslint/report";

const records = loadAllHistory("./accessibility-snapshots");
const report = aggregate(records);
console.log(emitMarkdown(report));
```

## License

MIT
