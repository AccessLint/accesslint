/**
 * HTML report — utilitarian status report for engineering leadership.
 *
 * Self-contained: no runtime JS, no chart library, no external CDN beyond
 * an optional Google Fonts @import that falls back to system fonts when
 * blocked. The chart is hand-rolled SVG with redundant shape-and-colour
 * encoding for event types, semantic <title>/<desc> for screen readers,
 * and a visible event log below as the authoritative data table.
 */
import type { Report, SnapshotTimeline, SnapshotTimelinePoint } from "./aggregate.js";

export function emitHtml(report: Report): string {
  const sections = [
    skipLink(),
    pageHeader(report),
    tableOfContents(report),
    snapshotsSection(report),
    rulesSection(report),
    pageFooter(report),
  ];
  return renderPage(sections.filter(Boolean).join("\n"));
}

// ---------------------------------------------------------------------------
// Document shell
// ---------------------------------------------------------------------------

function renderPage(body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Accessibility snapshot report</title>
<style>${styles()}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

function skipLink(): string {
  return `<a class="skip-link" href="#main">Skip to report</a>`;
}

// ---------------------------------------------------------------------------
// Masthead + summary
// ---------------------------------------------------------------------------

function pageHeader(report: Report): string {
  const s = report.summary;
  const windowText =
    s.firstSeen && s.lastSeen
      ? `${formatDateShort(s.firstSeen)} – ${formatDateShort(s.lastSeen)}`
      : "No events recorded";

  return `<header class="masthead" role="banner">
  <p class="kicker">Accessibility snapshot report</p>
  <h1 class="title">Violation trends across ${s.snapshotCount} ${s.snapshotCount === 1 ? "surface" : "surfaces"}</h1>
  <dl class="dateline">
    <div><dt>Window</dt><dd>${escapeHtml(windowText)}</dd></div>
    <div><dt>Generated</dt><dd>${formatDateTime(report.generatedAt)}</dd></div>
  </dl>
  ${summaryStats(report)}
</header>`;
}

function summaryStats(report: Report): string {
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
  const stats: Array<{ value: string; label: string; hint: string; tone?: "regress" | "fix" }> = [
    {
      value: String(s.snapshotCount),
      label: "Snapshots",
      hint: "Surfaces under tracking",
    },
    {
      value: String(currentDebt),
      label: "Open violations",
      hint: "Sum of current totals across surfaces",
    },
    {
      value: String(baselined),
      label: "Initial baselines",
      hint: "Pre-existing debt captured at adoption",
    },
    {
      value: `−${s.totalRemoved}`,
      label: "Removed",
      hint: "Violations cleared in window",
      tone: "fix",
    },
    {
      value: `+${regressionsAccepted}`,
      label: "Regressions accepted",
      hint: "Violations added via force-update",
      tone: regressionsAccepted > 0 ? "regress" : undefined,
    },
    {
      value: String(s.forceUpdateCount),
      label: "Force-update events",
      hint: "Count of manual overrides",
      tone: s.forceUpdateCount > 0 ? "regress" : undefined,
    },
  ];
  const items = stats
    .map(
      (stat) =>
        `<div class="stat${stat.tone ? ` stat-${stat.tone}` : ""}"><dd class="stat-value">${escapeHtml(stat.value)}</dd><dt class="stat-label">${escapeHtml(stat.label)}</dt><p class="stat-hint">${escapeHtml(stat.hint)}</p></div>`,
    )
    .join("");
  return `<dl class="summary" aria-label="Report summary">${items}</dl>`;
}

// ---------------------------------------------------------------------------
// Table of contents — nav landmark, jump links into the snapshot cards
// ---------------------------------------------------------------------------

function tableOfContents(report: Report): string {
  if (report.snapshots.length === 0) return "";
  const items = report.snapshots
    .map((s) => {
      const first = s.points[0]?.total ?? 0;
      const last = s.currentTotal;
      const delta = last - first;
      const deltaText =
        delta === 0
          ? "–"
          : delta > 0
            ? `+${delta}`
            : `−${Math.abs(delta)}`;
      const deltaClass =
        delta === 0 ? "toc-delta toc-delta-flat" : delta > 0 ? "toc-delta toc-delta-regress" : "toc-delta toc-delta-fix";
      return `<li><a href="#snapshot-${anchorId(s.name)}"><span class="toc-name">${escapeHtml(s.name)}</span><span class="toc-total">${s.currentTotal}</span><span class="${deltaClass}">${escapeHtml(deltaText)}</span></a></li>`;
    })
    .join("");
  return `<nav class="toc" aria-labelledby="toc-heading">
  <h2 id="toc-heading" class="section-label">Surfaces</h2>
  <ol>${items}</ol>
</nav>`;
}

// ---------------------------------------------------------------------------
// Snapshots section
// ---------------------------------------------------------------------------

function snapshotsSection(report: Report): string {
  if (report.snapshots.length === 0) {
    return `<main id="main" class="main"><section class="empty"><h2 class="section-label">Snapshots</h2><p>No snapshots found.</p></section></main>`;
  }
  const cards = report.snapshots.map(snapshotCard).join("\n");
  return `<main id="main" class="main">
<section aria-labelledby="snapshots-heading">
<h2 id="snapshots-heading" class="section-label">Snapshots</h2>
${cards}
</section>`;
}

function snapshotCard(s: SnapshotTimeline): string {
  const anchor = anchorId(s.name);
  const first = s.points[0]?.total ?? 0;
  const delta = s.currentTotal - first;
  const trendTone = delta < 0 ? "trend-fix" : delta > 0 ? "trend-regress" : "trend-flat";
  const trendText =
    delta === 0
      ? "unchanged"
      : delta < 0
        ? `−${Math.abs(delta)} from baseline`
        : `+${delta} from baseline`;

  return `<article class="snapshot" id="snapshot-${anchor}" aria-labelledby="snapshot-${anchor}-title">
  <header class="snapshot-head">
    <h3 id="snapshot-${anchor}-title" class="snapshot-title">${escapeHtml(s.name)}</h3>
    <dl class="snapshot-meta">
      <div><dt>Current</dt><dd>${s.currentTotal}</dd></div>
      <div><dt>Baseline</dt><dd>${first}</dd></div>
      <div><dt>Last update</dt><dd>${formatDateShort(s.lastSeen)}</dd></div>
      <div class="${trendTone}"><dt>Trend</dt><dd>${escapeHtml(trendText)}</dd></div>
    </dl>
  </header>
  <figure class="chart-figure">
    <figcaption id="chart-${anchor}-caption" class="chart-caption">
      Open violations over time for <code>${escapeHtml(s.name)}</code>. Shape indicates event type: circle = baseline created; diamond = automatic ratchet-down; triangle = regression accepted via force-update.
    </figcaption>
    ${chartSvg(s, anchor)}
  </figure>
  ${eventLog(s)}
</article>`;
}

// ---------------------------------------------------------------------------
// Hand-rolled SVG chart.
//
// Redundant encoding for event type: circle = created, diamond = ratchet-down,
// triangle = force-update. Shape carries the same information as colour so
// colourblind readers lose nothing. Every marker has a <title> with the full
// event description for hover + pointer AT. The <svg> itself has <title>
// and <desc> children that summarise the chart so screen readers can describe
// it without having to parse the geometry. Below the chart the visible event
// log provides the authoritative data table.
// ---------------------------------------------------------------------------

function chartSvg(s: SnapshotTimeline, anchor: string): string {
  const width = 720;
  const height = 220;
  const padL = 44;
  const padR = 24;
  const padT = 18;
  const padB = 34;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const descId = `chart-${anchor}-desc`;
  const titleId = `chart-${anchor}-title`;
  const points = s.points;

  if (points.length === 0) {
    return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${titleId}"><title id="${titleId}">No data for ${escapeHtml(s.name)}</title></svg>`;
  }

  const times = points.map((p) => Date.parse(p.ts));
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const maxY = Math.max(1, ...points.map((p) => p.total));
  const niceMax = niceCeil(maxY);

  const xFor = (ts: number): number =>
    tMax === tMin ? padL + innerW / 2 : padL + ((ts - tMin) / (tMax - tMin)) * innerW;
  const yFor = (v: number): number => padT + innerH - (v / niceMax) * innerH;

  const linePts = points.map((p) => ({ x: xFor(Date.parse(p.ts)), y: yFor(p.total), p }));
  const polyline = linePts.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const baseY = padT + innerH;
  const areaPath =
    `M ${linePts[0].x.toFixed(1)},${baseY} ` +
    linePts.map((pt) => `L ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ") +
    ` L ${linePts[linePts.length - 1].x.toFixed(1)},${baseY} Z`;

  const gridLines = gridYValues(niceMax)
    .map((v) => {
      const y = yFor(v).toFixed(1);
      return `<line class="chart-grid" x1="${padL}" x2="${padL + innerW}" y1="${y}" y2="${y}" aria-hidden="true" />
      <text class="chart-tick-y" x="${padL - 8}" y="${y}" aria-hidden="true">${v}</text>`;
    })
    .join("");

  const xTicks = monthTicks(tMin, tMax)
    .map((t) => {
      const x = xFor(t.ts).toFixed(1);
      return `<line class="chart-tick-mark" x1="${x}" x2="${x}" y1="${baseY}" y2="${baseY + 4}" aria-hidden="true" />
      <text class="chart-tick-x" x="${x}" y="${baseY + 18}" aria-hidden="true">${escapeHtml(t.label)}</text>`;
    })
    .join("");

  const markers = linePts
    .map((pt) => {
      const { p, x, y } = pt;
      const label = markerLabel(p);
      return `<g class="marker marker-${p.event}" role="img" aria-label="${escapeHtml(label)}">
      <title>${escapeHtml(label)}</title>
      ${markerShape(p.event, x, y)}
    </g>`;
    })
    .join("\n");

  const desc = chartDescription(s);

  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${titleId} ${descId}" focusable="false">
    <title id="${titleId}">Open violations for ${escapeHtml(s.name)} over ${points.length} event${points.length === 1 ? "" : "s"}</title>
    <desc id="${descId}">${escapeHtml(desc)}</desc>
    ${gridLines}
    <path class="chart-area" d="${areaPath}" aria-hidden="true" />
    <polyline class="chart-line" points="${polyline}" aria-hidden="true" />
    <line class="chart-axis" x1="${padL}" x2="${padL + innerW}" y1="${baseY}" y2="${baseY}" aria-hidden="true" />
    ${xTicks}
    ${markers}
  </svg>`;
}

function markerShape(event: SnapshotTimelinePoint["event"], x: number, y: number): string {
  const cx = x.toFixed(1);
  const cy = y.toFixed(1);
  if (event === "ratchet-down") {
    return `<rect x="${(x - 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="8" height="8" transform="rotate(45 ${cx} ${cy})" />`;
  }
  if (event === "force-update") {
    return `<polygon points="${cx},${(y - 5).toFixed(1)} ${(x + 4.5).toFixed(1)},${(y + 4).toFixed(1)} ${(x - 4.5).toFixed(1)},${(y + 4).toFixed(1)}" />`;
  }
  return `<circle cx="${cx}" cy="${cy}" r="4" />`;
}

function markerLabel(p: SnapshotTimelinePoint): string {
  const parts = [formatDateShort(p.ts), p.event, `total ${p.total}`];
  if (p.added > 0) parts.push(`+${p.added} added`);
  if (p.removed > 0) parts.push(`−${p.removed} removed`);
  return parts.join(", ");
}

function chartDescription(s: SnapshotTimeline): string {
  const points = s.points;
  if (points.length === 0) return "No events recorded.";
  const first = points[0].total;
  const last = points[points.length - 1].total;
  const max = Math.max(...points.map((p) => p.total));
  const min = Math.min(...points.map((p) => p.total));
  const forceUpdates = points.filter((p) => p.event === "force-update").length;
  const parts: string[] = [];
  parts.push(
    `Line chart spanning ${formatDateShort(points[0].ts)} to ${formatDateShort(points[points.length - 1].ts)}, ${points.length} events.`,
  );
  parts.push(`Y axis range ${min} to ${max}, currently ${last}.`);
  if (last < first) parts.push(`Reduced by ${first - last} from the initial baseline of ${first}.`);
  else if (last > first) parts.push(`Increased by ${last - first} from the initial baseline of ${first}.`);
  else parts.push(`Unchanged from the initial baseline of ${first}.`);
  if (forceUpdates > 0) {
    parts.push(
      `${forceUpdates} regression${forceUpdates === 1 ? " was" : "s were"} accepted via force-update.`,
    );
  }
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Visible event log — collapsible, retains the data for sighted users too
// ---------------------------------------------------------------------------

function eventLog(s: SnapshotTimeline): string {
  const rows = s.points
    .map(
      (p) => `<tr>
      <td class="col-ts">${formatDateTime(p.ts)}</td>
      <td class="col-event"><span class="tag tag-${p.event}" aria-hidden="true">${eventGlyph(p.event)}</span><span>${escapeHtml(p.event)}</span></td>
      <td class="num">${p.total}</td>
      <td class="num num-add">${p.added === 0 ? "–" : `+${p.added}`}</td>
      <td class="num num-rem">${p.removed === 0 ? "–" : `−${p.removed}`}</td>
    </tr>`,
    )
    .join("\n");
  return `<details class="event-log">
    <summary><span class="details-chevron" aria-hidden="true"></span>Event log <span class="count">(${s.eventCount})</span></summary>
    <table class="data-table">
      <caption class="visually-hidden">Event log for ${escapeHtml(s.name)}</caption>
      <thead><tr><th scope="col">Timestamp</th><th scope="col">Event</th><th scope="col">Total</th><th scope="col">Added</th><th scope="col">Removed</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </details>`;
}

// ---------------------------------------------------------------------------
// Rule movement table
// ---------------------------------------------------------------------------

function rulesSection(report: Report): string {
  if (report.rules.length === 0) {
    return `<section aria-labelledby="rules-heading"><h2 id="rules-heading" class="section-label">Rule movement</h2><p>No rule activity recorded.</p></section></main>`;
  }
  const rows = report.rules
    .map(
      (r) => `<tr>
      <th scope="row"><code>${escapeHtml(r.ruleId)}</code></th>
      <td>${levelBadge(r.level)}</td>
      <td class="wcag-criteria">${escapeHtml(r.wcag.join(", ") || "–")}</td>
      <td class="num num-add">${r.addedCount === 0 ? "–" : `+${r.addedCount}`}</td>
      <td class="num num-rem">${r.removedCount === 0 ? "–" : `−${r.removedCount}`}</td>
      <td class="num ${netClass(r.netChange)}">${renderNet(r.netChange)}</td>
    </tr>`,
    )
    .join("\n");
  return `<section aria-labelledby="rules-heading" class="rules-section">
<h2 id="rules-heading" class="section-label">Rule movement</h2>
<div class="table-scroll">
<table class="data-table rule-table">
  <caption class="visually-hidden">Rule movement across the reporting window. WCAG mapping is joined from @accesslint/core at report time.</caption>
  <thead><tr><th scope="col">Rule</th><th scope="col">Level</th><th scope="col">WCAG</th><th scope="col">Added</th><th scope="col">Removed</th><th scope="col">Net change</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>
</section>
</main>`;
}

function levelBadge(level: string): string {
  const cls =
    level === "A" ? "level-a" : level === "AA" ? "level-aa" : level === "AAA" ? "level-aaa" : "level-unknown";
  return `<span class="level ${cls}">${escapeHtml(level === "unknown" ? "–" : level)}</span>`;
}

function netClass(n: number): string {
  if (n > 0) return "num-add";
  if (n < 0) return "num-rem";
  return "num-flat";
}

function renderNet(n: number): string {
  if (n > 0) return `<span class="direction" aria-hidden="true">▲</span><span class="sr-text">increased by </span>${n}`;
  if (n < 0) return `<span class="direction" aria-hidden="true">▼</span><span class="sr-text">decreased by </span>${Math.abs(n)}`;
  return `<span class="direction" aria-hidden="true">=</span><span class="sr-text">unchanged</span>0`;
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function pageFooter(report: Report): string {
  return `<footer class="page-footer" role="contentinfo">
    <p><code>@accesslint/report</code> · ${escapeHtml(report.generatedAt)}</p>
  </footer>`;
}

// ---------------------------------------------------------------------------
// Formatting + small helpers
// ---------------------------------------------------------------------------

function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }) + " UTC"
  );
}

