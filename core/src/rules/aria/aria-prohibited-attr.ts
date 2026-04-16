import type { Rule } from "../types";
import { runAriaAttrAudit } from "./aria-attr-audit";

export const ariaProhibitedAttr: Rule = {
  id: "aria/aria-prohibited-attr",
  category: "aria",
  actRuleIds: ["kb1m8s"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "mechanical",
  description: "ARIA attributes must not be prohibited for the element's role.",
  guidance: "Some ARIA roles prohibit certain attributes. For example, roles like 'none', 'presentation', 'generic', and text-level roles (code, emphasis, strong) prohibit aria-label and aria-labelledby because naming is not supported for these roles. Remove the prohibited attributes or change the role.",
  run(doc) {
    return runAriaAttrAudit(doc).prohibitedAttr;
  },
};
