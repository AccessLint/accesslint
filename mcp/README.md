# @accesslint/mcp

MCP server for accessible agentic coding — WCAG audit tools for AI coding agents. Built on [@accesslint/core](https://github.com/AccessLint/accesslint/tree/main/core), [@accesslint/cli](https://www.npmjs.com/package/@accesslint/cli), and [@accesslint/chrome](https://www.npmjs.com/package/@accesslint/chrome). From [AccessLint](https://www.accesslint.com).

This server is a thin adapter: it holds no Chrome, CDP, or audit engine of its own. Live-page audits shell out to the `@accesslint/chrome` and `@accesslint/cli` binaries (the same path the AccessLint skills use); HTML-string audits run the `@accesslint/cli` engine in-process. The server exposes those as MCP tools and formats the results for an agent.

## Setup

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "accesslint": {
      "command": "npx",
      "args": ["@accesslint/mcp"]
    }
  }
}
```

For live-page audits, `audit_live` ensures a debuggable Chrome via `@accesslint/chrome`: it attaches to one already serving the CDP discovery API, or launches a fresh **headless** one in the background — no manual `--remote-debugging-port` flag needed. A system Chrome/Chromium (found via `CHROME_PATH` or a platform search) is used when present; set `ACCESSLINT_CHROME_DOWNLOAD=1` to fall back to a managed Chrome for Testing build when none is installed.

## Tools

- **audit_live** — Audit a live URL via CDP. Ensures a debuggable Chrome (auto-launching one headless if none is reachable — no manual setup needed), then runs `@accesslint/core` against the live DOM. CSP-bypassing. Optional `selector` scopes the audit to one element; `wait_for` gates the audit until a selector or text appears. Override the endpoint with `port` / `host` (or `ACCESSLINT_CDP_PORT`) to attach somewhere specific.
- **audit_html** — Audit an HTML string for WCAG violations (in-process JSDOM). Auto-detects fragments vs full documents; pass `component_mode` to force fragment handling. Used by the `audit-react-component` prompt to audit JSX after the agent renders it to a string.
- **list_rules** — List available WCAG rules with optional filters by category, level, fixability, or criterion.
- **explain_rule** — Detailed metadata for a single rule (description, WCAG criteria, fixability, browser hint, guidance).

File-on-disk audits go through `Read` + `audit_html`. For static-site CI workflows, diffing against a baseline, and snapshot-based regression gates, use the [`@accesslint/cli`](https://www.npmjs.com/package/@accesslint/cli) package directly (`accesslint scan <file-or-url>`, `--snapshot`) or the AccessLint `scan` / `diff` skills.

All audit tools accept an optional `min_impact` parameter to filter by severity. Valid values, from most to least severe: `critical`, `serious`, `moderate`, `minor` — only violations at that level or above are shown. They also accept `rules` / `wcag` allow-lists (run only the listed rule IDs / WCAG criteria) and `format: "compact"` for one-line-per-violation output.

Each violation in the output includes the rule ID, CSS selector, failing HTML, impact level, and — where available — a fixability rating, browser hint, and remediation guidance. When multiple elements break the same rule, shared metadata is printed once to keep output compact. Live-DOM audits against React dev builds attach a `Source: <file>:<line> (Symbol)` pointer per violation via React DevTools fibers.

## Prompts

### React Component Auditing

To audit React components (`.jsx`/`.tsx`) without a running app, the agent uses the `audit-react-component` prompt, which guides it through:

1. Reading the component source
2. Mentally rendering it to static HTML (acting as `renderToStaticMarkup`)
3. Passing the rendered HTML to `audit_html`

No extra runtime dependencies are required — the agent renders the component itself based on the source code, and `audit_html` auto-detects the fragment.

## Why use this instead of prompting alone?

Without tools, the agent reasons about WCAG rules from memory. The MCP replaces that with structured output — specific rule IDs, CSS selectors, and fix suggestions — so the agent skips straight to applying fixes. This means fewer output tokens per run, which translates directly to faster and cheaper completions.

Benchmarked across 25 test cases, 67 fixable violations, 3 runs each (Claude Opus):

|                      | With @accesslint/mcp | Agent alone     |
| -------------------- | -------------------- | --------------- |
| **Violations fixed** | 99.5% (200/201)      | 93.5% (188/201) |
| **Regressions**      | 1.7 / run            | 2.0 / run       |
| **Cost**             | $0.56 / run          | $0.62 / run     |
| **Duration**         | 270s / run           | 377s / run      |
| **Timeouts**         | 0 / 63 tasks         | 2 / 63 tasks    |

_Measured against the v0.8.x in-process architecture. The structured-output advantage (fix rate, tokens) carries over to the current subprocess design; absolute timings will differ._

## License

MIT
