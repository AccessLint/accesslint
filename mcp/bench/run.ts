import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { audit } from "../src/lib/state.js";
import { formatViolations } from "../src/lib/format.js";
import { invokeClaude, invokeClaudeFix } from "./lib/claude.js";
import { claudeToRawViolations } from "./lib/matching.js";
import type {
  Manifest,
  BenchmarkResults,
  CaseRunResult,
  FixRunResult,
} from "./lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { values: flags } = parseArgs({
  options: {
    runs: { type: "string", default: "3" },
    model: { type: "string", default: "sonnet" },
    "mcp-only": { type: "boolean", default: false },
    "skip-fix": { type: "boolean", default: false },
    "fix-only": { type: "boolean", default: false },
    timeout: { type: "string", default: "30000" },
  },
});

const RUNS = parseInt(flags.runs!, 10);
const MODEL = flags.model!;
const MCP_ONLY = flags["mcp-only"]!;
const SKIP_FIX = flags["skip-fix"]!;
const FIX_ONLY = flags["fix-only"]!;
const TIMEOUT = parseInt(flags.timeout!, 10);

const manifest: Manifest = JSON.parse(
  readFileSync(resolve(__dirname, "manifest.json"), "utf-8")
);

const CLAUDE_JSON_SCHEMA = {
  type: "object",
  properties: {
    violations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          element: { type: "string" },
          issue: { type: "string" },
          wcagCriterion: { type: "string" },
          impact: {
            type: "string",
            enum: ["critical", "serious", "moderate", "minor"],
          },
        },
        required: ["element", "issue", "wcagCriterion", "impact"],
      },
    },
  },
  required: ["violations"],
};

function buildPrompt(html: string, mode: "fragment" | "document"): string {
  const modeInstruction =
    mode === "fragment"
      ? "This is an HTML fragment (a component or partial). Do NOT flag missing <html>, <head>, <title>, lang attribute, landmarks, or skip navigation — those are expected to be absent in fragments."
      : "This is a complete HTML document. Check all document-level requirements including <html lang>, <title>, landmarks, skip navigation, and heading structure.";

  return `You are an accessibility auditor. Analyze the following HTML for WCAG 2.1 Level A and AA violations.

${modeInstruction}

You MUST respond with ONLY a raw JSON object — no markdown, no explanation, no code fences. The JSON must match this exact structure:
{"violations": [{"element": "...", "issue": "...", "wcagCriterion": "...", "impact": "..."}]}

Field definitions:
- "element": CSS selector for the specific element (e.g., "img", "button:nth-of-type(2)", "input[name=\\"email\\"]")
- "issue": concise description of the violation
- "wcagCriterion": WCAG success criterion number (e.g., "1.1.1", "4.1.2")
- "impact": one of "critical", "serious", "moderate", "minor"
  - critical: Completely blocks access (e.g., missing alt on informational image, no form labels)
  - serious: Significant barriers (e.g., missing lang, no link text, focusable within aria-hidden)
  - moderate: Causes difficulty but content accessible (e.g., heading order skips, missing landmarks)
  - minor: Minor issues (e.g., suspicious alt text words, empty headings)

If there are no violations, respond with: {"violations": []}

Rules:
- Only report actual WCAG 2.1 Level A or AA violations, not best practices.
- Do not flag valid accessible patterns (e.g., aria-label on buttons, role="presentation" on decorative images without focusability, visually hidden text).
- Be specific about which element has the violation using precise selectors.

HTML to audit:
\`\`\`html
${html}
\`\`\``;
}

const CLAUDE_FIX_JSON_SCHEMA = {
  type: "object",
  properties: {
    html: { type: "string" },
  },
  required: ["html"],
};

function buildHybridFixPrompt(html: string, mode: "fragment" | "document", auditReport: string): string {
  const modeInstruction =
    mode === "fragment"
      ? "This is an HTML fragment (a component or partial). Do NOT add <html>, <head>, <title>, lang attribute, landmarks, or skip navigation — those belong in the parent document, not in fragments."
      : "This is a complete HTML document. Fix all document-level requirements including <html lang>, <title>, landmarks, skip navigation, and heading structure.";

  return `You are an accessibility remediation expert. The following HTML was audited and these WCAG 2.1 Level A/AA violations were found. Fix all of them.

${modeInstruction}

AUDIT RESULTS:
${auditReport}

Return ONLY the fixed HTML — no explanation, no markdown, no code fences.
Preserve the structure and content. Only change what is necessary to fix the violations listed above.

HTML to fix:
\`\`\`html
${html}
\`\`\``;
}

function buildFixPrompt(html: string, mode: "fragment" | "document"): string {
  const modeInstruction =
    mode === "fragment"
      ? "This is an HTML fragment (a component or partial). Do NOT add <html>, <head>, <title>, lang attribute, landmarks, or skip navigation — those belong in the parent document, not in fragments."
      : "This is a complete HTML document. Fix all document-level requirements including <html lang>, <title>, landmarks, skip navigation, and heading structure.";

  return `You are an accessibility remediation expert. Fix all WCAG 2.1 Level A and AA violations in the following HTML.

${modeInstruction}

Return ONLY the fixed HTML — no explanation, no markdown, no code fences.
Preserve the structure and content. Only change what is necessary to fix accessibility violations.

HTML to fix:
\`\`\`html
${html}
\`\`\``;
}

