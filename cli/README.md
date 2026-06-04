# @accesslint/cli

CLI tool for auditing HTML accessibility using [@accesslint/core](https://github.com/AccessLint/accesslint/tree/main/core).

```sh
npx -y @accesslint/cli scan [source] [options]   # audit a URL, HTML file, or stdin
npx -y @accesslint/cli init                       # scaffold accesslint.config.json
```

> **v0.8 — breaking change.** The audit now lives under the `scan` subcommand:
> run `accesslint scan <source>` (previously `accesslint <source>`).

## `scan` — audit

### Sources

```bash
# Audit a local file
npx -y @accesslint/cli scan index.html

# Audit a URL (requires a debuggable Chrome; start one first)
npx @accesslint/chrome ensure
npx -y @accesslint/cli scan https://example.com

# Pipe HTML via stdin
curl -s https://example.com | npx -y @accesslint/cli scan
```

### Options

```
-f, --format <fmt>    Output format: text, json (default: text)
--pretty              Pretty-print json output (default: single line)
--include-aaa         Include AAA-level rules
-d, --disable <ids>   Comma-separated rule IDs to disable
-h, --help            Show help
--version             Show version
```

URL audits connect to a debuggable Chrome over CDP. Start one with
`npx @accesslint/chrome ensure`, then pass the port if it differs from the default.

```
-p, --port <n>          CDP port (URL audits only, default: 9222)
--host <host>           CDP host (URL audits only, default: 127.0.0.1)
-s, --selector <sel>    CSS selector to scope the audit; auto-waits for element (URL only)
--wait-for <s>          Selector or visible text to wait for before auditing (URL only)
--wait-timeout <ms>     Max ms to wait for --wait-for or --selector (default: 10000)
--attach                Only attach to an existing tab matching the URL; fail if not found
--snapshot <name>       Snapshot name — fail only on violations new since baseline (URL only)
--snapshot-dir <dir>    Directory for snapshot files (default: ./accessibility-snapshots)
--update-snapshot       Force-overwrite the snapshot baseline (also: ACCESSLINT_UPDATE=1)
```

### Exit codes

| Code | Meaning          |
| ---- | ---------------- |
| 0    | No violations    |
| 1    | Violations found |
| 2    | Error            |

### Examples

```bash
# Text output with colors
echo '<img src="photo.jpg">' | npx -y @accesslint/cli scan

# JSON output
npx -y @accesslint/cli scan --format json index.html

# Audit a fragment — page-level rules (document-title, html-has-lang) are skipped automatically
echo '<button></button>' | npx -y @accesslint/cli scan

# Disable specific rules
npx -y @accesslint/cli scan -d "landmarks/region,navigable/bypass" index.html

# Snapshot mode — capture a baseline; fail only on new violations
npx -y @accesslint/cli scan --snapshot main https://example.com
```

## `init` — scaffold config

```bash
npx -y @accesslint/cli init        # interactive, framework-aware defaults
npx -y @accesslint/cli init --yes  # accept the defaults (CI / non-interactive)
```

Writes `accesslint.config.json` with named audit **targets**, plus a gitignored
`accesslint.config.local.json` overlay for prod/staging. Defaults are inferred from your
`package.json`: the framework sets the dev port (an explicit `-p`/`--port` in the `dev` script
wins). No port scanning. A Storybook target is **not** added by default — pass `--storybook`
(or opt in at the prompt when Storybook is detected); its URL is pre-filled when found.

```jsonc
// accesslint.config.json
{
  "default": "dev",
  "targets": {
    "dev": { "url": "http://localhost:5173" },
    "storybook": { "url": "http://localhost:6006" },
  },
}
```

Each target carries the same options as `scan` flags (`url`, `selector`, `waitFor`,
`includeAAA`, `disable`, `snapshotDir`), so a target is a fully-specified audit context.

```
-y, --yes               Accept framework-aware defaults without prompting
--dev-url <url>         Override the inferred dev URL
--storybook             Add a Storybook target
--skip-storybook        Do not add a Storybook target
--prod-url <url>        Prod/staging URL (written to the gitignored overlay)
--default <name>        Name of the default target (default: dev)
--force                 Overwrite an existing accesslint.config.json
--cwd <dir>             Project directory (default: current directory)
```
