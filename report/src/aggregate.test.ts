import { describe, expect, it } from "vitest";
import { aggregate } from "./aggregate.js";
import type { HistoryRecord } from "./history.js";

function rec(partial: Partial<HistoryRecord>): HistoryRecord {
  return {
    ts: "2026-04-01T00:00:00Z",
    name: "home",
    event: "created",
    added: 0,
    removed: 0,
    total: 0,
    addedRules: [],
    removedRules: [],
    ...partial,
  };
}

describe("aggregate", () => {
  it("builds one timeline per snapshot name", () => {
    const report = aggregate([
      rec({ name: "home", ts: "2026-04-01T00:00:00Z", event: "created", total: 2 }),
      rec({ name: "login", ts: "2026-04-01T00:00:00Z", event: "created", total: 1 }),
      rec({
        name: "home",
        ts: "2026-04-02T00:00:00Z",
        event: "ratchet-down",
        total: 1,
        removed: 1,
      }),
    ]);
    expect(report.snapshots).toHaveLength(2);
    const home = report.snapshots.find((s) => s.name === "home")!;
    expect(home.eventCount).toBe(2);
    expect(home.currentTotal).toBe(1);
    expect(home.firstSeen).toBe("2026-04-01T00:00:00Z");
    expect(home.lastSeen).toBe("2026-04-02T00:00:00Z");
  });

  it("rolls up rule counts across events", () => {
    const report = aggregate([
      rec({
        event: "created",
        added: 2,
        total: 2,
        addedRules: ["text-alternatives/img-alt", "navigable/link-name"],
      }),
      rec({
        ts: "2026-04-02T00:00:00Z",
        event: "ratchet-down",
        removed: 1,
        total: 1,
        removedRules: ["navigable/link-name"],
      }),
    ]);

    const linkName = report.rules.find((r) => r.ruleId === "navigable/link-name")!;
    expect(linkName.addedCount).toBe(1);
    expect(linkName.removedCount).toBe(1);
    expect(linkName.netChange).toBe(0);

    const imgAlt = report.rules.find((r) => r.ruleId === "text-alternatives/img-alt")!;
    expect(imgAlt.addedCount).toBe(1);
    expect(imgAlt.removedCount).toBe(0);
    expect(imgAlt.netChange).toBe(1);
  });

  it("joins WCAG metadata from core for known rules", () => {
    const report = aggregate([
      rec({ event: "created", added: 1, total: 1, addedRules: ["text-alternatives/img-alt"] }),
    ]);
    const imgAlt = report.rules.find((r) => r.ruleId === "text-alternatives/img-alt")!;
    expect(imgAlt.level).not.toBe("unknown");
    expect(imgAlt.wcag.length).toBeGreaterThan(0);
  });

  it("falls back to 'unknown' for unknown rules", () => {
    const report = aggregate([
      rec({ event: "created", added: 1, total: 1, addedRules: ["fictional/rule"] }),
    ]);
    const fictional = report.rules.find((r) => r.ruleId === "fictional/rule")!;
    expect(fictional.level).toBe("unknown");
    expect(fictional.wcag).toEqual([]);
  });

  it("summarizes event counts by type", () => {
    const report = aggregate([
      rec({ event: "created", added: 3, total: 3 }),
      rec({ ts: "2026-04-02T00:00:00Z", event: "ratchet-down", removed: 1, total: 2 }),
      rec({ ts: "2026-04-03T00:00:00Z", event: "force-update", added: 1, removed: 1, total: 2 }),
    ]);
    expect(report.summary).toMatchObject({
      eventCount: 3,
      createdCount: 1,
      ratchetCount: 1,
      forceUpdateCount: 1,
      totalAdded: 4,
      totalRemoved: 2,
    });
  });

  it("handles empty input", () => {
    const report = aggregate([]);
    expect(report.summary.snapshotCount).toBe(0);
    expect(report.summary.firstSeen).toBeNull();
    expect(report.snapshots).toEqual([]);
    expect(report.rules).toEqual([]);
  });
});
