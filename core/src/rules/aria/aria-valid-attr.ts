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
  applicable: (doc) => {
    const walker = doc.createTreeWalker(doc.documentElement, 1);
    let node: Node | null = walker.currentNode;
    while (node) {
      if (node instanceof Element) {
        for (const attr of (node as Element).attributes) {
          if (attr.name.startsWith("aria-")) return true;
        }
      }
      node = walker.nextNode();
    }
    return false;
  },
  run(doc) {
    return runAriaAttrAudit(doc).validAttr;
  },
};