function runHybridFix(
  caseId: string,
  html: string,
  mode: "fragment" | "document",
  runIndex: number,
  originalViolationCount: number
): FixRunResult {
  const componentMode = mode === "fragment";

  // Step 1: Audit to get structured violation data
  const auditResult = audit(html, { componentMode });
  const auditReport = formatViolations(auditResult.violations);

  // Step 2: Build prompt with MCP's structured violation report
  const prompt = buildHybridFixPrompt(html, mode, auditReport);

  // Step 3: Invoke Claude with the enriched prompt
  const result = invokeClaudeFix({
    prompt,
    model: MODEL,
    timeout: TIMEOUT,
    jsonSchema: CLAUDE_FIX_JSON_SCHEMA,
  });

  if (result.error || result.html === null) {
    return {
      caseId,
      source: "mcp+claude",
      runIndex,
      durationMs: result.durationMs,
      originalViolationCount,
      fixedHtml: "",
      reauditViolationCount: 0,
      fixedCount: 0,
      regressionCount: 0,
      tokens: result.tokens,
      error: result.error || "No HTML returned",
    };
  }

  const fixedHtml = result.html;

  // Step 4: Re-audit the fixed HTML
  try {
    const reaudit = audit(fixedHtml, { componentMode });
    const originalResult = audit(html, { componentMode });

    const originalKeys = new Set(
      originalResult.violations.map((v) => `${v.ruleId}|${v.selector}`)
    );
    const reauditKeys = new Set(
      reaudit.violations.map((v) => `${v.ruleId}|${v.selector}`)
    );

    let fixedCount = 0;
    for (const key of originalKeys) {
      if (!reauditKeys.has(key)) fixedCount++;
    }

    let regressionCount = 0;
    for (const key of reauditKeys) {
      if (!originalKeys.has(key)) regressionCount++;
    }

    return {
      caseId,
      source: "mcp+claude",
      runIndex,
      durationMs: result.durationMs,
      originalViolationCount,
      fixedHtml,
      reauditViolationCount: reaudit.violations.length,
      fixedCount,
      regressionCount,
      tokens: result.tokens,
    };
  } catch (err) {
    return {
      caseId,
      source: "mcp+claude",
      runIndex,
      durationMs: result.durationMs,
      originalViolationCount,
      fixedHtml,
      reauditViolationCount: 0,
      fixedCount: 0,
      regressionCount: 0,
      tokens: result.tokens,
      error: `Re-audit failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function runClaudeFix(
  caseId: string,
  html: string,
  mode: "fragment" | "document",
  runIndex: number,
  originalViolationCount: number
): FixRunResult {
  const componentMode = mode === "fragment";
  const prompt = buildFixPrompt(html, mode);
  const result = invokeClaudeFix({
    prompt,
    model: MODEL,
    timeout: TIMEOUT,
    jsonSchema: CLAUDE_FIX_JSON_SCHEMA,
  });

  if (result.error || result.html === null) {
    return {
      caseId,
      source: "claude",
      runIndex,
      durationMs: result.durationMs,
      originalViolationCount,
      fixedHtml: "",
      reauditViolationCount: 0,
      fixedCount: 0,
      regressionCount: 0,
      tokens: result.tokens,
      error: result.error || "No HTML returned",
    };
  }

  const fixedHtml = result.html;

  // Re-audit the fixed HTML
  try {
    const reaudit = audit(fixedHtml, { componentMode });
    const originalResult = audit(html, { componentMode });

    const originalKeys = new Set(
      originalResult.violations.map((v) => `${v.ruleId}|${v.selector}`)
    );
    const reauditKeys = new Set(
      reaudit.violations.map((v) => `${v.ruleId}|${v.selector}`)
    );

    let fixedCount = 0;
    for (const key of originalKeys) {
      if (!reauditKeys.has(key)) fixedCount++;
    }

    let regressionCount = 0;
    for (const key of reauditKeys) {
      if (!originalKeys.has(key)) regressionCount++;
    }

    return {
      caseId,
      source: "claude",
      runIndex,
      durationMs: result.durationMs,
      originalViolationCount,
      fixedHtml,
      reauditViolationCount: reaudit.violations.length,
      fixedCount,
      regressionCount,
      tokens: result.tokens,
    };
  } catch (err) {
    return {
      caseId,
      source: "claude",
      runIndex,
      durationMs: result.durationMs,
      originalViolationCount,
      fixedHtml,
      reauditViolationCount: 0,
      fixedCount: 0,
      regressionCount: 0,
      tokens: result.tokens,
      error: `Re-audit failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function runMcpCase(
  caseId: string,
  html: string,
  componentMode: boolean
): CaseRunResult {
  const start = performance.now();
  try {
    const result = audit(html, { componentMode });
    const durationMs = Math.round(performance.now() - start);
    return {
      caseId,
      source: "mcp",
      runIndex: 0,
      durationMs,
      raw: result.violations.map((v) => ({
        ruleId: v.ruleId,
        selector: v.selector,
        impact: v.impact,
      })),
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    return {
      caseId,
      source: "mcp",
      runIndex: 0,
      durationMs,
      raw: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function runClaudeCase(
  caseId: string,
  html: string,
  mode: "fragment" | "document",
  runIndex: number,
  expectedViolations: import("./lib/types.js").ExpectedViolation[]
): CaseRunResult {
  const prompt = buildPrompt(html, mode);
  const result = invokeClaude({
    prompt,
    model: MODEL,
    timeout: TIMEOUT,
    jsonSchema: CLAUDE_JSON_SCHEMA,
  });

  if (result.error) {
    return {
      caseId,
      source: "claude",
      runIndex,
      durationMs: result.durationMs,
      raw: [],
      tokens: result.tokens,
      error: result.error,
    };
  }

  const raw = claudeToRawViolations(result.parsed, expectedViolations);

  return {
    caseId,
    source: "claude",
    runIndex,
    durationMs: result.durationMs,
    raw,
    tokens: result.tokens,
  };
}

// Main
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const totalExpected = manifest.cases.reduce(
  (sum, c) => sum + c.expectedViolations.length,
  0
);

const results: BenchmarkResults = {
  config: {
    runs: RUNS,
    model: MODEL,
    timeout: TIMEOUT,
    timestamp,
  },
  manifest: {
    version: manifest.version,
    caseCount: manifest.cases.length,
    totalExpectedViolations: totalExpected,
  },
  cases: {},
};

console.log(`Benchmark: ${manifest.cases.length} cases, ${RUNS} Claude runs per case`);
console.log(`Model: ${MODEL}, Timeout: ${TIMEOUT}ms, MCP-only: ${MCP_ONLY}, Skip-fix: ${SKIP_FIX}, Fix-only: ${FIX_ONLY}`);
console.log("");

for (const testCase of manifest.cases) {
  const htmlPath = resolve(__dirname, testCase.file);
  const html = readFileSync(htmlPath, "utf-8");
  const componentMode = testCase.mode === "fragment";

  // MCP run
  process.stdout.write(`  ${testCase.id} ... MCP`);
  const mcpResult = runMcpCase(testCase.id, html, componentMode);
  process.stdout.write(` (${mcpResult.durationMs}ms, ${mcpResult.raw.length} violations)`);

  const claudeResults: CaseRunResult[] = [];

  if (!MCP_ONLY && !FIX_ONLY) {
    for (let i = 0; i < RUNS; i++) {
      process.stdout.write(` | Claude run ${i + 1}`);
      const claudeResult = runClaudeCase(
        testCase.id,
        html,
        testCase.mode,
        i,
        testCase.expectedViolations
      );
      if (claudeResult.error) {
        process.stdout.write(` (ERR: ${claudeResult.error})`);
      } else {
        process.stdout.write(
          ` (${claudeResult.durationMs}ms, ${claudeResult.raw.length} violations)`
        );
      }
      claudeResults.push(claudeResult);
    }
  }

  console.log("");

  // Fix phase: skip cases with 0 expected violations
  const hybridFixResults: FixRunResult[] = [];
  const claudeFixResults: FixRunResult[] = [];
  const hasViolations = testCase.expectedViolations.length > 0;

  if (!SKIP_FIX && !MCP_ONLY && hasViolations) {
    // Hybrid fix (MCP audit + Claude fix)
    for (let i = 0; i < RUNS; i++) {
      process.stdout.write(`    fix: Hybrid ${i + 1}`);
      const hybridFixResult = runHybridFix(
        testCase.id,
        html,
        testCase.mode,
        i,
        mcpResult.raw.length
      );
      if (hybridFixResult.error) {
        process.stdout.write(` (ERR: ${hybridFixResult.error})`);
      } else {
        process.stdout.write(
          ` (fixed=${hybridFixResult.fixedCount}, regr=${hybridFixResult.regressionCount})`
        );
      }
      hybridFixResults.push(hybridFixResult);
    }

    // Claude fix
    for (let i = 0; i < RUNS; i++) {
      process.stdout.write(` | Claude fix ${i + 1}`);
      const claudeFixResult = runClaudeFix(
        testCase.id,
        html,
        testCase.mode,
        i,
        mcpResult.raw.length
      );
      if (claudeFixResult.error) {
        process.stdout.write(` (ERR: ${claudeFixResult.error})`);
      } else {
        process.stdout.write(
          ` (fixed=${claudeFixResult.fixedCount}, regr=${claudeFixResult.regressionCount})`
        );
      }
      claudeFixResults.push(claudeFixResult);
    }

    console.log("");
  }

  results.cases[testCase.id] = {
    description: testCase.description,
    mode: testCase.mode,
    difficulty: testCase.difficulty,
    expectedViolations: testCase.expectedViolations,
    mcp: [mcpResult],
    claude: claudeResults,
    hybridFix: hybridFixResults,
    claudeFix: claudeFixResults,
  };
}

const outPath = resolve(__dirname, "results", `${timestamp}.json`);
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log("");
console.log(`Results saved to: ${outPath}`);
