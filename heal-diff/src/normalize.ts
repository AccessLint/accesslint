/**
 * HTML + hashing utilities for building signal values.
 *
 * No DOM or node dependency: operates on HTML strings with a pure-JS
 * hash, so the same module runs in node sidecars and in-page bundles.
 * The accesslint matcher feeds `getHtmlSnippet` output (capped at 200
 * chars) into `normalizeHtml`, then hashes the result to produce
 * `htmlFingerprint`.
 */

/**
 * Version of the normalization algorithm. Bump whenever `normalizeHtml`
 * can produce different output for the same input — stored fingerprints
 * minted under an older version must be treated as cold. Owned here;
 * downstream fingerprint wrappers must not version independently.
 *
 * 1: attribute drop/sort, generated-id filtering, 64-char text truncation.
 * 2: adds URL query/fragment stripping on href/src values.
 */
export const NORMALIZE_VERSION = 2;

/** Attributes removed entirely during normalization. */
const DROP_ATTRS = new Set(["class", "style"]);

/** Attributes whose values are URLs: query strings and fragments are
 * stripped (cache busters, UTM params) so only the path identifies. */
const URL_ATTRS = new Set(["href", "src"]);

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
    .map((a) => (URL_ATTRS.has(a.name) ? { name: a.name, value: a.value.split(/[?#]/)[0] } : a))
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
  const withNormalizedTags = html.replace(
    TAG_RE,
    (_, closing: string, tag: string, attrs: string, self: string) => {
      const lower = tag.toLowerCase();
      const attrPart = attrs.trim();
      const normalizedAttrs = attrPart ? normalizeAttributes(attrPart) : "";
      const attrSegment = normalizedAttrs ? ` ${normalizedAttrs}` : "";
      const selfClose = self ? "/" : "";
      return `<${closing}${lower}${attrSegment}${selfClose}>`;
    },
  );

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

/**
 * Whether an element of this tag should carry an `htmlFingerprint` signal.
 * `<html>` and `<body>` snippets serialize the whole page, so their
 * fingerprint is page-scoped noise: any edit anywhere near the top of the
 * document changes it, and both elements are unique per page (their address
 * cannot host an impostor). Signal capture skips them; missing-signal
 * leniency then keeps exact matches standing under `verifiedBy`.
 */
export function isFingerprintableTag(tag: string): boolean {
  const lower = tag.toLowerCase();
  return lower !== "html" && lower !== "body";
}

/** SHA-1 hash truncated to 12 hex chars — compact, low collision rate for short snippets. */
export function sha1Short(input: string): string {
  return sha1Hex(input).slice(0, 12);
}

/**
 * Pure-JS SHA-1 over the UTF-8 bytes of `input`, hex-encoded.
 * Output is identical to `node:crypto`'s sha1 digest; implemented inline
 * so the fingerprint path has no node builtins and bundles for the
 * browser unchanged. Synchronous by design (WebCrypto's sha-1 is
 * async-only). Used for identity, not security.
 */
function sha1Hex(input: string): string {
  const data = new TextEncoder().encode(input);
  const paddedLen = Math.ceil((data.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLen);
  bytes.set(data);
  bytes[data.length] = 0x80;
  const view = new DataView(bytes.buffer);
  const bitLen = data.length * 8;
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(paddedLen - 4, bitLen >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);

  for (let block = 0; block < paddedLen; block += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(block + t * 4);
    for (let t = 16; t < 80; t++) {
      const x = w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16];
      w[t] = (x << 1) | (x >>> 31);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let t = 0; t < 80; t++) {
      let f: number;
      let k: number;
      if (t < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (t < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[t]) >>> 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  return [h0, h1, h2, h3, h4].map((h) => h.toString(16).padStart(8, "0")).join("");
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
