// Polyfill CSS.escape for jsdom (not implemented natively)
if (typeof globalThis.CSS === "undefined") {
  (globalThis as Record<string, unknown>).CSS = {};
}

if (typeof CSS.escape !== "function") {
  // Reference implementation per https://drafts.csswg.org/cssom/#serialize-an-identifier
  CSS.escape = function (value: string): string {
    const str = String(value);
    const len = str.length;
    let result = "";

    for (let i = 0; i < len; i++) {
      const ch = str.charCodeAt(i);

      // Null character → U+FFFD
      if (ch === 0x0000) {
        result += "\uFFFD";
        continue;
      }

      if (
        (ch >= 0x0001 && ch <= 0x001f) || ch === 0x007f || // control chars
        (i === 0 && ch >= 0x0030 && ch <= 0x0039) || // digit at start
        (i === 1 && ch >= 0x0030 && ch <= 0x0039 && str.charCodeAt(0) === 0x002d) // digit after leading hyphen
      ) {
        result += "\\" + ch.toString(16) + " ";
        continue;
      }

      if (i === 0 && ch === 0x002d && len === 1) {
        result += "\\" + str.charAt(i);
        continue;
      }

      if (
        ch >= 0x0080 ||
        ch === 0x002d || // hyphen
        ch === 0x005f || // underscore
        (ch >= 0x0030 && ch <= 0x0039) || // digit
        (ch >= 0x0041 && ch <= 0x005a) || // uppercase
        (ch >= 0x0061 && ch <= 0x007a)    // lowercase
      ) {
        result += str.charAt(i);
        continue;
      }

      result += "\\" + str.charAt(i);
    }

    return result;
  };
}
