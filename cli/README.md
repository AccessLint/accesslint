# @accesslint/cli

CLI tool for auditing HTML accessibility using [@accesslint/core](https://github.com/AccessLint/accesslint/tree/main/core).

## Usage

```sh
npx -y @accesslint/cli [options] [source]
```

### Sources

```bash
# Audit a local file
npx -y @accesslint/cli index.html

# Audit a URL (requires a debuggable Chrome; start one first)
npx @accesslint/chrome ensure
npx -y @accesslint/cli https://example.com

# Pipe HTML via stdin
curl -s https://example.com | npx -y @accesslint/cli
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

## Examples

```bash
# Text output with colors
echo '<img src="photo.jpg">' | npx -y @accesslint/cli

# JSON output
npx -y @accesslint/cli --format json index.html

# Audit a fragment — page-level rules (document-title, html-has-lang) are skipped automatically
echo '<button></button>' | npx -y @accesslint/cli

# Disable specific rules
npx -y @accesslint/cli -d "landmarks/region,navigable/bypass" index.html

# Snapshot mode — capture a baseline; fail only on new violations
npx -y @accesslint/cli --snapshot main https://example.com
```
