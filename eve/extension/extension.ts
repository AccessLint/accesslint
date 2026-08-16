import { defineExtension } from "eve/extension";
import { z } from "zod";

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
     *
     * This is the only setting, because it is the only one read lazily. eve
     * evaluates connection modules while it builds, before any mount has bound
     * config, so anything a connection needs at definition time has to come
     * from somewhere else: see the endpoint in `connections/accesslint.ts`, and
     * the README on overriding the connection to add an approval gate.
     */
    apiKey: z.string().min(1),
  }),
});
