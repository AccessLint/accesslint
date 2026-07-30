import { describe, expect, it } from "vitest";
import { auditSource } from "./audit";
import { testDocument } from "./test-dom";
import type { SourceAuditResult } from "./types";

function audit(source: string, filename = "Component.tsx"): SourceAuditResult {
  return auditSource({ source, filename, document: testDocument() });
}

function ruleIds(result: SourceAuditResult): string[] {
  return result.findings.map((finding) => finding.ruleId);
}

function candidateIds(result: SourceAuditResult): string[] {
  return result.candidates.map((candidate) => candidate.ruleId);
}

describe("the cases the extensions were removed over", () => {
  it("reports a missing alt on an image whose src is an expression", () => {
    const result = audit(`
      export function Avatar({ user }) {
        return <img src={user.avatarUrl} />;
      }
    `);

    expect(ruleIds(result)).toContain("text-alternatives/img-alt");
    const finding = result.findings.find((f) => f.ruleId === "text-alternatives/img-alt");
    expect(finding?.line).toBe(3);
    expect(finding?.file).toBe("Component.tsx");
    expect(finding?.html).not.toContain("data-accesslint-node");
  });

  it("does not read an expression in a list as text content", () => {
    const result = audit(`
      export function List({ items }) {
        return <ul>{renderItems(items)}</ul>;
      }
    `);

    expect(ruleIds(result)).not.toContain("adaptable/list-children");
  });

  it("reports a non-li element mapped into a list", () => {
    const result = audit(`
      export function List({ items }) {
        return (
          <ul>
            {items.map((item) => (
              <div key={item.id}>{item.label}</div>
            ))}
          </ul>
        );
      }
    `);

    expect(ruleIds(result)).toContain("adaptable/list-children");
    const finding = result.findings.find((f) => f.ruleId === "adaptable/list-children");
    expect(finding?.line).toBe(6);
  });
});

describe("components and spreads", () => {
  it("keeps intrinsic islands inside a component auditable", () => {
    const result = audit(`
      export const Hero = () => (
        <Card>
          <img src="/hero.png" />
        </Card>
      );
    `);

    expect(ruleIds(result)).toContain("text-alternatives/img-alt");
  });

  it("suppresses a container finding when a child is a component", () => {
    const result = audit(`
      export const Menu = () => (
        <ul>
          <MenuItem />
          <div>Static</div>
        </ul>
      );
    `);

    expect(ruleIds(result)).not.toContain("adaptable/list-children");
    expect(candidateIds(result)).toContain("adaptable/list-children");
    const candidate = result.candidates.find((c) => c.ruleId === "adaptable/list-children");
    expect(candidate?.unknown.kind).toBe("component-child");
  });

  it("suppresses a missing attribute on an element carrying a spread", () => {
    const result = audit(`
      export const Icon = (props) => <img {...props} />;
    `);

    expect(result.findings).toEqual([]);
    expect(candidateIds(result)).toContain("text-alternatives/img-alt");
    expect(result.candidates[0]?.unknown.kind).toBe("spread");
    expect(result.candidates[0]?.unknown.expression).toBe("props");
  });

  it("reports a value written after the spread, which nothing can override", () => {
    const result = audit(`export const Row = (props) => <div {...props} tabIndex={5} />;`);
    expect(ruleIds(result)).toContain("keyboard-accessible/tabindex");
  });

  it("suppresses the same value written before the spread", () => {
    const result = audit(`export const Row = (props) => <div tabIndex={5} {...props} />;`);
    expect(ruleIds(result)).not.toContain("keyboard-accessible/tabindex");
    const candidate = result.candidates.find((c) => c.ruleId === "keyboard-accessible/tabindex");
    expect(candidate?.unknown.kind).toBe("spread");
  });
});