function eventGlyph(event: SnapshotTimelinePoint["event"]): string {
  if (event === "created") return "○";
  if (event === "ratchet-down") return "◆";
  return "▲";
}

function anchorId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function niceCeil(n: number): number {
  if (n <= 5) return 5;
  if (n <= 10) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const step = pow / 2;
  return Math.ceil(n / step) * step;
}

function gridYValues(niceMax: number): number[] {
  const ticks = 4;
  const out: number[] = [];
  for (let i = 0; i <= ticks; i++) {
    out.push(Math.round((niceMax / ticks) * i));
  }
  return [...new Set(out)];
}

function monthTicks(tMin: number, tMax: number): Array<{ ts: number; label: string }> {
  if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMax <= tMin) return [];
  const out: Array<{ ts: number; label: string }> = [];
  const start = new Date(tMin);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  if (start.getTime() < tMin) start.setUTCMonth(start.getUTCMonth() + 1);
  const MS_PER_DAY = 86400000;
  const spanDays = (tMax - tMin) / MS_PER_DAY;
  const stride = spanDays > 240 ? 2 : 1;
  const fmt: Intl.DateTimeFormatOptions = { month: "short", timeZone: "UTC" };
  let cursor = new Date(start);
  while (cursor.getTime() <= tMax) {
    out.push({ ts: cursor.getTime(), label: cursor.toLocaleDateString("en-US", fmt).toUpperCase() });
    cursor = new Date(cursor);
    cursor.setUTCMonth(cursor.getUTCMonth() + stride);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function styles(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

/* ----- Tokens ----- */
:root {
  color-scheme: light dark;
  --paper: #ffffff;
  --paper-2: #f7f7f8;
  --paper-3: #eef0f3;
  --ink: #0f1419;
  --ink-2: #374151;
  --muted: #5e6672;
  --hairline: #e5e7eb;
  --hairline-2: #d1d5db;
  --regress: #b42318;
  --regress-bg: #fde8e6;
  --fix: #0b6b2e;
  --fix-bg: #dcf2e2;
  --chart-line: #1d4ed8;
  --chart-area: rgba(29, 78, 216, 0.10);
  --chart-grid: #eceef2;
  --focus: #1d4ed8;
  --focus-ring: rgba(29, 78, 216, 0.35);

  --font-body: 'IBM Plex Sans', -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, 'SF Mono', Consolas, monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #0d1117;
    --paper-2: #151a22;
    --paper-3: #1c2230;
    --ink: #e6e8ec;
    --ink-2: #c6cad1;
    --muted: #9199a4;
    --hairline: #232a36;
    --hairline-2: #2f3747;
    --regress: #f2867b;
    --regress-bg: #2a1513;
    --fix: #6ec58a;
    --fix-bg: #0f2318;
    --chart-line: #7ea6f5;
    --chart-area: rgba(126, 166, 245, 0.14);
    --chart-grid: #202635;
    --focus: #7ea6f5;
    --focus-ring: rgba(126, 166, 245, 0.4);
  }
}

/* ----- Reset + base ----- */
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink);
  background: var(--paper);
  font-feature-settings: "kern", "liga", "calt";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a { color: var(--ink); text-decoration-thickness: 1px; text-underline-offset: 2px; }
