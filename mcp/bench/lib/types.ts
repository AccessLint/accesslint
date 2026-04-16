export interface ExpectedViolation {
  ruleId: string;
  selectorPattern: string;
  impact: string;
}

export interface TestCase {
  id: string;
  file: string;
  description: string;
  mode: "fragment" | "document";
  difficulty: "easy" | "medium" | "hard";
  categories: string[];
  expectedViolations: ExpectedViolation[];
}

export interface Manifest {
  version: string;
  cases: TestCase[];
}

export interface ClaudeViolation {
  element: string;
  issue: string;
  wcagCriterion: string;
  impact: "critical" | "serious" | "moderate" | "minor";
}

export interface RawViolation {
  ruleId: string;
  selector: string;
  impact: string;
  issue?: string;
  wcagCriterion?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  costUsd: number;
}

export interface CaseRunResult {
  caseId: string;
  source: "mcp" | "claude";
  runIndex: number;
  durationMs: number;
  raw: RawViolation[];
  tokens?: TokenUsage;
  error?: string;
}

export interface FixRunResult {
  caseId: string;
  source: "mcp+claude" | "claude";
  runIndex: number;
  durationMs: number;
  originalViolationCount: number;
  fixedHtml: string;
  reauditViolationCount: number;
  fixedCount: number;
  regressionCount: number;
  tokens?: TokenUsage;
  error?: string;
}

export interface BenchmarkResults {
  config: {
    runs: number;
    model: string;
    timeout: number;
    timestamp: string;
  };
  manifest: {
    version: string;
    caseCount: number;
    totalExpectedViolations: number;
  };
  cases: Record<
    string,
    {
      description: string;
      mode: "fragment" | "document";
      difficulty: "easy" | "medium" | "hard";
      expectedViolations: ExpectedViolation[];
      mcp: CaseRunResult[];
      claude: CaseRunResult[];
      hybridFix: FixRunResult[];
      claudeFix: FixRunResult[];
    }
  >;
}

// --- Render benchmark types ---

export interface RenderTestCase {
  id: string;
  file: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface RenderManifest {
  version: string;
  cases: RenderTestCase[];
}

export interface ViolationFingerprint {
  ruleId: string;
  impact: string;
}

export interface RenderCaseRunResult {
  caseId: string;
  runIndex: number;
  durationMs: number;
  claudeHtml: string | null;
  groundTruthViolations: ViolationFingerprint[];
  claudeViolations: ViolationFingerprint[];
  matched: number;
  missing: number;
  extra: number;
  tokens?: TokenUsage;
  error?: string;
}

export interface RenderBenchmarkResults {
  config: {
    runs: number;
    model: string;
    timeout: number;
    timestamp: string;
  };
  manifest: {
    version: string;
    caseCount: number;
  };
  cases: Record<
    string,
    {
      description: string;
      difficulty: "easy" | "medium" | "hard";
      groundTruthHtml: string;
      groundTruthViolations: ViolationFingerprint[];
      runs: RenderCaseRunResult[];
    }
  >;
}

export interface CaseScore {
  caseId: string;
  difficulty: "easy" | "medium" | "hard";
  expectedCount: number;
  mcp: {
    tp: number;
    fp: number;
    fn: number;
    precision: number;
    recall: number;
    f1: number;
    durationMs: number;
  };
  claude: {
    runs: Array<{
      tp: number;
      fp: number;
      fn: number;
      precision: number;
      recall: number;
      f1: number;
      durationMs: number;
    }>;
    mean: { precision: number; recall: number; f1: number; durationMs: number };
    stddev: { precision: number; recall: number; f1: number };
  };
}
