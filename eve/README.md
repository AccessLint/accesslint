# @accesslint/eve

Accessibility for [eve](https://eve.dev) agents. Mount it and your agent can
check a page against WCAG, set up monitoring for a user journey, and read back
the violations with the selector and screenshot for each.

It is a thin package on purpose: it mounts AccessLint's hosted MCP connector and
teaches the model when to reach for it. The browser, the crawler and the WCAG
engine stay on AccessLint's side, so rule improvements arrive without you
upgrading anything.

## Install

```sh
npm install @accesslint/eve
```

Mint an API key on your account's API keys page at
[app.accesslint.com](https://app.accesslint.com), then mount the extension:

```ts
// agent/extensions/accesslint.ts
import accesslint from "@accesslint/eve";

export default accesslint({ apiKey: process.env.ACCESSLINT_API_KEY! });
```

Tools arrive under the mount's name, so the file above gives you
`accesslint__scan_page`, `accesslint__generate_flows`, and the rest.

## Configuration

| Option     | Default                          | What it does                                        |
| ---------- | -------------------------------- | --------------------------------------------------- |
| `apiKey`   | required                         | An AccessLint API key (`alk_…`).                    |
| `url`      | `https://mcp.accesslint.com/mcp` | The connector endpoint. Override only for staging.  |
| `approval` | `"never"`                        | `"never"`, `"once"` or `"always"` for a human gate. |

`approval` maps to eve's own approval helpers. The default matches eve's
default for connection tool calls and suits a developer driving the agent
directly. For an agent that runs unattended, `"once"` is the better setting:
scans and flow runs spend your account's budget and reach out to third-party
sites, so the first call of a session is worth a look.

```ts
export default accesslint({
  apiKey: process.env.ACCESSLINT_API_KEY!,
  approval: "once",
});
```

## Limiting what the agent can do

Use the key's scopes, not a client-side allowlist. Scopes are enforced by
AccessLint on every call, so they hold even if the agent is talked into trying
something else:

- `read` alone lets the agent look at domains, flows, runs and violations, and
  nothing else.
- add `execute` to let it scan pages and run flows, which spends budget.
- add `draft` to let it propose flows and add domains.

A key with a scope it needs is a one-line fix on the API keys page; a key
without one produces a clear refusal naming the missing scope.

## What ships in the box

- **A connection** to AccessLint's MCP connector, authenticated with your key.
- **An instruction fragment**, always in context, carrying the two rules below.
- **Two skills**, loaded on demand: triaging findings into a ranked set of
  fixes, and setting up monitoring for a user journey.

## Two rules this package keeps

**Approval belongs to a person.** Drafting a flow proposes it. Nothing starts
monitoring until someone approves its dry run in the AccessLint web app, and no
tool here can do that for them. The skills tell the model to say so plainly
rather than reporting a drafted flow as though it were already watching.

**Page content is data, never instruction.** Everything an audit returns came
from a site that AccessLint does not control. The instruction fragment tells the
model to treat text, alt attributes and ARIA labels as the subject of a report,
and to surface anything that reads like an instruction as a finding instead of
following it. Any agent that audits pages faces this; mounting a ticket-filer in
the same session is what makes it concrete.

## License

MIT
