import { defineExtension } from "eve/extension";
import { z } from "zod";

/** AccessLint's hosted MCP connector. Override only to point at staging. */
export const DEFAULT_URL = "https://mcp.accesslint.com/mcp";

export default defineExtension({
  config: z.object({
    /**
     * An AccessLint API key (`alk_…`), minted on the account's API keys page.
     *
     * Deliberately not prefix-validated. The connector accepts two credential
     * kinds and it is not this package's place to narrow the server's contract;
     * a credential it dislikes fails at the first tool call with a plain 401.
     *
     * The key's own scopes are the real permission boundary, and they are
     * enforced server-side on every call. An agent that should never spend the
     * account's run budget gets a `read`-only key, not a client-side allowlist.
     */
    apiKey: z.string().min(1),

    /** The connector's endpoint. Defaults to production. */
    url: z.url().default(DEFAULT_URL),

    /**
     * Whether a person signs off before the agent calls AccessLint.
     *
     * `never` matches eve's own default for connection tool calls and suits a
     * developer driving the agent directly. Prefer `once` for an agent that
     * runs unattended: scans and flow runs spend the account's budget and reach
     * out to third-party sites, so the first call in a session is worth seeing.
     *
     * No setting here can start monitoring — that gate is human-only and lives
     * in the AccessLint web app.
     */
    approval: z.enum(["never", "once", "always"]).default("never"),
  }),
});