a:hover { color: var(--focus); }
*:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
  border-radius: 2px;
}

.visually-hidden, .sr-text {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ----- Skip link ----- */
.skip-link {
  position: absolute;
  top: 8px; left: 8px;
  padding: 8px 12px;
  background: var(--ink);
  color: var(--paper);
  font-weight: 500;
  font-size: 13px;
  text-decoration: none;
  border-radius: 3px;
  transform: translateY(-120%);
  transition: transform 120ms ease-out;
  z-index: 10;
}
.skip-link:focus { transform: translateY(0); }
@media (prefers-reduced-motion: reduce) {
  .skip-link { transition: none; }
}

/* ----- Layout container ----- */
.masthead, .toc, .main, .page-footer {
  max-width: 1080px;
  margin: 0 auto;
  padding-left: 40px;
  padding-right: 40px;
}
@media (max-width: 720px) {
  .masthead, .toc, .main, .page-footer {
    padding-left: 20px;
    padding-right: 20px;
  }
}

/* ----- Masthead ----- */
.masthead {
  padding-top: 48px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--hairline);
}
.kicker {
  margin: 0 0 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 500;
}
.title {
  margin: 0 0 24px;
  font-weight: 600;
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.015em;
  color: var(--ink);
  max-width: 60ch;
}
.dateline {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  margin: 0 0 28px;
  padding: 0;
}
.dateline div { display: flex; flex-direction: column; gap: 2px; }
.dateline dt {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 500;
}
.dateline dd { margin: 0; font-size: 13px; color: var(--ink); font-variant-numeric: tabular-nums; }

