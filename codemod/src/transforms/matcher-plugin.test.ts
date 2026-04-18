import { describe, it, expect } from "vitest";
import jscodeshift from "jscodeshift";
import transform from "./matcher-plugin.js";
import type { MatcherPluginOptions } from "./matcher-plugin.js";

const jestAxeOpts: MatcherPluginOptions = {
  sourceModule: "jest-axe",
  targetModule: "@accesslint/jest",
};

const vitestAxeOpts: MatcherPluginOptions = {
  sourceModule: "vitest-axe",
  targetModule: "@accesslint/vitest",
};

const run = (source: string, opts: MatcherPluginOptions): string => {
  const j = jscodeshift.withParser("tsx");
  const api = {
    jscodeshift: j,
    j,
    stats: () => {},
    report: () => {},
  };
  const result = transform({ path: "test.tsx", source }, api as never, { ...opts });
  return typeof result === "string" ? result : source;
};

describe("matcher-plugin transform — jest-axe", () => {
  it("rewrites named import + collapses two-statement assertion", () => {
    const input = `import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

test("x", async () => {
  const container = document.createElement("div");
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
`;
    const output = run(input, jestAxeOpts);
    expect(output).toContain('import "@accesslint/jest"');
    expect(output).not.toContain("jest-axe");
    expect(output).not.toContain("expect.extend(toHaveNoViolations)");
    expect(output).toContain("expect(container).toBeAccessible()");
    expect(output).not.toContain("await axe");
  });

  it("handles aliased imports", () => {
    const input = `import { axe as a, toHaveNoViolations as tHNV } from "jest-axe";
expect.extend(tHNV);

test("x", async () => {
  const el = document.createElement("div");
  const r = await a(el);
  expect(r).tHNV();
});
`;
    const output = run(input, jestAxeOpts);
    expect(output).toContain('import "@accesslint/jest"');
    expect(output).not.toContain("jest-axe");
    expect(output).not.toContain("expect.extend(tHNV)");
    expect(output).toContain("expect(el).toBeAccessible()");
  });

  it("collapses the inline pattern", () => {
    const input = `import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

test("x", async () => {
  const container = document.createElement("div");
  expect(await axe(container)).toHaveNoViolations();
});
`;
    const output = run(input, jestAxeOpts);
    expect(output).toContain("expect(container).toBeAccessible()");
    expect(output).not.toContain("toHaveNoViolations");
    expect(output).not.toContain("await axe");
  });

  it("handles namespace import", () => {
    const input = `import * as jestAxe from "jest-axe";
expect.extend(jestAxe.toHaveNoViolations);

test("x", async () => {
  const container = document.createElement("div");
  const r = await jestAxe.axe(container);
  expect(r).jestAxe.toHaveNoViolations();
});
`;
    const output = run(input, jestAxeOpts);
    expect(output).toContain('import "@accesslint/jest"');
    expect(output).not.toContain('from "jest-axe"');
  });

  it("removes expect.extend({ toHaveNoViolations }) object form", () => {
    const input = `import { toHaveNoViolations } from "jest-axe";
expect.extend({ toHaveNoViolations });
`;
    const output = run(input, jestAxeOpts);
    expect(output).not.toContain("expect.extend");
    expect(output).toContain('import "@accesslint/jest"');
  });

  it("preserves configureAxe import and adds target side-effect import + TODO", () => {
    const input = `import { axe, toHaveNoViolations, configureAxe } from "jest-axe";
expect.extend(toHaveNoViolations);
const myAxe = configureAxe({ rules: { "color-contrast": { enabled: false } } });

test("x", async () => {
  const container = document.createElement("div");
  const r = await axe(container);
  expect(r).toHaveNoViolations();
});
`;
    const output = run(input, jestAxeOpts);
    expect(output).toContain('from "jest-axe"');
    expect(output).toContain("configureAxe");
    expect(output).not.toMatch(/import\s*\{[^}]*\baxe\b[^}]*\}\s*from\s*"jest-axe"/);
    expect(output).toContain('import "@accesslint/jest"');
    expect(output).toContain("TODO(accesslint-codemod)");
    expect(output).toContain("expect(container).toBeAccessible()");
  });

  it("collapses axe(c, opts) with TODO comment", () => {
    const input = `import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

test("x", async () => {
  const container = document.createElement("div");
  const r = await axe(container, { rules: { "color-contrast": { enabled: false } } });
  expect(r).toHaveNoViolations();
});
`;
    const output = run(input, jestAxeOpts);
    expect(output).toContain("expect(container).toBeAccessible()");
    expect(output).toContain("TODO(accesslint-codemod)");
    expect(output).toContain("original axe() options not auto-migrated");
  });

  it("rewrites CJS require form", () => {
    const input = `const { axe, toHaveNoViolations } = require("jest-axe");
expect.extend(toHaveNoViolations);

test("x", async () => {
  const container = document.createElement("div");
  const r = await axe(container);
  expect(r).toHaveNoViolations();
});
`;
    const output = run(input, jestAxeOpts);
    expect(output).toContain('require("@accesslint/jest")');
    expect(output).not.toContain('require("jest-axe")');
    expect(output).toContain("expect(container).toBeAccessible()");
  });

  it("returns source unchanged when jest-axe is not used", () => {
    const input = `import { render } from "@testing-library/react";

test("x", () => {
  expect(1).toBe(1);
});
`;
    const output = run(input, jestAxeOpts);
    expect(output).toBe(input);
  });
});

describe("matcher-plugin transform — vitest-axe (generalization)", () => {
  it("rewrites vitest-axe imports to @accesslint/vitest", () => {
    const input = `import { axe, toHaveNoViolations } from "vitest-axe";
import { expect, test } from "vitest";
expect.extend({ toHaveNoViolations });

test("x", async () => {
  const container = document.createElement("div");
  const r = await axe(container);
  expect(r).toHaveNoViolations();
});
`;
    const output = run(input, vitestAxeOpts);
    expect(output).toContain('import "@accesslint/vitest"');
    expect(output).not.toContain("vitest-axe");
    expect(output).toContain("expect(container).toBeAccessible()");
    expect(output).not.toContain("expect.extend");
  });

  it("is a no-op on a jest-axe file when configured for vitest-axe", () => {
    const input = `import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

test("x", async () => {
  const c = document.createElement("div");
  const r = await axe(c);
  expect(r).toHaveNoViolations();
});
`;
    const output = run(input, vitestAxeOpts);
    expect(output).toBe(input);
  });
});
