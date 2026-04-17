import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { parseMetaRefreshContent } from "../landmarks/constants";

export const metaRefresh: Rule = {
  id: "enough-time/meta-refresh",
  category: "enough-time",
  actRuleIds: ["bc659a"],
  wcag: ["2.2.1"],
  level: "A",
  tags: ["page-level"],
  fixability: "mechanical",
  description: "Meta refresh must not redirect or refresh automatically.",
  guidance:
    "Automatic page refreshes or redirects can disorient users, especially those using screen readers or with cognitive disabilities. They may lose their place or not have time to read content. If a redirect is needed, use a server-side redirect (HTTP 301/302) instead. For timed refreshes, provide user controls.",
  run(doc) {
    // Iterate through all meta refresh tags.  For URL redirects, the first
    // one with a validly-formed URL wins (the browser acts on it).
    for (const refresh of doc.querySelectorAll('meta[http-equiv="refresh"]')) {
      const content = refresh.getAttribute("content") || "";
      const parsed = parseMetaRefreshContent(content);
      if (!parsed) continue;

      if (parsed.hasValidUrl) {
        // This is the effective redirect
        if (parsed.seconds > 0 && parsed.seconds <= 72000) {
          return [
            {
              ruleId: "enough-time/meta-refresh",
              selector: getSelector(refresh),
              html: getHtmlSnippet(refresh),
              impact: "critical" as const,
              message: `Page redirects after ${parsed.seconds} seconds without warning. Use server-side redirect.`,
              fix: { type: "remove-element" } as const,
            },
          ];
        }
        // Delay 0 or > 72000 is OK; this redirect wins so stop checking
        return [];
      }

      // No valid URL = same-page refresh
      if (parsed.seconds > 0 && parsed.seconds <= 72000) {
        return [
          {
            ruleId: "enough-time/meta-refresh",
            selector: getSelector(refresh),
            html: getHtmlSnippet(refresh),
            impact: "critical" as const,
            message: `Page auto-refreshes after ${parsed.seconds} seconds. Provide user control over refresh.`,
            fix: { type: "remove-element" } as const,
          },
        ];
      }
      // seconds == 0 or > 72000 with no URL: skip, check next meta
    }

    return [];
  },
};
