import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { parseMetaRefreshContent } from "../landmarks/constants";

export const metaRefreshNoException: Rule = {
  id: "enough-time/meta-refresh-no-exception",
  category: "enough-time",
  actRuleIds: ["bisz58"],
  wcag: ["2.2.1"],
  level: "A",
  tags: ["page-level"],
  fixability: "mechanical",
  description: "Meta refresh must not be used with a delay (no exceptions).",
  guidance:
    "Automatic page refreshes and delayed redirects disorient users. Instant redirects (delay=0) are acceptable, but any positive delay is not. Use server-side redirects instead.",
  run(doc) {
    for (const refresh of doc.querySelectorAll('meta[http-equiv="refresh"]')) {
      const content = refresh.getAttribute("content") || "";
      const parsed = parseMetaRefreshContent(content);
      if (!parsed) continue;

      if (parsed.hasValidUrl) {
        if (parsed.seconds > 0) {
          return [
            {
              ruleId: "enough-time/meta-refresh-no-exception",
              selector: getSelector(refresh),
              html: getHtmlSnippet(refresh),
              impact: "critical" as const,
              message: `Page has a ${parsed.seconds}-second meta refresh delay. Use a server-side redirect instead.`,
              fix: { type: "remove-element" } as const,
            },
          ];
        }
        // Delay 0 with valid URL is OK; this redirect wins, stop checking
        return [];
      }

      // Same-page refresh (no URL)
      if (parsed.seconds > 0) {
        return [
          {
            ruleId: "enough-time/meta-refresh-no-exception",
            selector: getSelector(refresh),
            html: getHtmlSnippet(refresh),
            impact: "critical" as const,
            message: `Page has a ${parsed.seconds}-second meta refresh delay. Remove the auto-refresh or provide user control.`,
            fix: { type: "remove-element" } as const,
          },
        ];
      }
    }
    return [];
  },
};
