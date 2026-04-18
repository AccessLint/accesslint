/**
 * Markdown report — designed to be pasted into a PR comment or GitHub issue.
 * Wide tables are collapsed into `<details>` blocks to keep scroll length
 * tolerable on a large codebase.
 */
import type { Report, RuleRollup, SnapshotTimeline } from "./aggregate.js";

export function emitMarkdown(report: Report): string {
  const lines: string[] = [];
  lines.push("# Accessibility snapshot report");
  lines.push("");
  lines.push(`_Generated ${report.generatedAt}_`);
  lines.push("");
  lines.push(summarySection(report));
  lines.push("");
  lines.push("## Snapshots");
  lines.push("");
  lines.push(snapshotTable(report.snapshots));
  lines.push("");

  for (const s of report.snapshots) {
    lines.push(snapshotTimeline(s));
    lines.push("");
  }

  lines.push("## Rule movement");
  lines.push("");
  lines.push(ruleTable(report.rules));
  lines.push("");
  return lines.join("\n");
}

function summarySection(report: Report): string {
  const s = report.summary;
  const currentDebt = report.snapshots.reduce((sum, snap) => sum + snap.currentTotal, 0);
  let baselined = 0;
  let regressionsAccepted = 0;
  for (const snap of report.snapshots) {
    for (const p of snap.points) {
      if (p.event === "created") baselined += p.added;
      else if (p.event === "force-update") regressionsAccepted += p.added;
    }
  }
  const window =
    s.firstSeen && s.lastSeen ? `${s.firstSeen} → ${s.lastSeen}` : "no events recorded";
  return [
    `- **Window:** ${window}`,
    `- **Snapshots tracked:** ${s.snapshotCount}`,
    `- **Open violations (sum of current totals):** ${currentDebt}`,
    `- **Initial baselines:** ${baselined} (pre-existing debt captured at adoption)`,
    `- **Removed in window:** ${s.totalRemoved}`,
    `- **Regressions accepted:** ${regressionsAccepted} (across ${s.forceUpdateCount} force-update event${s.forceUpdateCount === 1 ? "" : "s"})`,
  ].join("\n");
}

function snapshotTable(snapshots: SnapshotTimeline[]): string {
  if (snapshots.length === 0) return "_No snapshots found._";
  const rows = snapshots.map((s) => {
    const first = s.points[0]?.total ?? 0;
    const delta = s.currentTotal - first;
    const deltaText = delta === 0 ? "–" : delta > 0 ? `+${delta}` : `${delta}`;
    return `| ${s.name} | ${s.currentTotal} | ${first} | ${deltaText} | ${s.lastSeen} |`;
  });
  return [
    "| Snapshot | Current | Baseline | Trend | Last update |",
    "| --- | ---: | ---: | ---: | --- |",
    ...rows,
  ].join("\n");
}

function snapshotTimeline(s: SnapshotTimeline): string {
  const rows = s.points.map(
    (p) => `| ${p.ts} | ${p.event} | ${p.total} | +${p.added} | -${p.removed} |`,
  );
  return [
    `<details><summary><strong>${s.name}</strong> — ${s.eventCount} event(s), current total ${s.currentTotal}</summary>`,
    "",
    "| Timestamp | Event | Total | Added | Removed |",
    "| --- | --- | ---: | ---: | ---: |",
    ...rows,
    "",
    "</details>",
  ].join("\n");
}

function ruleTable(rules: RuleRollup[]): string {
  if (rules.length === 0) return "_No rule activity recorded._";
  const rows = rules.map(
    (r) =>
      `| \`${r.ruleId}\` | ${r.level} | ${r.wcag.join(", ") || "—"} | +${r.addedCount} | -${r.removedCount} | ${signed(r.netChange)} |`,
  );
  return [
    "| Rule | Level | WCAG | Added | Removed | Net |",
    "| --- | --- | --- | ---: | ---: | ---: |",
    ...rows,
  ].join("\n");
}

function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "0";
}