describe("expressions", () => {
  it("treats a false-valued attribute as provably absent", () => {
    const result = audit(`export const A = () => <img src="/a.png" alt={undefined} />;`);
    expect(ruleIds(result)).toContain("text-alternatives/img-alt");
  });

  it("treats an expression-valued alt as present but unknown", () => {
    const result = audit(`export const A = ({ alt }) => <img src="/a.png" alt={alt} />;`);
    expect(result.findings).toEqual([]);
  });

  it("stands in for an expression in text position", () => {
    const result = audit(`export const H = ({ title }) => <h2>{title}</h2>;`);
    expect(ruleIds(result)).not.toContain("navigable/empty-heading");
  });

  it("reports a heading that is empty in both arms of a conditional", () => {
    const result = audit(`
      export const H = ({ big }) => (big ? <h1></h1> : <h2></h2>);
    `);
    expect(ruleIds(result).filter((id) => id === "navigable/empty-heading")).toHaveLength(2);
  });

  it("silences heading order across two components in one file", () => {
    const result = audit(`
      export const Title = () => <h1>Title</h1>;
      export const Section = () => <h3>Section</h3>;
    `);
    expect(ruleIds(result)).not.toContain("navigable/heading-order");
    const candidate = result.candidates.find((c) => c.ruleId === "navigable/heading-order");
    expect(candidate?.unknown.kind).toBe("exclusive-branches");
  });

  it("silences heading order once the file emits exclusive branches", () => {
    const result = audit(`
      export const H = ({ big }) => (
        <div>
          <h1>Title</h1>
          {big ? <h4>Big</h4> : <h2>Small</h2>}
        </div>
      );
    `);
    expect(ruleIds(result)).not.toContain("navigable/heading-order");
  });

  it("says nothing about a component whose name comes from elsewhere", () => {
    const result = audit(`
      export const Dialog = () => <button aria-labelledby="dialog-title" />;
    `);
    expect(result.findings).toEqual([]);
    expect(result.candidates[0]?.unknown.kind).toBe("external-idref");
  });

  it("resolves a literal style object so a hidden element stays hidden", () => {
    const result = audit(`
      export const A = () => <img src="/a.png" style={{ display: "none" }} />;
    `);
    expect(result.findings).toEqual([]);
  });

  it("suppresses everything under an element whose hiding is unknown", () => {
    const result = audit(`
      export const A = ({ hidden }) => (
        <div aria-hidden={hidden}>
          <img src="/a.png" />
        </div>
      );
    `);
    expect(result.findings).toEqual([]);
    expect(result.candidates[0]?.unknown.kind).toBe("unknown-semantics");
  });
});

describe("page-level questions", () => {
  it("asks for lang on a literal html element", () => {
    const result = audit(
      `
      export default function Layout({ children }) {
        return (
          <html>
            <body>{children}</body>
          </html>
        );
      }
    `,
      "layout.tsx",
    );

    expect(ruleIds(result)).toContain("readable/html-has-lang");
    expect(result.findings[0]?.line).toBe(4);
  });

  it("stays quiet when lang is set from an expression", () => {
    const result = audit(
      `
      export default function Layout({ locale, children }) {
        return (
          <html lang={locale}>
            <body>{children}</body>
          </html>
        );
      }
    `,
      "layout.tsx",
    );

    expect(ruleIds(result)).not.toContain("readable/html-has-lang");
  });

  it("never asks a page-level question of a component", () => {
    const result = audit(`export const A = () => <div>Hello</div>;`);
    expect(ruleIds(result)).not.toContain("navigable/document-title");
    expect(ruleIds(result)).not.toContain("landmarks/landmark-main");
    expect(ruleIds(result)).not.toContain("readable/html-has-lang");
  });
});

describe("parsing", () => {
  it("returns nothing for a file it cannot parse", () => {
    const result = audit(`export const A = () => <div>;`);
    expect(result.parsed).toBe(false);
    expect(result.findings).toEqual([]);
    expect(result.candidates).toEqual([]);
  });

  it("reads TypeScript-only syntax", () => {
    const result = audit(`
      interface Props { src: string }
      export const A = ({ src }: Props) => <img src={src} />;
    `);
    expect(result.parsed).toBe(true);
    expect(ruleIds(result)).toContain("text-alternatives/img-alt");
  });

  it("reads a .jsx file with a type-parameter-shaped expression", () => {
    const result = audit(`export const A = () => <img src="/a.png" />;`, "Component.jsx");
    expect(result.dialect).toBe("jsx");
    expect(ruleIds(result)).toContain("text-alternatives/img-alt");
  });
});
