// Caps guarding the MCP process against agent-driven resource exhaustion.
export const MAX_HTML_BYTES = 10 * 1024 * 1024;

/** Reject HTML larger than the cap, measured by UTF-8 byte length. */
export function checkHtmlSize(html: string): { ok: true } | { ok: false; error: string } {
  const bytes = Buffer.byteLength(html, "utf8");
  if (bytes > MAX_HTML_BYTES) {
    return {
      ok: false,
      error: `HTML exceeds ${MAX_HTML_BYTES} bytes (got ${bytes})`,
    };
  }
  return { ok: true };
}
