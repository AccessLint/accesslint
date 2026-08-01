// Which files source mode has anything true to say about.
//
// Both checks here came out of the corpus triage, and both are the same kind of
// judgement: a finding has to be a defect a user could hit. JSX that never
// becomes a DOM cannot produce one, and a fixture built to hold broken markup is
// not a defect either — it is the test's subject.

/**
 * Modules that consume JSX and render something other than a document. Satori
 * and its wrappers are the ones that matter: they deliberately accept `div`,
 * `img`, `p` and `span` and turn them into a PNG, so an `<img>` there has no alt
 * to miss and no accessibility tree to be missing from.
 */
const NON_DOM_MODULES =
  /(^|[/'"])(satori|@vercel\/og|next\/og|og_edge|@react-pdf\/renderer|react-nil)(['"/]|$)/;

/** `import { ImageResponse } from …` — the satori entry point under every name. */
const IMAGE_RESPONSE_IMPORT = /import\s*\{[^}]*\bImageResponse\b[^}]*\}\s*from/;

/**
 * Next's metadata file convention: these modules export an image, never a page.
 * Matched loosely because the same file gets hand-rolled under near-miss names
 * (`open-graph-image.tsx` next to Next's own `opengraph-image.tsx`).
 */
const IMAGE_MODULE_FILENAME =
  /(^|\/)(opengraph-image|open-graph-image|twitter-image|apple-icon|icon)([.-][^/]*)?\.(jsx|tsx)$/;

/** satori's Tailwind prop. Not an HTML attribute, and nothing else uses it. */
const SATORI_TAILWIND_PROP = /\stw=["{]/;

/**
 * A file whose JSX is rendered by something other than a DOM. Findings from one
 * would be about markup no user ever reaches.
 *
 * The `tw` attribute is the third tell and the one that catches satori's
 * *component* files, where the `ImageResponse` call lives in a sibling module:
 * `tw` is not an HTML attribute, it is satori's Tailwind prop.
 */
export function nonDomRenderer(source: string, filename?: string): boolean {
  if (filename && IMAGE_MODULE_FILENAME.test(filename)) return true;
  if (IMAGE_RESPONSE_IMPORT.test(source)) return true;
  if (SATORI_TAILWIND_PROP.test(source)) return true;
  for (const line of source.split("\n")) {
    if (!/^\s*(import|export)\b/.test(line) && !/\brequire\(/.test(line)) continue;
    if (NON_DOM_MODULES.test(line)) return true;
  }
  return false;
}

/**
 * Test files and fixtures. Their markup is written to be wrong — a positive
 * `tabIndex` fixture in a focus-trap test suite is the test, not a defect — so a
 * review comment on one is noise of exactly the kind that gets a bot ignored.
 * Stories and playground apps are *not* included: those are real UI.
 */
const TEST_FILENAME = /(^|\/)[^/]*\.(test|spec)\.(jsx|tsx)$/;
const TEST_DIRECTORIES = new Set([
  "__tests__",
  "__mocks__",
  "__fixtures__",
  "fixtures",
  "test-fixtures",
]);

export function testFile(filename?: string): boolean {
  if (!filename) return false;
  if (TEST_FILENAME.test(filename)) return true;
  return filename.split("/").some((segment) => TEST_DIRECTORIES.has(segment));
}
