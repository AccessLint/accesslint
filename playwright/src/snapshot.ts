/**
 * Snapshot baseline — capture current violations and only fail on regressions.
 *
 * Generic snapshot file I/O + comparison logic lives in
 * `@accesslint/matchers-internal/snapshot` (shared across all matcher
 * packages). This file owns the Playwright-specific pieces: page-settle
 * heuristic, selector stabilization via `locator.normalize()`, and frame
 * navigation for `>>>iframe>`-prefixed violation selectors.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import type { Page, Locator, Frame } from "@playwright/test";
import { normalizeHtml, sha1Short } from "@accesslint/heal-diff/normalize";
import type { AuditViolation } from "./audit";

export {
  validateSnapshotName,
  resolveSnapshotPath,
  loadSnapshot,
  saveSnapshot,
  compareViolations,
  evaluateSnapshot,
  screenshotsDirFor,
  type SnapshotViolation,
  type SnapshotResult,
  type HealedViolation,
  type LikelyMovedHint,
} from "@accesslint/matchers-internal/snapshot";
import type { SnapshotViolation } from "@accesslint/matchers-internal/snapshot";

// ---------------------------------------------------------------------------
// Page settle heuristic
// ---------------------------------------------------------------------------

function getPage(target: Page | Locator): Page {
  return typeof (target as Page).goto === "function"
    ? (target as Page)
    : (target as Locator).page();
}

/**
 * Wait for the page to reach a stable state before auditing.
 *
 * 1. Waits for `domcontentloaded`
 * 2. Waits for a 100 ms window with no DOM mutations (max 2 s)
 */
export async function waitForPageSettle(target: Page | Locator): Promise<void> {
  const page = getPage(target);

  await page.waitForLoadState("domcontentloaded").catch(() => {});

  await page
    .evaluate(
      () =>
        new Promise<void>((resolve) => {
          const maxWait = setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 2_000);

          let quietTimer = setTimeout(() => {
            clearTimeout(maxWait);
            observer.disconnect();
            resolve();
          }, 100);

          const observer = new MutationObserver(() => {
            clearTimeout(quietTimer);
            quietTimer = setTimeout(() => {
              clearTimeout(maxWait);
              observer.disconnect();
              resolve();
            }, 100);
          });

          observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
          });
        }),
    )
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Stable selector generation via Locator.normalize() (Playwright 1.59+)
// ---------------------------------------------------------------------------

/**
 * Generate stable selectors for CSS selectors within a Page or Frame.
 * Uses Playwright's public `locator(css).normalize()` to rewrite CSS
 * selectors as role-based locators (e.g. `getByRole('button', { name: '…' })`).
 * Falls back to tag-path selectors on Playwright versions that predate
 * `normalize()` or when the element is no longer in the DOM.
 */
async function stabilizeSelectors(target: Page | Frame, cssSelectors: string[]): Promise<string[]> {
  if (cssSelectors.length === 0) return [];

  const results = await Promise.all(
    cssSelectors.map(async (sel) => {
      try {
        const locator = sel ? target.locator(sel) : target.locator(":root");
        if (typeof locator.normalize !== "function") return null;
        const normalized = await locator.normalize();
        return normalized.toString();
      } catch {
        return null;
      }
    }),
  );

  if (results.every((r) => r !== null)) return results as string[];

  const fallback = await tagPathFallback(target, cssSelectors);
  return results.map((r, i) => r ?? fallback[i]);
}

// ---------------------------------------------------------------------------
// Frame navigation for >>>iframe> selectors
// ---------------------------------------------------------------------------

const IFRAME_BOUNDARY = " >>>iframe> ";

/**
 * Navigate the frame tree to find the innermost frame described by a
 * `>>>iframe>` prefix like `#iframe1 >>>iframe> #iframe2 >>>iframe>`.
 */
