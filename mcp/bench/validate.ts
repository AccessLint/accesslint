import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { audit } from "../src/lib/state.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ExpectedViolation {
  ruleId: string;
  selectorPattern: string;
  impact: string;
}

interface TestCase {
  id: string;
  file: string;
  description: string;
  mode: "fragment" | "document";
  difficulty: "easy" | "medium" | "hard";
  categories: string[];
  expectedViolations: ExpectedViolation[];
}

interface Manifest {
  version: string;
  cases: TestCase[];
}

interface CaseResult {
  id: string;
  passed: boolean;
  matched: number;
  missing: ExpectedViolation[];
  unexpected: { ruleId: string; selector: string; impact: string }[];
}

const manifest: Manifest = JSON.parse(
  readFileSync(resolve(__dirname, "manifest.json"), "utf-8")
);

const results: CaseResult[] = [];
let passCount = 0;
let failCount = 0;

for (const testCase of manifest.cases) {
  const htmlPath = resolve(__dirname, testCase.file);
  const html = readFileSync(htmlPath, "utf-8");

  const componentMode = testCase.mode === "fragment";
  const auditResult = audit(html, { componentMode });
  const actual = auditResult.violations.map((v) => ({
    ruleId: v.ruleId,
    selector: v.selector,
    impact: v.impact,
  }));

  // Match expected violations against actual
  const remaining = [...actual];
  const matched: ExpectedViolation[] = [];
  const missing: ExpectedViolation[] = [];

  for (const expected of testCase.expectedViolations) {
    const idx = remaining.findIndex(
      (a) =>
        a.ruleId === expected.ruleId &&
        a.selector.includes(expected.selectorPattern) &&
        a.impact === expected.impact
    );
    if (idx !== -1) {
      matched.push(expected);
      remaining.splice(idx, 1);
    } else {
      missing.push(expected);
    }
  }

  const passed = missing.length === 0 && remaining.length === 0;

  results.push({
    id: testCase.id,
    passed,
    matched: matched.length,
    missing,
    unexpected: remaining,
  });

  if (passed) {
    passCount++;
    console.log(`  ✅ ${testCase.id} — ${testCase.description}`);
  } else {
    failCount++;
    console.log(`  ❌ ${testCase.id} — ${testCase.description}`);
    if (missing.length > 0) {
      console.log(`     Missing (${missing.length}):`);
      for (const m of missing) {
        console.log(`       - ${m.ruleId} [${m.impact}] selector~"${m.selectorPattern}"`);
      }
    }
    if (remaining.length > 0) {
      console.log(`     Unexpected (${remaining.length}):`);
      for (const u of remaining) {
        console.log(`       - ${u.ruleId} [${u.impact}] ${u.selector}`);
      }
    }
  }
}

console.log("");
console.log(`Results: ${passCount} passed, ${failCount} failed, ${manifest.cases.length} total`);

process.exit(failCount > 0 ? 1 : 0);
