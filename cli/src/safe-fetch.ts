import { assertSafeUrl, BlockedUrlError, type GuardOptions } from "./ssrf-guard.js";

export interface SafeFetchOptions extends GuardOptions {
  /** Max response body size in bytes. Default 10 MiB. */
  maxBytes?: number;
  /** Total request timeout in ms. Default 15000. */
  timeoutMs?: number;
  /** Max redirect hops. Default 5. */
  maxRedirects?: number;
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_REDIRECTS = 5;

export class FetchLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchLimitError";
  }
}

export { BlockedUrlError };

/**
 * Fetch with the SSRF guard applied at every redirect hop, a total request
 * timeout, and a body-size cap enforced both via Content-Length and while
 * streaming. Returns a Response whose body aborts if the cap is exceeded.
 */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<Response> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const signal = AbortSignal.timeout(timeoutMs);

  let currentUrl = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertSafeUrl(currentUrl, {
      allowPrivateNetwork: opts.allowPrivateNetwork,
    });

    const res = await fetch(currentUrl, { redirect: "manual", signal });

    const isRedirect = res.status >= 300 && res.status < 400 && res.headers.has("location");
    if (isRedirect) {
      const loc = res.headers.get("location")!;
      let next: string;
      try {
        next = new URL(loc, currentUrl).href;
      } catch {
        throw new BlockedUrlError(`Invalid redirect location: ${loc}`);
      }
      await res.body?.cancel().catch(() => {});
      currentUrl = next;
      continue;
    }

    const lenStr = res.headers.get("content-length");
    if (lenStr) {
      const len = Number(lenStr);
      if (Number.isFinite(len) && len > maxBytes) {
        await res.body?.cancel().catch(() => {});
        throw new FetchLimitError(`Response too large: ${len} > ${maxBytes} bytes`);
      }
    }

    return capResponseBody(res, maxBytes);
  }
  throw new FetchLimitError(`Too many redirects (>${maxRedirects})`);
}

function capResponseBody(res: Response, maxBytes: number): Response {
  if (!res.body) return res;
  const stream = res.body;
  const capped = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = stream.getReader();
      let total = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          total += value.byteLength;
          if (total > maxBytes) {
            controller.error(new FetchLimitError(`Response exceeded ${maxBytes} bytes`));
            await reader.cancel().catch(() => {});
            return;
          }
          controller.enqueue(value);
        }
      } catch (err) {
        controller.error(err);
      }
    },
  });
  return new Response(capped, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
