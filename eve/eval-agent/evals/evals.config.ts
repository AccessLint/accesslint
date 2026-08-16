import { defineEvalConfig } from "eve/evals";

export default defineEvalConfig({
  // Judged assertions grade prose ("did it say the flow is waiting for a
  // person"), which is exactly the kind of claim a substring match gets wrong
  // in both directions.
  judge: { model: process.env.EVAL_JUDGE_MODEL ?? "anthropic/claude-sonnet-5" },
});
