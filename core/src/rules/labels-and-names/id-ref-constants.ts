export const ARIA_ID_ATTRS = [
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "aria-owns",
  "aria-flowto",
];

/**
 * Collect all IDs referenced by ARIA attributes and `label[for]` in the document.
 */
export function collectActiveIdRefs(doc: Document): Set<string> {
  const activeRefs = new Set<string>();

  for (const el of doc.querySelectorAll(
    "[aria-labelledby], [aria-describedby], [aria-controls], [aria-owns], [aria-flowto]",
  )) {
    for (const attr of ARIA_ID_ATTRS) {
      const val = el.getAttribute(attr);
      if (val)
        val.split(/\s+/).forEach((id) => {
          if (id) activeRefs.add(id);
        });
    }
  }

  for (const label of doc.querySelectorAll("label[for]")) {
    const forVal = label.getAttribute("for");
    if (forVal?.trim()) activeRefs.add(forVal.trim());
  }

  return activeRefs;
}
