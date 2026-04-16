import type { DeclarativeRule } from "../types";
import { compileDeclarativeRule } from "../engine";

const ariaHiddenBodySpec: DeclarativeRule = {
  id: "aria/aria-hidden-body",
  selector: 'body[aria-hidden="true"]',
  check: { type: "selector-exists" },
  impact: "critical",
  message: "aria-hidden='true' on body hides all content from assistive technologies.",
  description: "aria-hidden='true' must not be present on the document body.",
  wcag: ["4.1.2"],
  level: "A",
  tags: ["page-level"],
  fixability: "mechanical",
  guidance: "Setting aria-hidden='true' on the body element hides all page content from assistive technologies, making the page completely inaccessible to screen reader users. Remove aria-hidden from the body element. If you need to hide content temporarily (e.g., behind a modal), use aria-hidden on specific sections instead.",
  skipAriaHidden: false,
};

export const ariaHiddenBody = compileDeclarativeRule(ariaHiddenBodySpec);
