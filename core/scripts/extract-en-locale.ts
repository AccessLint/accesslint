/**
 * One-time extraction script: reads all rules and outputs src/i18n/en.ts
 * Usage: npx tsx scripts/extract-en-locale.ts
 */
import { rules } from "../src/rules/index";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const lines: string[] = [
  'import type { LocaleMap } from "./types";',
  "",
  "export const en: LocaleMap = {",
];

for (const rule of rules) {
  const desc = JSON.stringify(rule.description);
  if (rule.guidance) {
    const guid = JSON.stringify(rule.guidance);
    lines.push(`  ${JSON.stringify(rule.id)}: { description: ${desc}, guidance: ${guid} },`);
  } else {
    lines.push(`  ${JSON.stringify(rule.id)}: { description: ${desc} },`);
  }
}

lines.push("};");
lines.push("");

const outPath = resolve(__dirname, "../src/i18n/en.ts");
writeFileSync(outPath, lines.join("\n"), "utf-8");
console.log(`Wrote ${rules.length} rule translations to ${outPath}`);
