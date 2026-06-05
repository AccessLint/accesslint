import { readFile } from "node:fs/promises";

/**
 * Read HTML to audit from a file path or stdin. URLs are handled by the live
 * CDP path (the caller branches on them); CSS/subresources are loaded by Chrome
 * when the HTML is set as document content, so nothing is inlined here.
 */
export async function resolveInput(source?: string): Promise<string> {
  if (source) {
    return readFile(source, "utf-8");
  }

  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  throw new Error("No input provided. Pass an HTML file, URL, or pipe HTML via stdin.");
}
