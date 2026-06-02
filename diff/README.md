# @accesslint/diff

Diff a set of routes' accessibility violations between two running builds —
a **baseline** (e.g. `main`/merge-base) and a **candidate** (e.g. PR head) —
and report only what the candidate changed: new violations introduced,
violations fixed, and a hidden pre-existing count.

It drives a single debuggable Chrome over CDP (see `@accesslint/chrome`),
warming each origin once and auditing routes through a pool of reusable tabs.
Comparison uses `@accesslint/matchers-internal`'s tiered snapshot diff, so
selector drift between builds is matched rather than reported as churn. The
audit engine and violation-identity mapping are shared with `@accesslint/cli`
(`@accesslint/cli/cdp-audit`), so baseline and candidate identities are
byte-identical.

## CLI

```sh
# Launch a debuggable Chrome first:
npx @accesslint/chrome ensure

npx @accesslint/diff \
  --baseline-url http://127.0.0.1:8801 \
  --candidate-url http://127.0.0.1:8802 \
  --routes routes.json \
  --url-template '/app.html/component/{route}?screenshot=true' \
  --ready-selector '.ScreenshotRenderer' \
  --port 9222 \
  --concurrency 4 \
  --out report.md
```

`routes.json` is a JSON array of route keys (or a newline-delimited file).
`{route}` is URL-encoded into `--url-template` unless `--no-encode` is passed.
Exit code is `1` when new violations are found, else `0`.

### Sharding

Split the routes across CI runners with `--num-shards N --shard-index i`
(round-robin). Each shard writes a partial report; merge them however your CI
prefers (each run's JSON/markdown is independent).

## API

```ts
import { auditRoutesDiff, renderMarkdown } from "@accesslint/diff";

const report = await auditRoutesDiff({
  baselineUrl: "http://127.0.0.1:8801",
  candidateUrl: "http://127.0.0.1:8802",
  routes: ["Button", "Card"],
  urlTemplate: (route) => `/app.html/component/${route.toLowerCase()}?screenshot=true`,
  readySelector: ".ScreenshotRenderer",
  port: 9222,
  concurrency: 4,
});

console.log(renderMarkdown(report, "main"));
```
