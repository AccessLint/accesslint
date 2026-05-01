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

- **audit_live** — Attach directly to Chrome via CDP and audit the live, JS-rendered page. Loads `@accesslint/core` into the page through `Runtime.evaluate` (CSP-bypassing, no CDN fetch from the page). Requires Chrome started with `--remote-debugging-port=9222` (or `ACCESSLINT_CDP_ENDPOINT` set). Preferred over the `audit_browser_script` + `audit_browser_collect` pair when CDP is reachable — the IIFE bytes never enter the agent's conversation context.
- **audit_browser_script** — Returns a small (~1 KB) JS snippet to paste into a browser MCP's evaluate tool. The bootstrap fetches `@accesslint/core` from `cdn.jsdelivr.net` and audits the live page. Pair with **audit_browser_collect**. Use when CDP isn't reachable directly (e.g. behind a browser MCP that owns the Chrome process).
- **audit_browser_collect** — Parse the JSON the evaluate tool returned and store/format it like any other audit.
- **audit_html** — Audit an HTML string for WCAG violations. Auto-detects fragments vs full documents. Used by the `audit-react-component` prompt to audit JSX after the agent renders it to a string.
- **audit_diff** — Audit a target and compare against an automatically-managed baseline. First call returns the audit and stores it; subsequent calls return only the diff. Accepts `html` or `audit_name` (e.g. from `audit_live`).
- **diff_html** — Lower-level: audit new HTML and diff against a previously named audit.
- **quick_check** — Pass/fail accessibility summary in one line. Accepts `html` or `audit_name`.
- **list_rules** — List available WCAG rules with optional filters by category, level, fixability, or criterion.
- **explain_rule** — Detailed metadata for a single rule (description, WCAG criteria, fixability, browser hint, guidance).

For URL-based audits and live diffing, use `audit_live({ url, name })` to capture, then `audit_diff({ audit_name: name })` or `quick_check({ audit_name: name })` to summarize. File-on-disk audits go through `Read` + `audit_html`; for static-site CI workflows, use the [`@accesslint/cli`](https://www.npmjs.com/package/@accesslint/cli) package directly.
  All audit and diff tools accept an optional `min_impact` parameter to filter results by severity. Valid values, from most to least severe: `critical`, `serious`, `moderate`, `minor`. When set, only violations at that level or above are shown.

Each violation in the audit output includes the rule ID, CSS selector, failing HTML, impact level, and — where available — a concrete fix suggestion, fixability rating, and guidance. When multiple elements break the same rule, shared metadata is printed once to keep output compact.

## Prompts

### React Component Auditing

To audit React components (`.jsx`/`.tsx`), the agent uses the `audit-react-component` prompt, which guides it through:

1. Reading the component source
2. Mentally rendering it to static HTML (acting as `renderToStaticMarkup`)
3. Passing the rendered HTML to `audit_html` with `component_mode: true`

No extra runtime dependencies are required — the agent renders the component itself based on the source code.

### Live-page auditing

For SPAs and any page whose accessibility issues only appear after JS runs, two paths are available:

**Direct CDP (preferred): `audit_live` tool.** Start Chrome with `--remote-debugging-port=9222` (or any port — set via `ACCESSLINT_CDP_ENDPOINT`/`ACCESSLINT_CDP_PORT`). The MCP attaches over the DevTools Protocol, finds or opens a tab for the URL, injects `@accesslint/core` through `Runtime.evaluate` (CSP-bypassing, no CDN fetch from the page), runs the audit, and returns a small JSON result. The 176 KB IIFE never passes through the agent's conversation context.

**Companion browser MCP (fallback): `audit-live-page` prompt.** When you can't reach Chrome over CDP — for instance, when a browser MCP owns the Chrome process and doesn't expose its debug port — use the prompt. It composes with [`chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp), `playwright-mcp`, `puppeteer-mcp`, or any MCP that exposes a navigate + evaluate-script surface. The prompt walks the agent through navigate → inject (via the small `audit_browser_script` bootstrap that fetches the IIFE from jsDelivr) → collect → map violations to source. If no browser MCP is available either, the prompt falls back to `audit_url` with a warning that SPA / computed-style coverage is lost.

`@accesslint/mcp` itself ships zero browser dependencies — the audit logic is shipped into whichever Chrome instance is reachable.

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
