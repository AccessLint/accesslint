import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";
import { TOOL } from "./shared.ts";

// The flow cap is the paywall on this surface, so a refusal is a sales moment
// rather than an error. It only works if the model voices the numbers and the
// link instead of swallowing them, and if it stops rather than retrying the
// journeys that were skipped.
export default defineEval({
  description:
    "Relays a flow-cap refusal with its numbers and upgrade link, and does not retry the skipped journeys.",
  async test(t) {
    await t.send(
      "Create monitoring for three journeys on shop.test: checkout, signing up for an " +
        "account, and contacting support.",
    );

    t.succeeded();
    t.calledTool(TOOL.generateFlows);

    // Deterministic half: the link the API handed back has to survive into the
    // answer, because a cap the person cannot act on is just a dead end.
    t.check(t.reply, includes("app.accesslint.com/accounts/acme?plan=pro"));

    t.judge.autoevals
      .closedQA(
        "The reply explains that some journeys were not created because the account's flow cap " +
          "was reached, and says which ones. It points the reader at upgrading rather than " +
          "presenting the skipped journeys as failures or as something it will retry.",
      )
      .label("voices the cap")
      .gate(0.7);

    // Retrying a refusal in a loop just spends the rest of the allowance.
    t.calledTool(TOOL.generateFlows, { count: 1 }).label("did not retry the refusal");
  },
});
