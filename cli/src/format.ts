import type { AuditResult, Violation } from "@accesslint/core";

const IMPACT_COLORS: Record<string, string> = {
  critical: "\x1b[31m", // red
  serious: "\x1b[33m",  // yellow
  moderate: "\x1b[36m", // cyan
  minor: "\x1b[90m",    // gray
};
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function formatViolation(v: Violation, i: number): string {
  const color = IMPACT_COLORS[v.impact] ?? "";
  const lines = [
    `${BOLD}${color}${v.impact}${RESET} ${DIM}${v.ruleId}${RESET}`,
    `  ${v.message}`,
  ];
  if (v.selector) lines.push(`  ${DIM}${v.selector}${RESET}`);
  if (v.html) lines.push(`  ${DIM}${v.html}${RESET}`);
  return lines.join("\n");
}

export function formatText(result: AuditResult): string {
  const { violations } = result;
  if (violations.length === 0) {
    return "\x1b[32mNo accessibility violations found.\x1b[0m";
  }

  const header = `${BOLD}${violations.length} violation${violations.length === 1 ? "" : "s"} found${RESET}\n`;
  const body = violations.map(formatViolation).join("\n\n");
  return header + "\n" + body;
}

export function formatJSON(result: AuditResult): string {
  return JSON.stringify(result, null, 2);
}

export function format(result: AuditResult, fmt: string): string {
  switch (fmt) {
    case "json":
      return formatJSON(result);
    case "text":
    default:
      return formatText(result);
  }
}