/* ----- Summary stats ----- */
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0;
  margin: 0;
  padding: 0;
  border: 1px solid var(--hairline);
  border-radius: 4px;
  background: var(--paper-2);
  overflow: hidden;
}
.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px 16px;
  border-right: 1px solid var(--hairline);
  background: var(--paper);
}
.stat:last-child { border-right: none; }
.stat-value {
  margin: 0;
  font-weight: 600;
  font-size: 22px;
  line-height: 1.1;
  color: var(--ink);
  font-variant-numeric: tabular-nums lining-nums;
  letter-spacing: -0.01em;
}
.stat-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 500;
}
.stat-hint {
  margin: 2px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}
.stat-regress .stat-value { color: var(--regress); }
.stat-fix .stat-value { color: var(--fix); }

/* ----- TOC ----- */
.toc {
  padding-top: 28px;
  padding-bottom: 8px;
}
.section-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0 0 12px;
  font-weight: 500;
}
.toc ol {
  list-style: none;
  margin: 0; padding: 0;
  border: 1px solid var(--hairline);
  border-radius: 4px;
  overflow: hidden;
  background: var(--paper);
}
.toc li { margin: 0; border-bottom: 1px solid var(--hairline); }
.toc li:last-child { border-bottom: none; }
.toc a {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  text-decoration: none;
  font-size: 13px;
}
.toc a:hover { background: var(--paper-2); }
.toc-name { font-family: var(--font-mono); color: var(--ink); }
.toc-total {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  min-width: 2ch;
  text-align: right;
}
.toc-delta {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  min-width: 5ch;
  text-align: right;
}
.toc-delta-fix { color: var(--fix); }
.toc-delta-regress { color: var(--regress); }
.toc-delta-flat { color: var(--muted); }

