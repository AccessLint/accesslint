/**
 * Heuristics for detecting framework-generated, run-to-run-unstable ids.
 *
 * These ids (React `useId`, emotion/styled hashes, Radix/Headless UI auto
 * ids, etc.) change between renders and builds, so anchoring a selector or
 * snapshot identity on them produces churn rather than stability. The same
 * detection is applied when building CSS selectors, when extracting anchors,
 * and when fingerprinting HTML so the layers agree on what counts as
 * "generated".
 */

const GENERATED_ID_PATTERNS: RegExp[] = [
  // React useId — `:r0:`, `:r1a:` (base-32 counter), and SSR `:R...:` form.
  /^:r[0-9a-z]+:$/i,
  // MUI / emotion auto ids — `«1»`, `mui-123`, `css-1ab2c3`.
  /^«.+»$/,
  /^mui-\d+$/,
  /^css-[a-z0-9]+$/i,
  // Radix / Headless UI / Reach UI prefixed ids — `radix-:r1:`, `headlessui-menu-:r3:`.
  /^(radix|headlessui|reach)-/i,
  // Long hex blobs (emotion class hashes, uuid fragments).
  /^[a-f0-9]{8,}$/i,
  // prefix + hash suffix — `field-9f3a1c`, `Tooltip-1a2b3c4`.
  /^[a-z0-9_-]+-[a-f0-9]{6,}$/i,
];

/** True when `value` looks like a framework-generated id (unstable across runs). */
export function isGeneratedId(value: string): boolean {
  return GENERATED_ID_PATTERNS.some((p) => p.test(value));
}

/** True when `value` is a usable, stable id: present, not too long, not generated. */
export function isStableId(value: string | null | undefined): value is string {
  return value != null && value.length > 0 && value.length < 100 && !isGeneratedId(value);
}
