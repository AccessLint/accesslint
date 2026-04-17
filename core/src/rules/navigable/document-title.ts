import type { Rule } from "../types";

export const documentTitle: Rule = {
  id: "navigable/document-title",
  category: "navigable",
  actRuleIds: ["2779a5"],
  wcag: ["2.4.2"],
  level: "A",
  tags: ["page-level"],
  fixability: "contextual",
  description:
    "Documents must have a <title> element to provide users with an overview of content.",
  guidance:
    "Screen reader users rely on page titles to identify and navigate between tabs/windows. Add a descriptive <title> element in <head> that summarizes the page purpose. Keep titles unique across the site, placing specific content before the site name (e.g., 'Contact Us - Acme Corp').",
  run(doc) {
    const title = doc.querySelector("title");
    if (!title || !title.textContent?.trim()) {
      // Sample visible content for title suggestion
      let textSample: string | undefined;
      const h1 = doc.querySelector("h1");
      if (h1?.textContent?.trim()) {
        textSample = `h1: "${h1.textContent.trim().slice(0, 100)}"`;
      } else if (doc.body) {
        const text = doc.body.textContent?.trim().replace(/\s+/g, " ") || "";
        if (text) textSample = `Page text: "${text.slice(0, 150)}"`;
      }
      return [
        {
          ruleId: "navigable/document-title",
          selector: "html",
          html: "<html>",
          impact: "serious" as const,
          message: title
            ? "Document <title> element is empty."
            : "Document is missing a <title> element.",
          context: textSample,
          fix: { type: "add-element", tag: "title", parent: "head", textContent: "" } as const,
        },
      ];
    }
    return [];
  },
};