/* ----- Main body ----- */
.main {
  padding-top: 16px;
  padding-bottom: 48px;
}

/* ----- Snapshot card ----- */
.snapshot {
  padding: 28px 0;
  border-top: 1px solid var(--hairline);
}
.snapshot:first-of-type { border-top-color: var(--ink-2); border-top-width: 1px; }
.snapshot-head { margin-bottom: 20px; }
.snapshot-title {
  margin: 0 0 14px;
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 16px;
  color: var(--ink);
  letter-spacing: 0;
}
.snapshot-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  margin: 0;
  padding: 0;
}
.snapshot-meta > div { display: flex; flex-direction: column; gap: 3px; }
.snapshot-meta dt {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 500;
}
.snapshot-meta dd {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.trend-fix dd { color: var(--fix); }
.trend-regress dd { color: var(--regress); }
.trend-flat dd { color: var(--muted); font-weight: 500; }

/* ----- Chart ----- */
.chart-figure {
  margin: 0;
  padding: 0;
  background: var(--paper);
  border: 1px solid var(--hairline);
  border-radius: 4px;
  overflow: hidden;
}
.chart-caption {
  font-size: 12px;
  color: var(--muted);
  padding: 12px 16px;
  line-height: 1.5;
  border-bottom: 1px solid var(--hairline);
  background: var(--paper-2);
}
.chart-caption code {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-2);
  background: transparent;
  padding: 0;
}
.chart {
  display: block;
  width: 100%;
  height: auto;
  padding: 12px 8px 8px;
}
.chart-grid { stroke: var(--chart-grid); stroke-width: 1; stroke-dasharray: 1 3; }
.chart-axis { stroke: var(--hairline-2); stroke-width: 1; }
.chart-tick-mark { stroke: var(--hairline-2); stroke-width: 1; }
.chart-tick-x {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  fill: var(--muted);
  text-anchor: middle;
}
.chart-tick-y {
  font-family: var(--font-mono);
  font-size: 10px;
  fill: var(--muted);
  text-anchor: end;
  dominant-baseline: middle;
  font-variant-numeric: tabular-nums;
}
.chart-area { fill: var(--chart-area); }
.chart-line { fill: none; stroke: var(--chart-line); stroke-width: 1.5; stroke-linejoin: round; }
.marker { cursor: default; }
.marker-created circle {
  fill: var(--paper);
  stroke: var(--chart-line);
  stroke-width: 1.5;
}
.marker-ratchet-down rect {
  fill: var(--fix);
  stroke: var(--paper);
  stroke-width: 1.25;
}
.marker-force-update polygon {
  fill: var(--regress);
  stroke: var(--paper);
  stroke-width: 1.25;
}

