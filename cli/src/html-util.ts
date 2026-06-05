/**
 * True if the HTML looks like a fragment/component rather than a full document
 * (no doctype or <html> tag), so page-level rules can be skipped.
 */
export function isHTMLFragment(html: string): boolean {
  const prefix = html.slice(0, 1000);
  return !(/<!doctype\s/i.test(prefix) || /<html[\s>]/i.test(prefix));
}
