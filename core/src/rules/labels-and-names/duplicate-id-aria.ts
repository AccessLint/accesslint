import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { ARIA_ID_ATTRS, collectActiveIdRefs } from "./id-ref-constants";

export const duplicateIdAria: Rule = {
  id: "labels-and-names/duplicate-id-aria",
  category: "labels-and-names",
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  description: "IDs used in ARIA and label associations must be unique to avoid broken references.",
  guidance:
    "When aria-labelledby, aria-describedby, aria-controls, or label[for] reference a duplicate ID, only the first matching element is used. This breaks the intended relationship and may leave controls unnamed or descriptions missing. Ensure IDs referenced by ARIA attributes and label associations are unique throughout the document.",
  run(doc) {
    const violations = [];
    const activeRefs = collectActiveIdRefs(doc);

    // Count visible elements per referenced ID.
    // Skip elements hidden via display:none or visibility:hidden — responsive
    // sites often duplicate components for mobile/desktop with matching IDs,
    // but only one is visible at a time.
    const idCount = new Map<string, number>();
    for (const el of doc.querySelectorAll("[id]")) {
      if (!activeRefs.has(el.id)) continue;
      if (el instanceof HTMLElement) {
        if (el.style.display === "none" || el.style.visibility === "hidden") continue;
        if (el.hidden) continue;
      }
      idCount.set(el.id, (idCount.get(el.id) ?? 0) + 1);
    }

    for (const [id, count] of idCount) {
      if (count <= 1) continue;

      const els = doc.querySelectorAll(`#${CSS.escape(id)}`);

      // Find which element references this ID
      const ariaRef = doc.querySelector(
        ARIA_ID_ATTRS.map((a) => `[${a}~="${CSS.escape(id)}"]`).join(", "),
      );
      const labelRef = doc.querySelector(`label[for="${CSS.escape(id)}"]`);

      let refDesc: string | undefined;
      if (ariaRef) {
        const attr = ARIA_ID_ATTRS.find((a) => ariaRef.getAttribute(a)?.split(/\s+/).includes(id));
        if (attr) refDesc = attr;
      } else if (labelRef) {
        refDesc = "label[for]";
      }

      violations.push({
        ruleId: "labels-and-names/duplicate-id-aria",
        selector: getSelector(els[1]),
        html: getHtmlSnippet(els[1]),
        impact: "critical" as const,
        message: `Duplicate ID "${id}" referenced by ${refDesc ?? "an accessibility attribute"}.`,
        context: `First element: ${getHtmlSnippet(els[0])}${refDesc ? `\nReferenced by: ${refDesc}` : ""}`,
        fix: {
          type: "suggest",
          suggestion:
            "Change the duplicate ID to a unique value so the ARIA or label reference points to the correct element",
        } as const,
      });
    }
    return violations;
  },
};
