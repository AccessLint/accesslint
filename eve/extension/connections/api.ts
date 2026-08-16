import { defineMcpClientConnection } from "eve/connections";
import extension from "../extension.js";

// The whole extension, really: AccessLint's hosted MCP connector, reached with
// the account's own API key.
//
// This is a thin manifest over a stable remote server on purpose. The browser,
// the crawler, and the WCAG engine stay on our side; nothing here reimplements
// them, so an eve release cannot break an audit and a rule change ships without
// republishing this package.

/** AccessLint's hosted MCP connector. */
export const DEFAULT_URL = "https://mcp.accesslint.com/mcp";

// Read from the environment rather than from mount config, because eve
// evaluates this module while it builds the consumer's agent, and config is
// bound only at the mount. Reading `extension.config` here would throw during
// their build. Only AccessLint's own staging needs this; customers never set it.
const url = process.env.ACCESSLINT_MCP_URL ?? DEFAULT_URL;

export default defineMcpClientConnection({
  url,

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

  // The key is the whole credential: no client secret, no tenant selector. The
  // connector resolves the account from the token itself. Read inside the
  // callback, which is what makes mount config usable here at all.
  auth: { getToken: async () => ({ token: extension.config.apiKey }) },

  // No approval gate by default, matching eve's own default for connection tool
  // calls. A consumer who wants one overrides this connection from a directory
  // mount; the README shows the shape. Nothing here can start monitoring in any
  // case: that gate is human-only and lives in the AccessLint web app.
});
