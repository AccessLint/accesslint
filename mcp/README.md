# @accesslint/mcp

MCP server for accessible agentic coding — WCAG audit tools for AI coding agents. Built on [@accesslint/core](https://github.com/AccessLint/accesslint/tree/main/core). From [AccessLint](https://www.accesslint.com).

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

## Tools

- **audit_html** — Audit an HTML string for WCAG violations. Auto-detects fragments vs full documents.
- **audit_file** — Read an HTML file from disk and audit it.
- **audit_url** — Fetch a URL and audit the returned HTML.
- **audit_browser_script** — Returns a JS snippet to paste into a browser MCP's evaluate tool. Audits the live, JS-rendered page (works for SPAs, web fonts, post-mount ARIA). Pair with **audit_browser_collect**.
- **audit_browser_collect** — Parse the JSON the evaluate tool returned and store/format it like any other audit.
- **diff_html** — Audit new HTML and diff against a previously named audit to verify fixes.
- **list_rules** — List available WCAG rules with optional filters by category, level, fixability, or criterion.
  All audit and diff tools accept an optional `min_impact` parameter to filter results by severity. Valid values, from most to least severe: `critical`, `serious`, `moderate`, `minor`. When set, only violations at that level or above are shown.

Each violation in the audit output includes the rule ID, CSS selector, failing HTML, impact level, and — where available — a concrete fix suggestion, fixability rating, and guidance. When multiple elements break the same rule, shared metadata is printed once to keep output compact.

## Prompts

### React Component Auditing

To audit React components (`.jsx`/`.tsx`), the agent uses the `audit-react-component` prompt, which guides it through:

1. Reading the component source
2. Mentally rendering it to static HTML (acting as `renderToStaticMarkup`)
3. Passing the rendered HTML to `audit_html` with `component_mode: true`

No extra runtime dependencies are required — the agent renders the component itself based on the source code.

### Live-page auditing (audit-live-page)

For SPAs and any page whose accessibility issues only appear after JS runs, the agent uses the `audit-live-page` prompt. The intended workflow:

1. The developer points the agent at a URL.
2. The agent navigates a real browser to that URL via a companion browser MCP.
3. The agent injects `@accesslint/core` and runs the audit in-page.
4. The agent maps each violation back to the source component in the codebase, then either applies the fixes directly or proposes a plan.

**Requires a companion browser MCP.** Recommended: [`chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp). Also works: `playwright-mcp`, `puppeteer-mcp`, or any MCP that exposes a navigate + evaluate-script surface. If you don't have one, the prompt falls back to `audit_url` with a warning that SPA / computed-style coverage is lost.

`@accesslint/mcp` itself ships zero browser dependencies — the audit logic is sent into whichever browser the companion MCP already drives.

## Why use this instead of prompting alone?

Without tools, the agent reasons about WCAG rules from memory. The MCP replaces that with structured output — specific rule IDs, CSS selectors, and fix suggestions — so the agent skips straight to applying fixes. This means 23% fewer output tokens per run, which translates directly to faster and cheaper completions.

Benchmarked across 25 test cases, 67 fixable violations, 3 runs each (Claude Opus):

|                      | With @accesslint/mcp | Agent alone     |
| -------------------- | -------------------- | --------------- |
| **Violations fixed** | 99.5% (200/201)      | 93.5% (188/201) |
| **Regressions**      | 1.7 / run            | 2.0 / run       |
| **Cost**             | $0.56 / run          | $0.62 / run     |
| **Duration**         | 270s / run           | 377s / run      |
| **Timeouts**         | 0 / 63 tasks         | 2 / 63 tasks    |

## License

MIT
