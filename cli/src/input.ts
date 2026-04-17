import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { inlineCSS } from "./inline-css.js";
import { safeFetch } from "./safe-fetch.js";

// CLI operator types the URL and controls cwd, so local/private network targets are legitimate.
const CLI_INLINE_OPTS = { allowPrivateNetwork: true };

export async function resolveInput(source?: string): Promise<string> {
  // Explicit source: file or URL
  if (source) {
    if (/^https?:\/\//i.test(source)) {
      let res: Response;
      try {
        res = await safeFetch(source, { allowPrivateNetwork: true });
      } catch (err: unknown) {
        const cause =
          err instanceof Error && err.cause instanceof Error
            ? err.cause.message
            : err instanceof Error
              ? err.message
              : String(err);
        throw new Error(`Failed to fetch ${source}: ${cause}`);
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch ${source}: ${res.status} ${res.statusText}`);
      }
      const html = await res.text();
      return inlineCSS(html, source, CLI_INLINE_OPTS);
    }
    const html = await readFile(source, "utf-8");
    const baseURL = pathToFileURL(resolve(source)).href;
    return inlineCSS(html, baseURL, CLI_INLINE_OPTS);
  }

  // Piped stdin
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  throw new Error("No input provided. Pass an HTML file, URL, or pipe HTML via stdin.");
}
