import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const argsSchema = {
  url: z.string().describe("URL to audit"),
  name: z
    .string()
    .optional()
    .describe("Store result under this name for later diff_html"),
  wait_for: z
    .string()
    .optional()
    .describe("Selector or text to wait for before auditing (e.g. '#main', 'Welcome')"),
  mode: z
    .enum(["plan", "fix"])
    .optional()
    .describe(
      "After auditing, either propose a plan (default) or apply fixes directly. Defaults to 'plan'.",
    ),
};

export function registerAuditLivePagePrompt(server: McpServer): void {
  server.prompt(
    "audit-live-page",
    "Audit a live URL in a real browser via a composed browser MCP, then map each violation back to the source component and propose (or apply) fixes.",
    argsSchema,
    ({ url, name, wait_for, mode }) => {
      const effectiveMode = mode ?? "plan";
      const nameArg = name ? `, name: "${name}"` : "";
      const waitStep = wait_for
        ? `\n2. **Wait for content.** Call your browser MCP's wait tool (chrome-devtools-mcp: \`wait_for\`, playwright-mcp: \`browser_wait_for\`) for: \`${wait_for}\`.\n`
        : "\n";
      const stepNum = (n: number) => (wait_for ? n + 1 : n);

      const collectArgs = name
        ? `{ raw_result: <paste the JSON>, name: "${name}" }`
        : "{ raw_result: <paste the JSON> }";

      const fixOrPlanSection =
        effectiveMode === "fix"
          ? `### ${stepNum(6)}. Apply fixes

For each violation that mapped cleanly to a component:

- Use the \`Fix\` field from the audit output as the directive (e.g. \`add-attribute alt=""\`).
- Edit the source component, not the rendered DOM.
- Group fixes that share a root cause (same component, same rule) into a single edit.
- For \`Fixability: contextual\` or \`visual\`, do not guess content — leave a \`TODO\` comment naming the rule and a one-line ask for the developer.
- For \`Fixability: mechanical\`, apply the fix directly.

After applying, summarize what was changed and what remains (anything you couldn't map or fix). If the dev server hot-reloads, suggest re-running this prompt to verify the fixes landed.`
          : `### ${stepNum(6)}. Propose a plan

Produce a tight, actionable plan grouped by component:

- One section per source component that owns one or more violations.
- Within each: list the violations (rule ID + impact + message), the proposed change (use the \`Fix\` field as the directive), and any uncertainty (\`Fixability: contextual\` items that need developer input).
- Highlight any violations that did not map to a component — they likely come from third-party markup, server-rendered shells, or markup outside the codebase.
- End with a short "next actions" list: what you'd change first, what needs developer decisions, and what to verify after.

Do not edit files yet. The developer will review the plan and ask you to apply it.`;

      const instructions = `## Audit a live page and act on it

The developer has pointed you at \`${url}\` and wants accessibility issues identified, mapped back to the source code, and ${effectiveMode === "fix" ? "fixed in place" : "turned into a plan"}.

**Requires a browser MCP** that exposes navigate + evaluate tools. Recommended: \`chrome-devtools-mcp\`. Also works: \`playwright-mcp\`, \`puppeteer-mcp\`.

If you do not have any browser MCP available, fall back to \`audit_url({ url: "${url}"${nameArg} })\` and warn the developer that SPA-rendered content, web-font contrast, and post-mount ARIA state will not be captured. Continue with steps ${stepNum(4)}+ using whatever the static audit returned.

### 1. Navigate

Call your browser MCP's navigate tool (chrome-devtools-mcp: \`navigate_page\`, playwright-mcp: \`browser_navigate\`) with \`url: "${url}"\`.
${waitStep}### ${stepNum(2)}. Get the audit script

Call \`audit_browser_script(${name ? `{ name: "${name}" }` : "{}"})\`. Use \`inject: false\` only if you have already injected the IIFE on this page in a previous call (no navigation has happened since).

### ${stepNum(3)}. Run it in the page

Call your browser MCP's evaluate tool (chrome-devtools-mcp: \`evaluate_script\`, playwright-mcp: \`browser_evaluate\`) and pass the function expression from the previous step as the \`function\` argument.

### ${stepNum(4)}. Collect

Call \`audit_browser_collect(${collectArgs})\` with the JSON the evaluate tool returned. The session token in the result is verified against the one issued in step ${stepNum(2)}.

### ${stepNum(5)}. Map violations to source components

Each violation has a CSS selector, an HTML snippet, and a rule ID. To find the responsible component:

- **Selector first.** If the selector contains a stable hook (\`[data-testid="..."]\`, \`#id\`, \`[name="..."]\`, \`[aria-label="..."]\`), grep the codebase for that hook.
- **Visible text fallback.** If the HTML snippet contains visible text, grep for that string (component files, JSX/TSX, templates).
- **Class names.** Tailwind/utility classes are usually too generic, but BEM-style or component-scoped classes often map directly.
- **Tree position.** If nothing else works, walk the selector ancestor-by-ancestor (e.g. \`main > nav > ul > li:nth-child(3) > a\`) and look for components rendering similar structure.

Build a mental table: \`{ violation, source file, source component, line if known }\`. Note any violations you couldn't map.

${fixOrPlanSection}

### Notes

- For repeat audits on the same page (e.g. before vs. after a fix), reuse the same browser session and pass \`inject: false\` to step ${stepNum(2)} to skip the ~165 KB IIFE re-injection.
- Use \`min_impact: "serious"\` on \`audit_browser_collect\` if the page has many low-severity violations and you want to focus on the high-impact ones first.
- Each violation's \`Fix\` field is a structured directive (e.g. \`add-attribute alt=""\`) — prefer it over inventing a fix from the message text.
- Each violation's \`Browser hint\` (when present) tells you which browser-tool action (screenshot, inspect, hover) would help disambiguate. Use it.
`;

      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: instructions },
          },
        ],
      };
    },
  );
}
