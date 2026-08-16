import { defineAgent } from "eve";

// The model under test. Evals grade whether the extension's skills and
// instructions steer it, so this is the knob to change when asking "does the
// guidance still hold on a different model".
export default defineAgent({
  model: process.env.EVAL_MODEL ?? "anthropic/claude-fable-5",
});
