import type { Rule } from "../types";
import { runAriaAttrAudit } from "./aria-attr-audit";

export const ariaValidAttr: Rule = {
  id: "aria/aria-valid-attr",
  category: "aria",
  actRuleIds: ["5f99a7"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "mechanical",
  description: "ARIA attributes must be valid (correctly spelled).",
  guidance:
    "Misspelled ARIA attributes are ignored by assistive technologies. Check the spelling against the WAI-ARIA specification. Common mistakes: aria-labeledby (should be aria-labelledby), aria-role (should be role), aria-description (valid in ARIA 1.3+).",
  run(doc) {
    return runAriaAttrAudit(doc).validAttr;
  },
};
