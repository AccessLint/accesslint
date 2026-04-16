import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderComponent, extractFingerprints } from "./lib/render.js";
import type { RenderManifest } from "./lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const manifest: RenderManifest = JSON.parse(
  readFileSync(resolve(__dirname, "render-manifest.json"), "utf-8")
);

for (const tc of manifest.cases) {
  const tsxPath = resolve(__dirname, tc.file);
  try {
    const mod = await import(tsxPath);
    const html = renderComponent(mod.default);
    const violations = extractFingerprints(html);
    console.log(`${tc.id}: ${violations.length} violations`);
    console.log(`  HTML: ${html.slice(0, 100)}...`);
    for (const v of violations) {
      console.log(`  ${v.ruleId} (${v.impact})`);
    }
  } catch (err) {
    console.error(`${tc.id}: ERROR — ${err instanceof Error ? err.message : String(err)}`);
  }
}
