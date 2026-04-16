import { execFileSync } from "node:child_process";
import type { ClaudeViolation, TokenUsage } from "./types.js";

export interface InvokeClaudeOptions {
  prompt: string;
  model: string;
  timeout: number;
  jsonSchema: object;
  maxBudgetUsd?: number;
}

export interface InvokeClaudeResult {
  parsed: ClaudeViolation[];
  durationMs: number;
  tokens?: TokenUsage;
  error?: string;
}

export interface InvokeClaudeFixResult {
  html: string | null;
  durationMs: number;
  tokens?: TokenUsage;
  error?: string;
}

export function invokeClaude(options: InvokeClaudeOptions): InvokeClaudeResult {
  const { prompt, model, timeout, jsonSchema, maxBudgetUsd = 0.25 } = options;

  const args = [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--no-session-persistence",
    "--model",
    model,
    "--tools",
    "",
    "--max-budget-usd",
    String(maxBudgetUsd),
    "--json-schema",
    JSON.stringify(jsonSchema),
  ];

  const env = { ...process.env };
  delete env.CLAUDECODE;

  const start = performance.now();

  try {
    const stdout = execFileSync("claude", args, {
      encoding: "utf-8",
      timeout,
      env,
      maxBuffer: 10 * 1024 * 1024,
    });

    const durationMs = Math.round(performance.now() - start);

    return parseResponse(stdout, durationMs);
  } catch (execErr) {
    const durationMs = Math.round(performance.now() - start);

    // execFileSync throws on non-zero exit, but stdout may still be in the error
    if (execErr instanceof Error && "stdout" in execErr) {
      const stdout = (execErr as { stdout: string | Buffer }).stdout;
      if (stdout) {
        return parseResponse(String(stdout), durationMs);
      }
    }

    if (execErr instanceof Error) {
      const msg = execErr.message;
      if (msg.includes("ETIMEDOUT") || msg.includes("timed out") || msg.includes("TIMEOUT")) {
        return { parsed: [], durationMs, error: `Timeout after ${timeout}ms` };
      }
      if (msg.includes("429") || msg.includes("rate limit")) {
        return { parsed: [], durationMs, error: "Rate limited" };
      }
    }

    return {
      parsed: [],
      durationMs,
      error: `Exec error: ${execErr instanceof Error ? execErr.message : String(execErr)}`,
    };
  }
}

function extractTokenUsage(envelope: Record<string, unknown>): TokenUsage | undefined {
  // modelUsage has the real token counts; usage block is often all zeros
  const modelUsage = envelope.modelUsage as Record<string, Record<string, unknown>> | undefined;
  if (modelUsage) {
    // modelUsage is keyed by model name, e.g. "claude-sonnet-4-6"
    const modelKey = Object.keys(modelUsage)[0];
    if (modelKey) {
      const m = modelUsage[modelKey];
      return {
        inputTokens: (m.inputTokens as number) ?? 0,
        outputTokens: (m.outputTokens as number) ?? 0,
        cacheReadInputTokens: (m.cacheReadInputTokens as number) ?? 0,
        cacheCreationInputTokens: (m.cacheCreationInputTokens as number) ?? 0,
        costUsd: (m.costUSD as number) ?? (envelope.total_cost_usd as number) ?? 0,
      };
    }
  }

  // Fallback to top-level usage if modelUsage is absent
  const usage = envelope.usage as Record<string, unknown> | undefined;
  if (!usage) return undefined;

  return {
    inputTokens: (usage.input_tokens as number) ?? 0,
    outputTokens: (usage.output_tokens as number) ?? 0,
    cacheReadInputTokens: (usage.cache_read_input_tokens as number) ?? 0,
    cacheCreationInputTokens: (usage.cache_creation_input_tokens as number) ?? 0,
    costUsd: (envelope.total_cost_usd as number) ?? 0,
  };
}

function parseResponse(stdout: string, durationMs: number): InvokeClaudeResult {
  try {
    const envelope = JSON.parse(stdout);
    const tokens = extractTokenUsage(envelope);

    // Check for error subtypes in the envelope
    if (envelope.subtype && envelope.subtype.startsWith("error")) {
      return {
        parsed: [],
        durationMs,
        tokens,
        error: `Claude error: ${envelope.subtype}`,
      };
    }

    // Try extracting violations from multiple possible locations in the envelope
    // --json-schema places structured output in `structured_output`, not `result`
    for (const field of [envelope.structured_output, envelope.result, envelope.content, envelope.output]) {
      if (field == null) continue;
      const violations = extractViolations(field);
      if (violations) {
        return { parsed: violations, durationMs, tokens };
      }
    }

    // Dump the full envelope keys for debugging
    const keys = Object.keys(envelope).join(", ");
    const resultPreview = envelope.result === "" ? '(empty string)' : String(envelope.result ?? "(null)").slice(0, 200);
    return {
      parsed: [],
      durationMs,
      tokens,
      error: `Could not extract violations. Envelope keys: [${keys}]. result: ${resultPreview}`,
    };
  } catch (parseErr) {
    return {
      parsed: [],
      durationMs,
      error: `Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}. Raw: ${stdout.slice(0, 200)}`,
    };
  }
}

