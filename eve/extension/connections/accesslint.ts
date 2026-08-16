import { defineMcpClientConnection } from "eve/connections";
import { always, never, once } from "eve/tools/approval";
import extension from "../extension.js";

// The whole extension, really: AccessLint's hosted MCP connector, mounted with
// the account's own API key.
//
// This is a thin manifest over a stable remote server on purpose. The browser,
// the crawler, and the WCAG engine stay on our side; nothing here reimplements
// them, so an eve release cannot break an audit and a rule change ships without
// republishing this package.

const POLICIES = { never, once, always };

export default defineMcpClientConnection({
  url: extension.config.url,

  // What the model reads when deciding whether this connection is the right
  // instrument. It names both tiers, because picking the wrong one is the
  // common failure: a one-off page check does not need a monitored journey, and
  // a checkout that only breaks after sign-in cannot be caught by scanning a URL.
  description:
    "AccessLint: check websites against WCAG. Use `scan_page` for a one-off check of a " +
    "single page, which needs no setup. Use flows for a user journey that should stay " +
    "checked over time: draft one with `generate_flows`, dry-run it, then hand it to a " +
    "person to approve. Reports each violation with the DOM selector that carries it and " +
    "a screenshot of the step it was found on.",

  // The key is the credential. The connector verifies it against the AccessLint
  // API and resolves the account from it, so there is no tenant to select here
  // and nothing to pass but the token.
  auth: { getToken: async () => ({ token: extension.config.apiKey }) },

  approval: POLICIES[extension.config.approval](),
});