/* ----- Event log ----- */
.event-log {
  margin-top: 20px;
  border: 1px solid var(--hairline);
  border-radius: 4px;
  background: var(--paper);
  overflow: hidden;
}
.event-log summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-2);
  padding: 10px 14px;
  font-weight: 500;
}
.event-log summary::-webkit-details-marker { display: none; }
.event-log[open] summary { border-bottom: 1px solid var(--hairline); background: var(--paper-2); }
.details-chevron {
  width: 0; height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--muted);
  transition: transform 140ms ease-out;
}
.event-log[open] .details-chevron { transform: rotate(180deg); }
@media (prefers-reduced-motion: reduce) {
  .details-chevron { transition: none; }
}
.event-log .count { color: var(--muted); font-weight: 400; margin-left: 2px; }
.event-log > .data-table { margin: 0; }
.event-log > .data-table thead th { padding-left: 14px; padding-right: 14px; }
.event-log > .data-table tbody th:first-child,
.event-log > .data-table tbody td:first-child { padding-left: 14px; }
.event-log > .data-table tbody tr:last-child td { border-bottom: none; }

/* ----- Data tables ----- */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: var(--paper);
}
.data-table thead th {
  text-align: left;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 500;
  padding: 10px 12px;
  background: var(--paper-2);
  border-bottom: 1px solid var(--hairline);
}
.data-table tbody th,
.data-table tbody td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--hairline);
  vertical-align: baseline;
  text-align: left;
}
.data-table tbody th { font-weight: 400; }
.data-table tbody tr:hover { background: var(--paper-2); }
.data-table .col-ts { white-space: nowrap; color: var(--ink-2); font-variant-numeric: tabular-nums; }
.data-table .col-event { white-space: nowrap; }
.data-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink);
}
.data-table code {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink);
  background: transparent;
  padding: 0;
}
.num-add { color: var(--regress); }
.num-rem { color: var(--fix); }
.num-flat { color: var(--muted); }
.direction {
  display: inline-block;
  margin-right: 3px;
  font-size: 9px;
  transform: translateY(-1px);
}
.wcag-criteria { font-family: var(--font-mono); font-size: 12px; color: var(--ink-2); white-space: nowrap; }

