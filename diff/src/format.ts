import type { DiffReport } from "./diff.js";

const IMPACT_ORDER: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

export function renderMarkdown(report: DiffReport, baseLabel = "baseline"): string {
  const t = report.totals;
  const lines = [
    `## ♿ Accessibility diff vs \`${baseLabel}\``,
    "",
    `**${t.newViolations} new** · ${t.fixedViolations} fixed · ${t.preExisting} pre-existing (hidden)` +
      (t.skipped ? ` · ${t.skipped} skipped` : ""),
    "",
  ];

  const withNew = report.routes.filter((r) => r.newViolations.length > 0);
  const withFixed = report.routes.filter((r) => r.fixedViolations.length > 0);

  if (withNew.length === 0 && withFixed.length === 0) {
    lines.push("No accessibility changes introduced. 🎉");
    return lines.join("\n");
  }

  if (withNew.length > 0) {
    lines.push("### New violations", "");
    for (const r of withNew) {
      lines.push(`**${r.route}**${r.status === "new-route" ? " _(new route)_" : ""}`);
      const sorted = [...r.newViolations].sort(
        (a, b) => (IMPACT_ORDER[a.impact ?? ""] ?? 9) - (IMPACT_ORDER[b.impact ?? ""] ?? 9),
      );
      for (const v of sorted) {
        const impact = v.impact ?? "unknown";
        const message = (v.message ?? "").trim();
        const source = v.source ? ` — \`${typeof v.source === "string" ? v.source : JSON.stringify(v.source)}\`` : "";
        lines.push(`- \`${impact}\` **${v.ruleId}** — ${message}  `);
        lines.push(`  where: \`${v.selector}\`${source}`);
      }
    }
    lines.push("");
  }

  if (withFixed.length > 0) {
    lines.push("### Fixed", "");
    for (const r of withFixed) {
      for (const v of r.fixedViolations) {
        lines.push(`- **${r.route}** — ${v.ruleId} (\`${v.selector}\`)`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
