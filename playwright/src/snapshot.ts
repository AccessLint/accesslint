/**
 * Snapshot baseline — capture current violations and only fail on regressions.
 *
 * Generic snapshot file I/O + comparison logic lives in
 * `@accesslint/matchers-internal/snapshot` (shared across all matcher
 * packages). This file owns the Playwright-specific pieces: page-settle
 * heuristic, selector stabilization via `locator.normalize()`, and frame
 * navigation for `>>>iframe>`-prefixed violation selectors.
 */
import type { Page, Locator, Frame } from "@playwright/test";
import type { AuditViolation } from "./audit";

export {
  validateSnapshotName,
  resolveSnapshotPath,
  loadSnapshot,
  saveSnapshot,
  compareViolations,
  evaluateSnapshot,
  type SnapshotViolation,
  type SnapshotResult,
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
export async function toStableViolations(
  target: Page | Locator,
  violations: AuditViolation[],
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

  // Stabilize main-frame selectors
  const stableMain = await stabilizeSelectors(page, mainSelectors);
  for (let i = 0; i < mainIndices.length; i++) {
    result[mainIndices[i]] = {
      ruleId: violations[mainIndices[i]].ruleId,
      selector: stableMain[i],
    };
  }

  // Stabilize iframe selectors within their frame context
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

  return result;
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