export function invokeClaudeFix(options: InvokeClaudeOptions): InvokeClaudeFixResult {
  const { prompt, model, timeout, jsonSchema, maxBudgetUsd = 0.25 } = options;

  const args = [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--no-session-persistence",
    "--model",
    model,
    "--tools",
    "",
    "--max-budget-usd",
    String(maxBudgetUsd),
    "--json-schema",
    JSON.stringify(jsonSchema),
  ];

  const env = { ...process.env };
  delete env.CLAUDECODE;

  const start = performance.now();

  try {
    const stdout = execFileSync("claude", args, {
      encoding: "utf-8",
      timeout,
      env,
      maxBuffer: 10 * 1024 * 1024,
    });

    const durationMs = Math.round(performance.now() - start);
    return parseFixResponse(stdout, durationMs);
  } catch (execErr) {
    const durationMs = Math.round(performance.now() - start);

    if (execErr instanceof Error && "stdout" in execErr) {
      const stdout = (execErr as { stdout: string | Buffer }).stdout;
      if (stdout) {
        return parseFixResponse(String(stdout), durationMs);
      }
    }

    if (execErr instanceof Error) {
      const msg = execErr.message;
      if (msg.includes("ETIMEDOUT") || msg.includes("timed out") || msg.includes("TIMEOUT")) {
        return { html: null, durationMs, error: `Timeout after ${timeout}ms` };
      }
      if (msg.includes("429") || msg.includes("rate limit")) {
        return { html: null, durationMs, error: "Rate limited" };
      }
    }

    return {
      html: null,
      durationMs,
      error: `Exec error: ${execErr instanceof Error ? execErr.message : String(execErr)}`,
    };
  }
}

function parseFixResponse(stdout: string, durationMs: number): InvokeClaudeFixResult {
  try {
    const envelope = JSON.parse(stdout);
    const tokens = extractTokenUsage(envelope);

    if (envelope.subtype && envelope.subtype.startsWith("error")) {
      return { html: null, durationMs, tokens, error: `Claude error: ${envelope.subtype}` };
    }

    for (const field of [envelope.structured_output, envelope.result, envelope.content, envelope.output]) {
      if (field == null) continue;
      const html = extractHtml(field);
      if (html !== null) {
        return { html, durationMs, tokens };
      }
    }

    const keys = Object.keys(envelope).join(", ");
    return {
      html: null,
      durationMs,
      tokens,
      error: `Could not extract HTML. Envelope keys: [${keys}]`,
    };
  } catch (parseErr) {
    return {
      html: null,
      durationMs,
      error: `Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
    };
  }
}

export function extractHtml(result: unknown): string | null {
  // Direct object with html field
  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>;
    if (typeof obj.html === "string") return obj.html;
  }

  if (typeof result !== "string") return null;
  const text = result.trim();

  // Try JSON parse for {html: "..."}
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.html === "string") return parsed.html;
  } catch {
    // Fall through
  }

  // Extract from markdown code fences
  const fenceMatch = text.match(/```(?:html)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // If it looks like HTML, return as-is
  if (text.startsWith("<") || text.startsWith("<!")) {
    return text;
  }

  return null;
}

function extractViolations(result: unknown): ClaudeViolation[] | null {
  // Direct object with violations array
  if (typeof result === "object" && result !== null) {
    const obj = result as Record<string, unknown>;
    if (Array.isArray(obj.violations)) return obj.violations;
  }

  if (typeof result !== "string") return null;
  const text = result.trim();

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.violations)) return parsed.violations;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fall through to extraction strategies
  }

  // Extract JSON from markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (Array.isArray(parsed.violations)) return parsed.violations;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through
    }
  }

  // Find first { ... } that looks like it contains "violations"
  const braceStart = text.indexOf("{");
  if (braceStart >= 0) {
    // Find the matching closing brace
    let depth = 0;
    let braceEnd = -1;
    for (let i = braceStart; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          braceEnd = i;
          break;
        }
      }
    }
    if (braceEnd > braceStart) {
      try {
        const parsed = JSON.parse(text.slice(braceStart, braceEnd + 1));
        if (Array.isArray(parsed.violations)) return parsed.violations;
      } catch {
        // Fall through
      }
    }
  }

  return null;
}
