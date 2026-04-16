import type { DeclarativeRule } from "../types";
import { compileDeclarativeRule } from "../engine";

const tabindexSpec: DeclarativeRule = {
  id: "keyboard-accessible/tabindex",
  selector: "[tabindex]",
  check: { type: "attribute-value", attribute: "tabindex", operator: ">", value: 0 },
  impact: "serious",
  message: "Element has tabindex=\"{{value}}\" which disrupts tab order.",
  description: "Elements should not have tabindex greater than 0, which disrupts natural tab order.",
  wcag: [],
  level: "A",
  tags: ["best-practice"],
  fixability: "mechanical",
  guidance: "Positive tabindex values force elements to the front of the tab order regardless of DOM position, creating unpredictable navigation for keyboard users. Use tabindex='0' to add elements to the natural tab order, or tabindex='-1' to make elements programmatically focusable but not in tab order. Rely on DOM order for tab sequence.",
  fix: { type: "set-attribute", attribute: "tabindex", value: "0" },
};

export const tabindex = compileDeclarativeRule(tabindexSpec);
