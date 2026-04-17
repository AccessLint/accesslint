import { JSDOM } from "jsdom";
import { safeFetch } from "./safe-fetch.js";

export interface InlineCSSOptions {
  /** Allow fetches to loopback / private networks. Default false. */
  allowPrivateNetwork?: boolean;
  /** Cap total stylesheet fetches per call. Default 50. */
  maxFetches?: number;
  /** Cap response body size per fetch (bytes). Default 2 MiB. */
  maxBytes?: number;
  /** Per-stylesheet timeout in ms. Default 5000. */
  timeoutMs?: number;
}

const DEFAULT_MAX_FETCHES = 50;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;

interface FetchCtx {
  count: number;
  limit: number;
  maxBytes: number;
  timeoutMs: number;
  allowPrivateNetwork: boolean;
}

async function fetchCSS(url: string, ctx: FetchCtx): Promise<string | null> {
  if (ctx.count >= ctx.limit) {
    console.warn(`Warning: stylesheet fetch limit (${ctx.limit}) reached, skipping ${url}`);
    return null;
  }
  ctx.count++;

  try {
    const res = await safeFetch(url, {
      allowPrivateNetwork: ctx.allowPrivateNetwork,
      maxBytes: ctx.maxBytes,
      timeoutMs: ctx.timeoutMs,
    });
    if (!res.ok) {
      console.warn(`Warning: failed to fetch stylesheet ${url}: ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Warning: failed to fetch stylesheet ${url}: ${msg}`);
    return null;
  }
}

async function resolveImports(css: string, baseURL: string, ctx: FetchCtx): Promise<string> {
  const importPattern =
    /@import\s+(?:url\(\s*['"]?([^'")\s]+)['"]?\s*\)|['"]([^'"]+)['"])\s*([^;]*);/g;
  const replacements: { match: string; replacement: string }[] = [];

  for (const m of css.matchAll(importPattern)) {
    const importURL = m[1] || m[2];
    if (!importURL) continue;

    let resolved: string;
    try {
      resolved = new URL(importURL, baseURL).href;
    } catch {
      continue;
    }

    const imported = await fetchCSS(resolved, ctx);
    if (imported !== null) {
      const mediaQuery = m[3]?.trim();
      const wrapped = mediaQuery ? `@media ${mediaQuery} {\n${imported}\n}` : imported;
      replacements.push({ match: m[0], replacement: wrapped });
    }
  }

  let result = css;
  for (const { match, replacement } of replacements) {
    result = result.replace(match, replacement);
  }
  return result;
}

export async function inlineCSS(
  html: string,
  baseURL: string,
  options: InlineCSSOptions = {},
): Promise<string> {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const links = doc.querySelectorAll('link[rel="stylesheet"][href]');

  if (links.length === 0) {
    dom.window.close();
    return html;
  }

  const ctx: FetchCtx = {
    count: 0,
    limit: options.maxFetches ?? DEFAULT_MAX_FETCHES,
    maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    allowPrivateNetwork: options.allowPrivateNetwork ?? false,
  };

  const tasks = Array.from(links).map(async (link: Element) => {
    const href = link.getAttribute("href")!;

    // Skip data URIs
    if (href.startsWith("data:")) return;

    let resolved: string;
    try {
      resolved = new URL(href, baseURL).href;
    } catch {
      return;
    }

    // file:// baseURL + relative href can produce file:// URLs — skip, not a fetch target.
    if (!/^https?:/i.test(resolved)) return;

    const css = await fetchCSS(resolved, ctx);
    if (css === null) return;

    const inlined = await resolveImports(css, resolved, ctx);

    const style = doc.createElement("style");
    style.textContent = inlined;

    const media = link.getAttribute("media");
    if (media) style.setAttribute("media", media);

    link.replaceWith(style);
  });

  await Promise.all(tasks);

  const result = dom.serialize();
  dom.window.close();
  return result;
}