async function findFrameByPrefix(page: Page, prefix: string): Promise<Frame | null> {
  const segments = prefix
    .split(" >>>iframe>")
    .map((s) => s.trim())
    .filter(Boolean);

  let currentFrame: Frame = page.mainFrame();
  for (const iframeSelector of segments) {
    let found = false;
    for (const child of currentFrame.childFrames()) {
      try {
        const frameEl = await child.frameElement();
        const matches = await currentFrame.evaluate(
          ([el, sel]: [Element, string]) => {
            try {
              return el.matches(sel);
            } catch {
              return false;
            }
          },
          [frameEl, iframeSelector] as [any, string],
        );
        if (matches) {
          currentFrame = child;
          found = true;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!found) return null;
  }
  return currentFrame;
}

/**
 * Convert audit violations into snapshot violations with **stable selectors**.
 *
 * Uses Playwright's public `locator(css).normalize()` to rewrite CSS selectors
 * as role-based locator calls. For iframe violations (`>>>iframe>`), navigates
 * to the inner frame and stabilizes the element selector within that frame's
 * context. Falls back to tag-path selectors when normalization fails.
 */
export interface ToStableViolationsOptions {
  /**
   * When set, per-violation PNG screenshots are captured (bounded
   * concurrency) and written to `<snapshotPath>-screenshots/`. The
   * `screenshotPath` on each returned violation points at the written
   * file. Skipped silently when an individual capture fails.
   */
  snapshotPath?: string;
  /** Disable screenshot capture entirely. Defaults to true when snapshotPath is set. */
  visualSnapshots?: boolean;
}

export async function toStableViolations(
  target: Page | Locator,
  violations: AuditViolation[],
  options?: ToStableViolationsOptions,
): Promise<SnapshotViolation[]> {
  if (violations.length === 0) return [];

  const page = getPage(target);
  const result: SnapshotViolation[] = new Array(violations.length);

  // Categorize violations by context
  const mainIndices: number[] = [];
  const mainSelectors: string[] = [];
  const iframeGroups = new Map<string, { indices: number[]; suffixes: string[] }>();

  for (let i = 0; i < violations.length; i++) {
    const selector = violations[i].selector;
    const lastIframe = selector.lastIndexOf(IFRAME_BOUNDARY);

    if (lastIframe >= 0) {
      const prefix = selector.substring(
        0,
        lastIframe + IFRAME_BOUNDARY.length - 1, // trim trailing space
      );
      const suffix = selector.substring(lastIframe + IFRAME_BOUNDARY.length);

      if (suffix.includes(">>>")) {
        // Shadow DOM within iframe — keep as-is
        result[i] = { ruleId: violations[i].ruleId, selector };
      } else {
        const group = iframeGroups.get(prefix) ?? {
          indices: [],
          suffixes: [],
        };
        group.indices.push(i);
        group.suffixes.push(suffix);
        iframeGroups.set(prefix, group);
      }
    } else if (selector.includes(">>>")) {
      // Pure shadow DOM — keep as-is
      result[i] = { ruleId: violations[i].ruleId, selector };
    } else {
      mainIndices.push(i);
      mainSelectors.push(selector);
    }
  }

  // Stabilize main-frame selectors + capture extra signals in the same frame
  const stableMain = await stabilizeSelectors(page, mainSelectors);
  const mainSignals = await captureMainFrameSignals(page, mainSelectors, violations, mainIndices);
  for (let i = 0; i < mainIndices.length; i++) {
    const idx = mainIndices[i];
    result[idx] = {
      ruleId: violations[idx].ruleId,
      selector: stableMain[i],
      ...mainSignals[i],
    };
  }

  // Stabilize iframe selectors within their frame context (signals best-effort
  // skipped in iframes for now).
  for (const [prefix, { indices, suffixes }] of iframeGroups) {
    let stableSuffixes: string[];
    try {
      const frame = await findFrameByPrefix(page, prefix);
      stableSuffixes = frame ? await stabilizeSelectors(frame, suffixes) : suffixes;
    } catch {
      stableSuffixes = suffixes;
    }
    for (let i = 0; i < indices.length; i++) {
      result[indices[i]] = {
        ruleId: violations[indices[i]].ruleId,
        selector: prefix + " " + stableSuffixes[i],
      };
    }
  }

  const wantScreenshots =
    options?.visualSnapshots !== false && options?.snapshotPath !== undefined;
  if (wantScreenshots && options?.snapshotPath) {
    await captureScreenshots(page, options.snapshotPath, mainIndices, mainSelectors, result);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main-frame signal capture (anchor, role, htmlFingerprint, relativeLocation, tag)
// ---------------------------------------------------------------------------

interface RawSignals {
  anchor?: string;
  role?: string;
  html?: string;
  relativeLocation?: string;
  tag?: string;
}

async function captureMainFrameSignals(
  page: Page,
  cssSelectors: string[],
  violations: AuditViolation[],
  mainIndices: number[],
): Promise<Array<Partial<SnapshotViolation>>> {
  if (cssSelectors.length === 0) return [];

  let raw: RawSignals[];
  try {
    raw = await page.evaluate(
      (args: { selectors: string[] }) => {
        const AL = (window as unknown as { AccessLint?: Record<string, unknown> }).AccessLint;
        const extractAnchor = (AL?.extractAnchor as ((el: Element) => string | null) | undefined);
        const getComputedRole = (AL?.getComputedRole as ((el: Element) => string | null) | undefined);
        const getAccessibleName = (AL?.getAccessibleName as ((el: Element) => string) | undefined);
        const getHtmlSnippet = (AL?.getHtmlSnippet as ((el: Element) => string) | undefined);

        const LANDMARK_TAGS = new Set(["main", "nav", "header", "footer", "aside", "form", "fieldset"]);
        const LANDMARK_ROLES = new Set([
          "banner",
          "complementary",
          "contentinfo",
          "form",
          "main",
          "navigation",
          "region",
          "search",
        ]);

        function isLandmark(el: Element): boolean {
          if (LANDMARK_TAGS.has(el.tagName.toLowerCase())) return true;
          const explicit = el.getAttribute("role");
          return explicit != null && LANDMARK_ROLES.has(explicit);
        }

        function segmentFor(el: Element): string {
          const tag = el.tagName.toLowerCase();
          if (el.id) return `${tag}#${el.id}`;
          const role = el.getAttribute("role");
          return role ? `${tag}[role=${role}]` : tag;
        }

        function buildRelativeLocation(el: Element): string | null {
          let current: Element | null = el.parentElement;
          while (current) {
            if (isLandmark(current)) {
              let trail = segmentFor(current);
              let near: string | null = null;
              let scan: Element | null = el;
              for (let depth = 0; scan && depth < 4 && !near; depth++, scan = scan.parentElement) {
                for (let i = 0; i < scan.children.length; i++) {
                  const sib = scan.children[i];
                  if (sib === el) continue;
                  const text = (sib.textContent ?? "").trim().replace(/\s+/g, " ");
                  if (text.length > 0 && text.length <= 40) {
                    near = text;
                    break;
                  }
                }
              }
              if (near) trail = `${trail} > near "${near}"`;
              return trail;
            }
            current = current.parentElement;
          }
          return null;
        }

        return args.selectors.map((sel): RawSignals => {
          try {
            const el = sel ? document.querySelector(sel) : document.documentElement;
            if (!el) return {};
            const out: RawSignals = { tag: el.tagName.toLowerCase() };
            const anchor = extractAnchor?.(el);
            if (anchor) out.anchor = anchor;
            const role = getComputedRole?.(el);
            if (role) {
              const name = (getAccessibleName?.(el) ?? "").trim();
              out.role = name ? `${role}[name="${name}"]` : role;
            }
            const html = getHtmlSnippet?.(el);
            if (html) out.html = html;
            const rel = buildRelativeLocation(el);
            if (rel) out.relativeLocation = rel;
            return out;
          } catch {
            return {};
          }
        });
      },
      { selectors: cssSelectors },
    );
  } catch {
    raw = cssSelectors.map(() => ({}));
  }

  return raw.map((sig, i): Partial<SnapshotViolation> => {
    const out: Partial<SnapshotViolation> = {};
    if (sig.anchor) out.anchor = sig.anchor;
    if (sig.role) out.role = sig.role;
    if (sig.tag) out.tag = sig.tag;
    if (sig.relativeLocation) out.relativeLocation = sig.relativeLocation;
    const html = sig.html ?? violations[mainIndices[i]].html;
    if (html) out.htmlFingerprint = sha1Short(normalizeHtml(html));
    return out;
  });
}

// ---------------------------------------------------------------------------
// Screenshot capture
// ---------------------------------------------------------------------------

const SCREENSHOT_CONCURRENCY = 4;

function slugForDiscriminator(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function ruleSlug(ruleId: string): string {
  return ruleId.replace(/\//g, "_");
}

function screenshotFilename(
  v: SnapshotViolation,
  existing: Set<string>,
): string {
  const rule = ruleSlug(v.ruleId);
  const disc = v.anchor
    ? slugForDiscriminator(v.anchor)
    : v.htmlFingerprint
      ? v.htmlFingerprint.slice(0, 8)
      : "x";
  const base = `${rule}_${disc}`;
  let name = `${base}.png`;
  let i = 1;
  while (existing.has(name)) {
    name = `${base}_${i}.png`;
    i++;
  }
  existing.add(name);
  return name;
}

async function captureScreenshots(
  page: Page,
  snapshotPath: string,
  mainIndices: number[],
  cssSelectors: string[],
  result: SnapshotViolation[],
): Promise<void> {
  const baselineName = basename(snapshotPath).replace(/\.json$/i, "");
  const dir = resolve(dirname(snapshotPath), `${baselineName}-screenshots`);
  mkdirSync(dir, { recursive: true });

  const used = new Set<string>();
  const queue: Array<() => Promise<void>> = [];

  for (let i = 0; i < mainIndices.length; i++) {
    const idx = mainIndices[i];
    const css = cssSelectors[i];
    if (!css) continue;
    const filename = screenshotFilename(result[idx], used);
    queue.push(async () => {
      try {
        const locator = page.locator(css).first();
        const png = await locator.screenshot({ omitBackground: true, timeout: 1000 });
        writeFileSync(resolve(dir, filename), png);
        result[idx].screenshotPath = `${baselineName}-screenshots/${filename}`;
      } catch {
        /* element detached, off-screen, or timeout — skip */
      }
    });
  }

  for (let i = 0; i < queue.length; i += SCREENSHOT_CONCURRENCY) {
    await Promise.all(queue.slice(i, i + SCREENSHOT_CONCURRENCY).map((fn) => fn()));
  }
}

async function tagPathFallback(target: Page | Frame, selectors: string[]): Promise<string[]> {
  return target.evaluate((cssSelectors: string[]) => {
    function tagPath(el: Element): string {
      const parts: string[] = [];
      let current: Element | null = el;
      while (current) {
        let tag = current.tagName.toLowerCase();
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (c) => c.tagName === current!.tagName,
          );
          if (siblings.length > 1) {
            tag += `:nth-of-type(${siblings.indexOf(current) + 1})`;
          }
        }
        parts.unshift(tag);
        current = current.parentElement;
      }
      return parts.join(" > ");
    }

    return cssSelectors.map((selector) => {
      try {
        const el = selector ? document.querySelector(selector) : document.documentElement;
        return el ? tagPath(el) : selector;
      } catch {
        return selector;
      }
    });
  }, selectors);
}
