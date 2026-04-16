import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const argsSchema = {
  path: z.string().describe("Path to the React component file (.jsx or .tsx)"),
};

export function registerAuditReactComponentPrompt(server: McpServer): void {
  server.prompt(
    "audit-react-component",
    "Render a React component to HTML and audit it for accessibility violations",
    argsSchema,
    ({ path }) => {
      const instructions = `## Audit a React component for accessibility

### Step 1: Read the component

Read the source file at \`${path}\` and any sub-components it imports.

### Step 2: Render to HTML

Act as \`renderToStaticMarkup\`: mentally execute the component and produce the HTML string it would render. Follow these rules:

- **JSX attributes**: \`className\` → \`class\`, \`htmlFor\` → \`for\`, \`tabIndex\` → \`tabindex\`
- **Expressions**: resolve ternaries, \`&&\`, \`.map()\` using literal/default values
- **Style objects**: convert to inline CSS strings (e.g. \`{{ color: 'red' }}\` → \`style="color: red"\`)
- **Event handlers**: omit \`onClick\`, \`onChange\`, \`onSubmit\`, etc.
- **Sub-components**: expand them inline recursively
- **Fragments** (\`<></>\`): produce no wrapper element
- **Self-closing HTML tags**: use \`<img />\`, \`<input />\`, \`<br />\`, etc.

If the component requires props, use realistic example values.

### Step 3: Audit the HTML

Pass your rendered HTML to the \`audit_html\` tool:

\`\`\`
audit_html({ html: "<your rendered HTML>" })
\`\`\`
`;

      return {
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: instructions },
          },
        ],
      };
    }
  );
}
