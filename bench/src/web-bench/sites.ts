import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";

const CRUX_URL =
  "https://raw.githubusercontent.com/zakird/crux-top-lists/main/data/global/current.csv.gz";
const BLOCKLIST_URL =
  "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn/hosts";

/** Seeded PRNG (mulberry32) for reproducible sampling. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle with seeded PRNG, then take first n. */
function seededSample<T>(items: T[], n: number, seed: number): T[] {
  const arr = items.slice();
  const rng = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

async function fetchGzippedText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

  const chunks: Buffer[] = [];
  const gunzip = createGunzip();
  const collector = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk);
      cb();
    },
  });

  const body = res.body;
  if (!body) throw new Error("No response body");

  await pipeline(Readable.fromWeb(body as any), gunzip, collector);
  return Buffer.concat(chunks).toString("utf-8");
}

/** Parse StevenBlack hosts file into a Set of blocked domains. */
function parseBlocklist(text: string): Set<string> {
  const domains = new Set<string>();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    // Format: "0.0.0.0 domain.com" or "127.0.0.1 domain.com"
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2 && (parts[0] === "0.0.0.0" || parts[0] === "127.0.0.1")) {
      const domain = parts[1].toLowerCase();
      if (domain && domain !== "localhost") {
        domains.add(domain);
      }
    }
  }
  return domains;
}

/** Parse CrUX CSV into origin/rank pairs. */
function parseCrux(text: string): Array<{ origin: string; rank: number }> {
  const entries: Array<{ origin: string; rank: number }> = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("origin")) continue; // skip header
    const comma = trimmed.lastIndexOf(",");
    if (comma === -1) continue;
    const origin = trimmed.slice(0, comma);
    const rank = parseInt(trimmed.slice(comma + 1), 10);
    if (origin && !isNaN(rank)) {
      entries.push({ origin, rank });
    }
  }
  return entries;
}

/** Extract hostname from an origin URL. */
function hostnameFromOrigin(origin: string): string {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return origin.toLowerCase();
  }
}

/** Check if a hostname matches any blocked domain (including parent domains). */
function isBlocked(hostname: string, blocklist: Set<string>): boolean {
  if (blocklist.has(hostname)) return true;
  // Check parent domains: "www.example.com" should match "example.com"
  const parts = hostname.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    if (blocklist.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

/**
 * Download the CrUX top sites list and StevenBlack blocklist,
 * filter blocked domains, and return a random sample.
 */
export async function downloadAndSample(
  sampleSize: number,
  seed?: number,
): Promise<Array<{ origin: string; rank: number }>> {
  console.log("Downloading CrUX top sites list...");
  const cruxText = await fetchGzippedText(CRUX_URL);
  const allSites = parseCrux(cruxText);
  console.log(`  Loaded ${allSites.length.toLocaleString()} origins from CrUX`);

  console.log("Downloading blocklist...");
  const blocklistText = await fetchText(BLOCKLIST_URL);
  const blocklist = parseBlocklist(blocklistText);
  console.log(`  Loaded ${blocklist.size.toLocaleString()} blocked domains`);

  const filtered = allSites.filter((s) => !isBlocked(hostnameFromOrigin(s.origin), blocklist));
  const removed = allSites.length - filtered.length;
  console.log(`  Filtered out ${removed.toLocaleString()} blocked origins (${filtered.length.toLocaleString()} remaining)`);

  const effectiveSeed = seed ?? Date.now();
  console.log(`  Sampling ${sampleSize} sites (seed: ${effectiveSeed})`);
  const sampled = seededSample(filtered, Math.min(sampleSize, filtered.length), effectiveSeed);

  return sampled;
}
