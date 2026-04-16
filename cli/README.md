# @accesslint/cli

CLI tool for auditing HTML accessibility using [@accesslint/core](https://github.com/AccessLint/core).

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

# Audit a URL
bun src/cli.ts https://example.com

# Pipe HTML via stdin
curl -s https://example.com | bun src/cli.ts
```

### Options

```
-f, --format <fmt>  Output format: text, json (default: text)
--include-aaa       Include AAA-level rules
--component-mode    Exclude page-level rules
-d, --disable <ids> Comma-separated rule IDs to disable
-h, --help          Show help
-v, --version       Show version
```

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | No violations |
| 1 | Violations found |
| 2 | Error |

## Examples

```bash
# Text output with colors
echo '<img src="photo.jpg">' | bun src/cli.ts

# JSON output
bun src/cli.ts --format json index.html

# Audit a component (skip page-level rules like document-title, html-has-lang)
bun src/cli.ts --component-mode component.html

# Disable specific rules
bun src/cli.ts -d "landmarks/region,navigable/bypass" index.html
```
