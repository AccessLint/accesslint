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

For live-page audits, a Chrome (or Chromium) install must be discoverable on the system — the MCP auto-launches it minimized in the background. No manual `--remote-debugging-port` flag is needed. To audit an existing authenticated browser session instead, install [`chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp) (or `playwright-mcp` / `puppeteer-mcp`) alongside.

## Tools

- **audit_live** — Audit a live URL via CDP. Connects to a running Chrome debug session, or auto-launches Chrome minimized via [chrome-launcher](https://github.com/GoogleChrome/chrome-launcher) if none is reachable — no manual setup needed. Pushes `@accesslint/core` into the page through `Runtime.evaluate` (CSP-bypassing, no CDN fetch from the page). The IIFE bytes never enter the agent's conversation context. Override the endpoint with `cdp_endpoint` / `ACCESSLINT_CDP_ENDPOINT` / `ACCESSLINT_CDP_PORT` if you need to attach somewhere specific.
- **audit_browser_script** — Returns a small (~1 KB) JS snippet to paste into a browser MCP's evaluate tool. The bootstrap fetches `@accesslint/core` from `cdn.jsdelivr.net` and audits the live page. Pair with **audit_browser_collect**. Use when the user needs their **existing authenticated browser session** audited; otherwise prefer `audit_live`.
- **audit_browser_collect** — Parse the JSON the evaluate tool returned and store/format it like any other audit.
- **audit_html** — Audit an HTML string for WCAG violations. Auto-detects fragments vs full documents. Used by the `audit-react-component` prompt to audit JSX after the agent renders it to a string.
- **audit_diff** — Audit a target and diff against a baseline. With `html` / `audit_name` alone: auto-managed baseline (first call stores, subsequent calls diff). With `before: "<name>"` set: explicit baseline — diffs against the named stored audit, no auto-storage. For URL-based fix loops, run `audit_live` with a `name` to capture the "before" state, then `audit_diff({ html, before: <name> })` or `audit_diff({ audit_name, before: <name> })` to verify fixes.
- **list_rules** — List available WCAG rules with optional filters by category, level, fixability, or criterion.
- **explain_rule** — Detailed metadata for a single rule (description, WCAG criteria, fixability, browser hint, guidance).

File-on-disk audits go through `Read` + `audit_html`; for static-site CI workflows, use the [`@accesslint/cli`](https://www.npmjs.com/package/@accesslint/cli) package directly.

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

**Direct CDP (preferred): `audit_live` tool.** No setup needed — the MCP attaches to a running Chrome debug session, or auto-launches Chrome minimized in the background via `chrome-launcher` if none is reachable. It then finds or opens a tab for the URL, injects `@accesslint/core` through `Runtime.evaluate` (CSP-bypassing, no CDN fetch from the page), runs the audit, and returns a small JSON result. The IIFE bytes never pass through the agent's conversation context.

**Existing-session path: `audit-live-page` prompt.** When the user needs their **existing authenticated browser session** audited (logged-in app, specific page state) and a browser MCP is connected, use the prompt. It composes with [`chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp), `playwright-mcp`, `puppeteer-mcp`, or any MCP that exposes a navigate + evaluate-script surface. The prompt walks the agent through navigate → inject (via the small `audit_browser_script` bootstrap that fetches the IIFE from jsDelivr) → collect → map violations to source.

The `audit-react-component` prompt covers JSX/TSX components without a running app — see below.

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
