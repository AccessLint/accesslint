# @accesslint/cli

CLI tool for auditing HTML accessibility using [@accesslint/core](https://github.com/AccessLint/accesslint/tree/main/core).

## Install

```
bun install
```

## Usage

```
accesslint [options] [source]
```

### Sources

```bash
# Audit a local file
bun src/cli.ts index.html

# Audit a URL (connects to a debuggable Chrome over CDP; start one first)
npx @accesslint/chrome ensure
bun src/cli.ts https://example.com

# Pipe HTML via stdin
curl -s https://example.com | bun src/cli.ts
```

### Options

```
-f, --format <fmt>  Output format: text, json (default: text)
--pretty            Pretty-print json output (default: single line)
--include-aaa       Include AAA-level rules
-d, --disable <ids> Comma-separated rule IDs to disable
-h, --help          Show help
--version           Show version
```

URL audits connect to a debuggable Chrome over CDP. Start one with
`npx @accesslint/chrome ensure`, then pass the port it reports if it is not the
default 9222.

```
-p, --port <n>        CDP port to connect to (URL audits only, default: 9222)
--host <host>         CDP host (URL audits only, default: 127.0.0.1)
--wait-for <s>        Selector or visible text to wait for before auditing (URL only)
--wait-timeout <ms>   Max ms to wait for --wait-for (default: 10000)
--attach              Only attach to an existing tab matching the URL; fail if not found
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
echo '<img src="photo.jpg">' | bun src/cli.ts

# JSON output
bun src/cli.ts --format json index.html

# Audit a component: an HTML fragment is detected automatically, so page-level
# rules (document-title, html-has-lang) are skipped
echo '<button></button>' | bun src/cli.ts

# Disable specific rules
bun src/cli.ts -d "landmarks/region,navigable/bypass" index.html
```
