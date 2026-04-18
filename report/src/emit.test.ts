import { describe, expect, it } from "vitest";
import { aggregate } from "./aggregate.js";
import { emitJson } from "./emit-json.js";
import { emitMarkdown } from "./emit-md.js";
import { emitHtml } from "./emit-html.js";
import type { HistoryRecord } from "./history.js";

const sample: HistoryRecord[] = [
  {
    ts: "2026-04-01T00:00:00Z",
    name: "login-form",
    event: "created",
    added: 2,
    removed: 0,
    total: 2,
    addedRules: ["text-alternatives/img-alt", "navigable/link-name"],
    removedRules: [],
  },
  {
    ts: "2026-04-02T00:00:00Z",
    name: "login-form",
    event: "ratchet-down",
    added: 0,
    removed: 1,
    total: 1,
    addedRules: [],
    removedRules: ["navigable/link-name"],
  },
];

describe("emitJson", () => {
  it("is valid round-trippable JSON", () => {
    const out = emitJson(aggregate(sample));
    const parsed = JSON.parse(out);
    expect(parsed.snapshots).toHaveLength(1);
    expect(parsed.snapshots[0].name).toBe("login-form");
  });
});

describe("emitMarkdown", () => {
  it("includes summary, snapshot table, and rule table", () => {
    const out = emitMarkdown(aggregate(sample));
    expect(out).toContain("# Accessibility snapshot report");
    expect(out).toContain("## Snapshots");
    expect(out).toContain("## Rule movement");
    expect(out).toContain("login-form");
    expect(out).toContain("text-alternatives/img-alt");
  });

  it("handles empty input without blowing up", () => {
    const out = emitMarkdown(aggregate([]));
    expect(out).toContain("No snapshots found");
    expect(out).toContain("No rule activity recorded");
  });
});

describe("emitHtml", () => {
  it("emits a well-formed HTML document with the report data", () => {
    const out = emitHtml(aggregate(sample));
    expect(out).toMatch(/^<!doctype html>/);
    expect(out).toContain("<title>Accessibility snapshot report</title>");
    expect(out).toContain("login-form");
    expect(out).toContain("text-alternatives/img-alt");
  });

  it("escapes hostile snapshot names", () => {
    const hostile: HistoryRecord[] = [
      {
        ts: "2026-04-01T00:00:00Z",
        name: "<script>alert(1)</script>",
        event: "created",
        added: 0,
        removed: 0,
        total: 0,
        addedRules: [],
        removedRules: [],
      },
    ];
    const out = emitHtml(aggregate(hostile));
    expect(out).not.toContain("<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
