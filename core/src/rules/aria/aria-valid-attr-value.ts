import type { Rule } from "../types";
import { runAriaAttrAudit } from "./aria-attr-audit";

export const ariaValidAttrValue: Rule = {
  id: "aria/aria-valid-attr-value",
  category: "aria",
  actRuleIds: ["6a7281"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  description: "ARIA attributes must have valid values.",
  guidance:
    "Each ARIA attribute accepts specific value types. Boolean attributes (aria-hidden, aria-disabled) accept only 'true' or 'false'. Tristate attributes (aria-checked, aria-pressed) also accept 'mixed'. Token attributes (aria-live, aria-autocomplete) accept predefined values. ID reference attributes (aria-labelledby, aria-describedby) must reference existing element IDs.",
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
    return runAriaAttrAudit(doc).validAttrValue;
  },
};
