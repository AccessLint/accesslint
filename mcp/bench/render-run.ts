import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { renderComponent, extractFingerprints, compareViolationSets } from "./lib/render.js";
import { invokeClaudeFix } from "./lib/claude.js";
import type {
  RenderManifest,
  RenderBenchmarkResults,
  RenderCaseRunResult,
  ViolationFingerprint,
} from "./lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { values: flags } = parseArgs({
  options: {
    runs: { type: "string", default: "3" },
    model: { type: "string", default: "sonnet" },
    timeout: { type: "string", default: "30000" },
    case: { type: "string" },
  },
});

const RUNS = parseInt(flags.runs!, 10);
const MODEL = flags.model!;
const TIMEOUT = parseInt(flags.timeout!, 10);
const CASE_FILTER = flags.case ?? null;

const manifest: RenderManifest = JSON.parse(
  readFileSync(resolve(__dirname, "render-manifest.json"), "utf-8")
);

const RENDER_JSON_SCHEMA = {
  type: "object",
  properties: {
    html: { type: "string" },
  },
  required: ["html"],
};

function buildRenderPrompt(tsxSource: string): string {
  return `You are a React rendering engine. Your job is to produce the exact HTML that React's \`renderToStaticMarkup\` would output for the given component.

Rules:
- Translate JSX attributes: className → class, htmlFor → for, tabIndex → tabindex
- Resolve all expressions, ternaries, && conditionals, and .map() calls using the literal values in the source
- Convert style objects to inline CSS strings (e.g. style={{ backgroundColor: "blue" }} → style="background-color:blue")
- Omit event handlers (onClick, onChange, etc.) — they don't appear in static markup
- Expand all sub-components inline — produce only standard HTML elements
- React fragments (<> </> or <React.Fragment>) produce no wrapper element
- Boolean attributes: disabled={true} → disabled=""
- aria-hidden="true" should remain as-is
- Do NOT fix any accessibility issues — render the component exactly as written, bugs and all
- Do NOT add any elements, attributes, or content that isn't in the source

Return ONLY the HTML string — no explanation, no markdown, no code fences.

TSX source:
\`\`\`tsx
${tsxSource}
\`\`\``;
}

async function loadComponent(filePath: string): Promise<{ default: React.ComponentType }> {
  return import(filePath);
}

// Main
const cases = CASE_FILTER
  ? manifest.cases.filter((c) => c.id === CASE_FILTER)
  : manifest.cases;

if (cases.length === 0) {
  console.error(`No cases found${CASE_FILTER ? ` matching "${CASE_FILTER}"` : ""}`);
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const results: RenderBenchmarkResults = {
  config: {
    runs: RUNS,
    model: MODEL,
    timeout: TIMEOUT,
    timestamp,
  },
  manifest: {
    version: manifest.version,
    caseCount: cases.length,
  },
  cases: {},
};

console.log(`Render Benchmark: ${cases.length} cases, ${RUNS} runs per case`);
console.log(`Model: ${MODEL}, Timeout: ${TIMEOUT}ms`);
console.log("");

for (const testCase of cases) {
  const tsxPath = resolve(__dirname, testCase.file);
  const tsxSource = readFileSync(tsxPath, "utf-8");

  // Step 1: Dynamic import and render ground truth
  process.stdout.write(`  ${testCase.id} ... `);
  let groundTruthHtml: string;
  let groundTruthViolations: ViolationFingerprint[];

  try {
    const mod = await loadComponent(tsxPath);
    groundTruthHtml = renderComponent(mod.default);
    groundTruthViolations = extractFingerprints(groundTruthHtml);
    process.stdout.write(`ground truth: ${groundTruthViolations.length} violations`);
  } catch (err) {
    console.log(`RENDER ERROR: ${err instanceof Error ? err.message : String(err)}`);
    continue;
  }

  // Step 2: Claude runs
  const runs: RenderCaseRunResult[] = [];

  for (let i = 0; i < RUNS; i++) {
    process.stdout.write(` | run ${i + 1}`);

    const prompt = buildRenderPrompt(tsxSource);
    const result = invokeClaudeFix({
      prompt,
      model: MODEL,
      timeout: TIMEOUT,
      jsonSchema: RENDER_JSON_SCHEMA,
    });

    if (result.error || result.html === null) {
      process.stdout.write(` (ERR: ${result.error || "No HTML"})`);
      runs.push({
        caseId: testCase.id,
        runIndex: i,
        durationMs: result.durationMs,
        claudeHtml: null,
        groundTruthViolations,
        claudeViolations: [],
        matched: 0,
        missing: groundTruthViolations.length,
        extra: 0,
        tokens: result.tokens,
        error: result.error || "No HTML returned",
      });
      continue;
    }

    const claudeViolations = extractFingerprints(result.html);
    const comparison = compareViolationSets(groundTruthViolations, claudeViolations);

    process.stdout.write(
      ` (${result.durationMs}ms, matched=${comparison.matched}/${groundTruthViolations.length}, extra=${comparison.extra})`
    );

    runs.push({
      caseId: testCase.id,
      runIndex: i,
      durationMs: result.durationMs,
      claudeHtml: result.html,
      groundTruthViolations,
      claudeViolations,
      matched: comparison.matched,
      missing: comparison.missing,
      extra: comparison.extra,
      tokens: result.tokens,
    });
  }

  console.log("");

  results.cases[testCase.id] = {
    description: testCase.description,
    difficulty: testCase.difficulty,
    groundTruthHtml,
    groundTruthViolations,
    runs,
  };
}

const outPath = resolve(__dirname, "results", `render-${timestamp}.json`);
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log("");
console.log(`Results saved to: ${outPath}`);
