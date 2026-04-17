import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { ACT_TO_CORE_RULES } from "./act-mapping";

const OUTPUT_DIR = resolve(import.meta.dirname, "../../act-fixtures");
const OUTPUT_FILE = resolve(OUTPUT_DIR, "act-testcases.json");
const INDEX_FILE = resolve(OUTPUT_DIR, "testcases-index.json");
const HTML_DIR = resolve(OUTPUT_DIR, "html");

interface ActTestCase {
  ruleId: string;
  ruleName: string;
  testcaseId: string;
  testcaseTitle: string;
  expected: "passed" | "failed" | "inapplicable";
  url: string;
  approved: boolean;
}

interface FixtureEntry {
  testcaseId: string;
  testcaseTitle: string;
  actRuleId: string;
  actRuleName: string;
  coreRuleId: string;
  expected: "passed" | "failed" | "inapplicable";
  html: string;
}

function main() {
  if (!existsSync(INDEX_FILE)) {
    throw new Error(`Missing ${INDEX_FILE}. Run scripts/download-act-fixtures.sh first.`);
  }
  if (!existsSync(HTML_DIR)) {
    throw new Error(`Missing ${HTML_DIR}. Run scripts/download-act-fixtures.sh first.`);
  }

  const data: { testcases: ActTestCase[] } = JSON.parse(readFileSync(INDEX_FILE, "utf-8"));

  const mapped = data.testcases.filter((tc) => tc.approved && tc.ruleId in ACT_TO_CORE_RULES);

  const htmlFiles = new Set(readdirSync(HTML_DIR));

  const fixtures: FixtureEntry[] = [];
  let missing = 0;

  for (const tc of mapped) {
    const filename = `${tc.testcaseId}.html`;
    if (!htmlFiles.has(filename)) {
      missing++;
      continue;
    }

    const html = readFileSync(resolve(HTML_DIR, filename), "utf-8");
    // Emit one fixture entry per (testcase, core rule). An ACT rule can
    // map to multiple core rules, and each should be tested independently.
    for (const coreRuleId of ACT_TO_CORE_RULES[tc.ruleId]) {
      fixtures.push({
        testcaseId: tc.testcaseId,
        testcaseTitle: tc.testcaseTitle,
        actRuleId: tc.ruleId,
        actRuleName: tc.ruleName,
        coreRuleId,
        expected: tc.expected,
        html,
      });
    }
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  writeFileSync(OUTPUT_FILE, JSON.stringify(fixtures, null, 2));
  console.log(
    `Wrote ${fixtures.length}/${mapped.length} test cases to ${OUTPUT_FILE}` +
      (missing > 0 ? ` (${missing} missing HTML files)` : ""),
  );
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
