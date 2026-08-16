import accesslint from "@accesslint/eve";

// The key is never checked: `scripts/run-evals.mjs` points the extension at a
// local stub through ACCESSLINT_MCP_URL, and the stub ignores the bearer. That
// is deliberate — these evals grade the model, so they must not spend an
// account's budget, reach a third-party site, or need a credential to run.
export default accesslint({ apiKey: process.env.ACCESSLINT_API_KEY ?? "alk_eval" });
