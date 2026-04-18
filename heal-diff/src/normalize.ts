/**
 * HTML + hashing utilities for building signal values.
 *
 * No DOM dependency: operates on HTML strings. Suitable for node and
 * browser environments. The accesslint matcher feeds `getHtmlSnippet`
 * output (capped at 200 chars) into `normalizeHtml`, then hashes the
 * result to produce `htmlFingerprint`.
 */

import { createHash } from "node:crypto";

/** Attributes removed entirely during normalization. */
const DROP_ATTRS = new Set(["class", "style"]);

/** IDs matching these patterns are treated as generated and dropped. */
const GENERATED_ID_PATTERNS: RegExp[] = [
  /^:r\d+:$/, // React useId
  /^[a-f0-9]{8,}$/i, // long hex (emotion, uuid fragments)
  /^[a-z0-9_-]+-[a-f0-9]{6,}$/i, // prefix + hash suffix
];

function isGeneratedId(value: string): boolean {
  return GENERATED_ID_PATTERNS.some((p) => p.test(value));
}

interface AttrPair {
  name: string;
  value: string;
}

const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

function parseAttributes(attrText: string): AttrPair[] {
  const pairs: AttrPair[] = [];
  let match: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrText)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    pairs.push({ name, value });
  }
  return pairs;
}

function normalizeAttributes(attrText: string): string {
  const pairs = parseAttributes(attrText)
    .filter((a) => !DROP_ATTRS.has(a.name))
    .filter((a) => !(a.name === "id" && isGeneratedId(a.value)))
    .filter((a) => {
      if (a.name === "aria-labelledby" || a.name === "aria-describedby") {
        return !a.value.split(/\s+/).every(isGeneratedId);
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return pairs.map((a) => (a.value === "" ? a.name : `${a.name}="${a.value}"`)).join(" ");
}

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*)?)\s*(\/?)>/g;

/**
 * Produce a stable form of an HTML snippet by lowercasing tag/attribute
 * names, dropping churny attributes (class, style, generated ids),
 * sorting remaining attributes, truncating per-node text to 64 chars,
 * and collapsing whitespace. Input is typically capped at 200 chars by
 * callers via `getHtmlSnippet`.
 */
export function normalizeHtml(html: string): string {
  // Rewrite each tag
  const withNormalizedTags = html.replace(TAG_RE, (_, closing: string, tag: string, attrs: string, self: string) => {
    const lower = tag.toLowerCase();
    const attrPart = attrs.trim();
    const normalizedAttrs = attrPart ? normalizeAttributes(attrPart) : "";
    const attrSegment = normalizedAttrs ? ` ${normalizedAttrs}` : "";
    const selfClose = self ? "/" : "";
    return `<${closing}${lower}${attrSegment}${selfClose}>`;
  });

  // Split into tag / text segments and truncate text runs.
  const parts: string[] = [];
  let cursor = 0;
  const splitRe = /<[^>]+>/g;
  let m: RegExpExecArray | null;
  while ((m = splitRe.exec(withNormalizedTags)) !== null) {
    if (m.index > cursor) {
      parts.push(truncateText(withNormalizedTags.slice(cursor, m.index)));
    }
    parts.push(m[0]);
    cursor = m.index + m[0].length;
  }
  if (cursor < withNormalizedTags.length) {
    parts.push(truncateText(withNormalizedTags.slice(cursor)));
  }

  return parts.join("").replace(/\s+/g, " ").trim();
}

function truncateText(text: string): string {
  const collapsed = text.replace(/\s+/g, " ");
  if (collapsed.length <= 64) return collapsed;
  return collapsed.slice(0, 64);
}

/** SHA-1 hash truncated to 12 hex chars — compact, low collision rate for short snippets. */
export function sha1Short(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 12);
}

/**
 * Compute a 64-bit difference hash of a grayscale 8x9 resample of an image.
 * Input is PNG bytes (or any image format supported by the caller's decoder).
 * Returns a 16-char lowercase hex string.
 *
 * This utility is intentionally thin — it accepts pre-decoded grayscale
 * pixel data so it stays dependency-free and runs in any environment.
 * Callers (e.g. @accesslint/playwright) decode the screenshot with their
 * image library of choice and hand us the 9x8 gray buffer.
 */
export function dhash(grayPixels9x8: Uint8Array): string {
  if (grayPixels9x8.length !== 9 * 8) {
    throw new Error(`dhash requires a 9x8 grayscale buffer, got ${grayPixels9x8.length} bytes`);
  }
  // 8 rows x (9-1 = 8) comparisons = 64 bits, packed into 8 bytes.
  const bits = new Uint8Array(8);
  for (let row = 0; row < 8; row++) {
    let byte = 0;
    for (let col = 0; col < 8; col++) {
      const left = grayPixels9x8[row * 9 + col];
      const right = grayPixels9x8[row * 9 + col + 1];
      if (left < right) byte |= 1 << (7 - col);
    }
    bits[row] = byte;
  }
  return Array.from(bits, (b) => b.toString(16).padStart(2, "0")).join("");
}
