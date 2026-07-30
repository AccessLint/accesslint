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

  it("never compares two components in one file", () => {
    // Each root is audited in its own document, so an <h1> here and an <h3>
    // there is not a heading order and the question never comes up.
    const result = audit(`
      export const Title = () => <h1>Title</h1>;
      export const Section = () => <h3>Section</h3>;
    `);
    expect(ruleIds(result)).not.toContain("navigable/heading-order");
    expect(candidateIds(result)).not.toContain("navigable/heading-order");
  });

  it("reports a heading order defect inside one component", () => {
    const result = audit(`
      export const Page = () => (
        <div>
          <h1>Title</h1>
          <h3>Section</h3>
        </div>
      );
    `);
    expect(ruleIds(result)).toContain("navigable/heading-order");
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

// Every case in this block is a false positive the corpus run found: a real repo,
// a finding a human triager called wrong, and the reason it was wrong.
describe("what the corpus taught", () => {
  it("names a button from text anywhere in its subtree", () => {
    // supabase ContextMenu.tsx: the label is one level down, so the button's own
    // children were both known and the name looked missing.
    const result = audit(`
      export const Item = ({ item }) => (
        <button type="button">
          <div className="label">{item.label}</div>
        </button>
      );
    `);
    expect(ruleIds(result)).not.toContain("labels-and-names/button-name");
  });

  it("still reports an icon-only button with nothing to name it", () => {
    const result = audit(`
      export const Close = () => (
        <button type="button">
          <svg viewBox="0 0 24 24" />
        </button>
      );
    `);
    expect(ruleIds(result)).toContain("labels-and-names/button-name");
  });

  it("keeps container integrity one level deep", () => {
    // The div's own contents being unknown says nothing about where the div sits.
    const result = audit(`
      export const List = ({ items }) => (
        <ul>
          {items.map((item) => (
            <div key={item.id}>{item.label}</div>
          ))}
        </ul>
      );
    `);
    expect(ruleIds(result)).toContain("adaptable/list-children");
  });

  it("says nothing about a list whose text came from a component", () => {
    // supabase LWSummary.tsx: <ol><Link>…</Link></ol> renders an <a> child, not
    // the bare text the engine saw.
    const result = audit(`
      export const Days = () => (
        <ol className="border-t">
          <Link href="/a">Open Source Hackathon</Link>
        </ol>
      );
    `);
    expect(result.findings).toEqual([]);
    const candidate = result.candidates.find((c) => c.ruleId === "adaptable/list-children");
    expect(candidate?.unknown.kind).toBe("component-child");
  });

  it("says nothing about a table whose rows are components", () => {
    const result = audit(`
      export const Pricing = ({ plans }) => (
        <table>
          <thead>
            <tr>
              <th scope="col">Feature</th>
            </tr>
          </thead>
          <tbody>
            <PricingRow plans={plans} />
          </tbody>
        </table>
      );
    `);
    expect(ruleIds(result)).not.toContain("adaptable/th-has-data-cells");
  });

  it("treats a hiding utility class as a hiding it cannot rule out", () => {
    const result = audit(`
      export const Submit = () => <button type="submit" className="hidden" tabIndex={-1} />;
    `);
    expect(result.findings).toEqual([]);
    expect(result.candidates[0]?.unknown.kind).toBe("unknown-semantics");
  });

  it("audits a column that a breakpoint shows again", () => {
    // shadcn's login blocks: `hidden lg:block` is a responsive column, not a
    // hidden one, and the alt text inside it is read by anyone on a laptop.
    const result = audit(`
      export const Login = () => (
        <div className="relative hidden bg-muted lg:block">
          <img src="/placeholder.svg" alt="Image" className="absolute inset-0" />
        </div>
      );
    `);
    expect(ruleIds(result)).toContain("text-alternatives/image-alt-words");
  });

  it("says nothing about JSX that renders to an image, not a document", () => {
    const result = audit(
      `
      import { ImageResponse } from "next/og";

      export default function OG() {
        return new ImageResponse(
          <div style={{ display: "flex" }}>
            <img src={logo} width="200" height="200" />
          </div>,
        );
      }
    `,
      "route.tsx",
    );
    expect(result.skipped).toBe("non-dom-renderer");
    expect(result.findings).toEqual([]);
  });

  it("recognizes a satori component file by its tw prop", () => {
    const result = audit(`
      export const Card = ({ logo }) => (
        <div tw="flex items-center">
          <img src={logo} width="90px" height="90px" tw="mr-6" />
        </div>
      );
    `);
    expect(result.skipped).toBe("non-dom-renderer");
  });

  it("leaves test fixtures alone unless asked", () => {
    const source = `export const Fixture = () => <button type="button" tabIndex={3} />;`;
    expect(audit(source, "FocusTrap.test.tsx").skipped).toBe("test-file");
    expect(audit(source, "test/fixtures/FocusTrap.tsx").skipped).toBe("test-file");
    const included = auditSource({
      source,
      filename: "FocusTrap.test.tsx",
      document: testDocument(),
      includeTestFiles: true,
    });
    expect(included.skipped).toBeUndefined();
    expect(included.findings.map((f) => f.ruleId)).toContain("keyboard-accessible/tabindex");
  });

  it("keeps a table fragment's own structure, and asks nothing of the table around it", () => {
    // A component that renders one row is dropped outright by an HTML parser
    // unless it is wrapped, and everything after it in the document gets
    // rearranged. Wrapped, the row survives — and no rule may then reason about
    // the table we invented to hold it.
    const result = audit(`
      export const Row = ({ name }) => (
        <tr>
          <td>{name}</td>
          <td>
            <button type="button" />
          </td>
        </tr>
      );
    `);
    expect(result.html).toContain("<tr");
    expect(result.html).toContain("<button");
    expect(ruleIds(result)).toContain("labels-and-names/button-name");
    expect(ruleIds(result)).not.toContain("adaptable/td-has-header");
  });

  it("puts each finding on its own line when two elements look alike", () => {
    // supabase launch-week: two <a href={expr}> both render href="unknown", so
    // both got the same CSS selector and every finding landed on the first one.
    const result = audit(`
      export const Links = ({ blog, docs }) => (
        <div>
          <a href={blog}>
            <img src="/blog.svg" />
          </a>
          {docs && (
            <a href={docs}>
              <img src="/docs.svg" />
            </a>
          )}
        </div>
      );
    `);
    const lines = result.findings
      .filter((finding) => finding.ruleId === "text-alternatives/img-alt")
      .map((finding) => finding.line);
    expect(lines).toEqual([5, 9]);
  });

  it("leaves a component in a table unexpanded", () => {
    // docusaurus style-isolation: <tbody><ExampleRow><h1>title</h1></ExampleRow>
    // renders a row at runtime. Emitting the h1 in the row's place put it inside
    // <tbody>, where the parser foster-parents element and text out separately —
    // which reported an empty <h1>, an empty <button>, and a nameless link, none
    // of them true.
    const result = audit(`
      export default function Page() {
        return (
          <table>
            <tbody>
              <ExampleRow name="h1">
                <h1>title</h1>
              </ExampleRow>
              <ExampleRow name="a">
                <a href="https://example.com">link</a>
              </ExampleRow>
            </tbody>
          </table>
        );
      }
    `);
    expect(result.findings).toEqual([]);
  });

  it("does not let one root rearrange another", () => {
    // The docusaurus style-isolation page: a row-rendering component sits above a
    // page component, and concatenating them flattened every element after the
    // row, which reported an empty <h1>, an empty <button> and a nameless link.
    const result = audit(`
      const Row = ({ name, children }) => (
        <tr>
          <td>{name}</td>
          <td>{children}</td>
        </tr>
      );

      export default function Page() {
        return (
          <div>
            <h1>Heading</h1>
            <a href="https://example.com">link</a>
            <button>button</button>
          </div>
        );
      }
    `);
    expect(ruleIds(result)).not.toContain("navigable/empty-heading");
    expect(ruleIds(result)).not.toContain("navigable/link-name");
    expect(ruleIds(result)).not.toContain("labels-and-names/button-name");
  });

  it("never asks whether a div with tabindex is a scroll container", () => {
    const result = audit(`
      export const Scroller = () => (
        <div tabIndex={0} style={{ overflowY: "auto", height: "600px" }}>
          <p>Content</p>
        </div>
      );
    `);
    expect(ruleIds(result)).not.toContain("keyboard-accessible/focus-order");
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