.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--hairline);
  border-radius: 4px;
}
.rules-section {
  padding-top: 32px;
  border-top: 1px solid var(--ink-2);
  margin-top: 24px;
}

/* ----- Event tags ----- */
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px; height: 18px;
  border-radius: 50%;
  font-size: 9px;
  margin-right: 8px;
  vertical-align: middle;
  border: 1px solid var(--hairline-2);
  background: var(--paper-2);
}
.tag-created { color: var(--chart-line); border-color: var(--hairline-2); }
.tag-ratchet-down { background: var(--fix-bg); color: var(--fix); border-color: transparent; }
.tag-force-update { background: var(--regress-bg); color: var(--regress); border-color: transparent; }

/* ----- Level badges ----- */
.level {
  display: inline-block;
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  border: 1px solid var(--hairline-2);
  border-radius: 2px;
  color: var(--ink);
  font-weight: 500;
}
.level-a { color: var(--ink-2); }
.level-aa { color: var(--ink); background: var(--paper-3); border-color: transparent; }
.level-aaa { color: var(--chart-line); border-color: var(--chart-line); }
.level-unknown { color: var(--muted); border-style: dashed; }

/* ----- Footer ----- */
.page-footer {
  padding-top: 24px;
  padding-bottom: 24px;
  border-top: 1px solid var(--hairline);
  color: var(--muted);
  font-size: 12px;
}
.page-footer p { margin: 0; }
.page-footer code {
  font-family: var(--font-mono);
  color: var(--ink-2);
  font-size: 12px;
}

/* ----- Print ----- */
@media print {
  body { background: white; color: black; }
  .skip-link, .toc { display: none; }
  .snapshot, .chart-figure, .event-log { break-inside: avoid; }
  .chart { max-height: 180px; }
  .data-table tbody tr:hover { background: transparent; }
}
`;
}
