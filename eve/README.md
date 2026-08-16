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

Set `ACCESSLINT_API_KEY` in your agent's environment, such as `.env.local`.

`apiKey` is the only setting. Everything else is either fixed or overridden the
way eve overrides any contribution, which is described below.

## What ships in the box

- **A connection** to AccessLint's MCP connector, authenticated with your key.
- **An instruction fragment**, always in context, carrying the two rules below.
- **Two skills**, loaded on demand: triaging findings into a ranked set of
  fixes, and setting up monitoring for a user journey.

The mount name is the namespace. Mounted from `agent/extensions/accesslint.ts`
as above, the connection registers as `accesslint__api`, and the model calls its
tools by their qualified names, `accesslint__api__scan_page`,
`accesslint__api__generate_flows`, and the rest. It finds them through eve's
built-in `connection_search`.

## Limiting what the agent can do

Use the key's scopes, not a client-side allowlist. Scopes are enforced by
AccessLint on every call, so they hold even if the agent is talked into trying
something else:

- `read` alone lets the agent look at domains, flows, runs and violations, and
  nothing else.
- add `execute` to let it scan pages and run flows, which spends budget.
- add `draft` to let it propose flows and add domains.

A key missing a scope produces a clear refusal naming the one it needs.

## Asking a person before it calls

There is no approval gate by default, matching eve's own default for connection
tool calls. For an agent that runs unattended, one is worth adding: scans and
flow runs spend your account's budget and reach out to third-party sites.

Add it the way eve overrides any contribution, with a directory mount:

```ts
// agent/extensions/accesslint/extension.ts
import accesslint from "@accesslint/eve";

export default accesslint({ apiKey: process.env.ACCESSLINT_API_KEY! });
```

```ts
// agent/extensions/accesslint/connections/api.ts
import { defineMcpClientConnection } from "eve/connections";
import { once } from "eve/tools/approval";
import api from "@accesslint/eve/connections/api";

export default defineMcpClientConnection({ ...api, approval: once() });
```

No setting here can start monitoring in any case. That gate is human-only and
lives in the AccessLint web app.

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
