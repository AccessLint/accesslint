import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { audit, getStoredAudit, clearStoredAudits } from "../src/lib/state.js";
import { diffAudit } from "@accesslint/core";
import { formatViolations, formatDiff } from "../src/lib/format.js";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("audit_html pipeline", () => {
  beforeEach(() => {
    clearStoredAudits();
  });

  it("finds violations in an image without alt", () => {
    const result = audit('<img src="photo.jpg">');
    expect(result.violations.length).toBeGreaterThan(0);
    const imgAlt = result.violations.find(
      (v) => v.ruleId === "text-alternatives/img-alt"
    );
    expect(imgAlt).toBeDefined();
    expect(imgAlt!.impact).toBe("critical");
  });

  it("returns no violations for accessible HTML", () => {
    const result = audit('<img src="photo.jpg" alt="A sunset">');
    const imgAlt = result.violations.find(
      (v) => v.ruleId === "text-alternatives/img-alt"
    );
    expect(imgAlt).toBeUndefined();
  });

  it("auto-enables componentMode for fragments", () => {
    // A fragment without <html> should not trigger page-level rules like html-lang
    const result = audit("<p>Hello world</p>");
    const pageLevelViolation = result.violations.find(
      (v) => v.ruleId === "readable/html-has-lang"
    );
    expect(pageLevelViolation).toBeUndefined();
  });

  it("detects page-level violations in full documents", () => {
    const result = audit(
      "<!DOCTYPE html><html><head><title>Test</title></head><body><p>Hello</p></body></html>"
    );
    const htmlLang = result.violations.find(
      (v) => v.ruleId === "readable/html-has-lang"
    );
    expect(htmlLang).toBeDefined();
  });

  it("stores named audits for later diffing", () => {
    audit('<img src="photo.jpg">', { name: "before" });
    const stored = getStoredAudit("before");
    expect(stored).toBeDefined();
    expect(stored!.violations.length).toBeGreaterThan(0);
  });

  it("formats violations into readable text", () => {
    const result = audit('<img src="photo.jpg">');
    const text = formatViolations(result.violations);
    expect(text).toContain("accessibility violation");
    expect(text).toContain("text-alternatives/img-alt");
  });
});

describe("diff_html pipeline", () => {
  beforeEach(() => {
    clearStoredAudits();
  });

  it("shows fixed violations after correction", () => {
    const before = audit('<img src="photo.jpg">', { name: "before" });
    const after = audit('<img src="photo.jpg" alt="A photo">');
    const diff = diffAudit(before, after);

    expect(diff.fixed.length).toBeGreaterThan(0);
    const fixedImgAlt = diff.fixed.find(
      (v) => v.ruleId === "text-alternatives/img-alt"
    );
    expect(fixedImgAlt).toBeDefined();
  });

  it("shows new violations introduced", () => {
    const before = audit('<img src="photo.jpg" alt="A photo">', {
      name: "before",
    });
    const after = audit('<img src="other.jpg">');
    const diff = diffAudit(before, after);

    expect(diff.added.length).toBeGreaterThan(0);
  });

  it("formats diff output", () => {
    const before = audit('<img src="photo.jpg">', { name: "before" });
    const after = audit('<img src="photo.jpg" alt="A photo">');
    const diff = diffAudit(before, after);
    const text = formatDiff(diff);
    expect(text).toContain("fixed");
  });
});

describe("audit_file pipeline", () => {
  const tmpFile = join(tmpdir(), "accesslint-mcp-test.html");

  it("reads and audits an HTML file", async () => {
    await writeFile(
      tmpFile,
      '<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body><img src="photo.jpg"></body></html>'
    );
    try {
      const html = await readFile(tmpFile, "utf-8");
      const result = audit(html);
      expect(result.violations.length).toBeGreaterThan(0);
    } finally {
      await unlink(tmpFile).catch(() => {});
    }
  });
});

describe("list_rules pipeline", () => {
  it("returns active rules from core", async () => {
    const { getActiveRules } = await import("@accesslint/core");
    const rules = getActiveRules();
    expect(rules.length).toBeGreaterThan(0);

    // Every rule has required fields
    for (const rule of rules) {
      expect(rule.id).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(["A", "AA", "AAA"]).toContain(rule.level);
    }
  });

  it("filters rules by category", async () => {
    const { getActiveRules } = await import("@accesslint/core");
    const rules = getActiveRules().filter((r) => r.category === "aria");
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.id).toMatch(/^aria\//);
    }
  });
});

describe("audit_url pipeline", () => {
  beforeEach(() => {
    clearStoredAudits();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(body: string, init?: { status?: number; statusText?: string; contentType?: string }) {
    const status = init?.status ?? 200;
    const statusText = init?.statusText ?? "OK";
    const contentType = init?.contentType ?? "text/html; charset=utf-8";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(body, {
          status,
          statusText,
          headers: { "content-type": contentType },
        })
      )
    );
  }

  it("fetches HTML and finds violations", async () => {
    mockFetch('<html><body><img src="photo.jpg"></body></html>');
    const html = await (await fetch("http://example.com")).text();
    const result = audit(html, {});
    expect(result.violations.length).toBeGreaterThan(0);
    const text = formatViolations(result.violations);
    expect(text).toContain("text-alternatives/img-alt");
  });

  it("returns no violations for accessible HTML", async () => {
    mockFetch(
      '<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body><img src="photo.jpg" alt="A sunset"></body></html>'
    );
    const html = await (await fetch("http://example.com")).text();
    const result = audit(html, {});
    const imgAlt = result.violations.find(
      (v) => v.ruleId === "text-alternatives/img-alt"
    );
    expect(imgAlt).toBeUndefined();
  });

  it("handles network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED"))
    );
    await expect(fetch("http://localhost:9999")).rejects.toThrow("ECONNREFUSED");
  });

  it("handles non-200 responses", async () => {
    mockFetch("Not Found", { status: 404, statusText: "Not Found" });
    const response = await fetch("http://example.com/missing");
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  it("handles non-HTML content types", async () => {
    mockFetch('{"key": "value"}', { contentType: "application/json" });
    const response = await fetch("http://example.com/api");
    const contentType = response.headers.get("content-type") ?? "";
    expect(contentType.includes("text/html")).toBe(false);
  });

  it("stores named audit for later diffing", async () => {
    mockFetch('<html><body><img src="photo.jpg"></body></html>');
    const html = await (await fetch("http://example.com")).text();
    audit(html, { name: "url-audit" });
    const stored = getStoredAudit("url-audit");
    expect(stored).toBeDefined();
    expect(stored!.violations.length).toBeGreaterThan(0);
  });

  it("applies min_impact filtering", async () => {
    mockFetch('<html><body><img src="photo.jpg"></body></html>');
    const html = await (await fetch("http://example.com")).text();
    const result = audit(html, {});
    const text = formatViolations(result.violations, { minImpact: "critical" });
    expect(text).toContain("[CRITICAL]");
    expect(text).not.toContain("[MINOR]");
    expect(text).not.toContain("[MODERATE]");
  });
});
