import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const ALWAYS_BLOCKED_HOSTS = new Set(["metadata.google.internal", "metadata.goog"]);

// Cloud metadata endpoints — always blocked.
const METADATA = new BlockList();
METADATA.addAddress("169.254.169.254");
METADATA.addAddress("100.100.100.200"); // Alibaba
METADATA.addSubnet("fd00:ec2::", 64, "ipv6"); // AWS IPv6
METADATA.addSubnet("fe80::", 10, "ipv6"); // link-local

// Private ranges — blocked unless allowPrivateNetwork.
const PRIVATE = new BlockList();
PRIVATE.addSubnet("0.0.0.0", 8);
PRIVATE.addSubnet("10.0.0.0", 8);
PRIVATE.addSubnet("127.0.0.0", 8);
PRIVATE.addSubnet("169.254.0.0", 16); // link-local (also covers metadata, checked first)
PRIVATE.addSubnet("172.16.0.0", 12);
PRIVATE.addSubnet("192.168.0.0", 16);
PRIVATE.addSubnet("100.64.0.0", 10); // CGNAT
PRIVATE.addAddress("::1", "ipv6");
PRIVATE.addAddress("::", "ipv6");
PRIVATE.addSubnet("fc00::", 7, "ipv6"); // ULA

function normalizeIP(ip: string): { ip: string; family: "ipv4" | "ipv6" } | null {
  const stripped = ip.replace(/^\[|\]$/g, "");
  const kind = isIP(stripped);
  if (kind === 4) return { ip: stripped, family: "ipv4" };
  if (kind === 6) return { ip: stripped, family: "ipv6" };
  return null;
}

export interface GuardOptions {
  /** Allow loopback / RFC1918 / CGNAT / ULA. Metadata endpoints stay blocked regardless. */
  allowPrivateNetwork?: boolean;
}

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedUrlError";
  }
}

function checkAddress(ip: string, family: "ipv4" | "ipv6", opts: GuardOptions): void {
  if (METADATA.check(ip, family)) {
    throw new BlockedUrlError(`Blocked metadata address: ${ip}`);
  }
  if (!opts.allowPrivateNetwork && PRIVATE.check(ip, family)) {
    throw new BlockedUrlError(`Blocked private address: ${ip}`);
  }
}

/**
 * Validates a URL for fetching: only http(s), not a known cloud-metadata host,
 * and (by default) not resolving to a private/loopback address.
 * Throws BlockedUrlError on rejection; returns the parsed URL on success.
 */
export async function assertSafeUrl(rawUrl: string, opts: GuardOptions = {}): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BlockedUrlError(`Invalid URL: ${rawUrl}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError(`Blocked scheme: ${url.protocol}`);
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (ALWAYS_BLOCKED_HOSTS.has(host)) {
    throw new BlockedUrlError(`Blocked host: ${host}`);
  }

  const literal = normalizeIP(host);
  if (literal) {
    checkAddress(literal.ip, literal.family, opts);
    return url;
  }

  let addrs: { address: string; family: number }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new BlockedUrlError(`DNS lookup failed for ${host}`);
  }
  for (const a of addrs) {
    const family = a.family === 6 ? "ipv6" : "ipv4";
    checkAddress(a.address, family, opts);
  }
  return url;
}
