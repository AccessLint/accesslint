import { describe, expect, it } from "vitest";
import { MARKER_ATTRIBUTE } from "../emit";
import { renderJsx } from "./index";

function body(source: string): string {
  const render = renderJsx(source, { typescript: true });
  expect(render).not.toBeNull();
  // The marker attribute is what the audit layer strips; drop it here so these
  // assertions read as the HTML the engine parses.
  return render!.bodyHtml.replace(new RegExp(` ?${MARKER_ATTRIBUTE}="\\d+"`, "g"), "");
}

describe("attributes", () => {
  it("renames the props that are not attribute names", () => {
    expect(body(`const A = <label className="lbl" htmlFor="name" />;`)).toBe(
      `<label class="lbl" for="name"></label>`,
    );
  });

  it("lowercases camelCase attributes", () => {
    expect(body(`const A = <input readOnly maxLength={10} tabIndex={-1} />;`)).toBe(
      `<input readonly="" maxlength="10" tabindex="-1" />`,
    );
  });

  it("drops event handlers and React-only props", () => {
    expect(body(`const A = <button key="a" ref={r} onClick={go}>Go</button>;`)).toBe(
      `<button>Go</button>`,
    );
  });

  it("omits an attribute React would not render", () => {
    expect(body(`const A = <input disabled={false} required={true} />;`)).toBe(
      `<input required="" />`,
    );
  });

  it("stands in for an expression-valued attribute", () => {
    expect(body(`const A = <img src={url} alt={label} />;`)).toBe(
      `<img src="unknown" alt="unknown" />`,
    );
  });

  it("resolves a literal style object and keeps what can hide an element", () => {
    expect(body(`const A = <div style={{ display: "none", marginTop: 4 }} />;`)).toBe(
      `<div style="display: none; margin-top: 4"></div>`,
    );
  });

  it("keeps the literal half of a style object whose other values cannot hide", () => {
    expect(body(`const A = <div style={{ width: w, color: "red" }} />;`)).toBe(
      `<div style="color: red"></div>`,
    );
  });
});

describe("children", () => {
  it("drops JSX indentation but keeps real text", () => {
    expect(
      body(`const A = (
        <p>
          Hello
          world
        </p>
      );`),
    ).toBe(`<p>Hello world</p>`);
  });

  it("emits a fragment's children without a wrapper", () => {
    expect(body(`const A = <><span>a</span><span>b</span></>;`)).toBe(
      `<span>a</span><span>b</span>`,
    );
  });

  it("emits a component's children in place", () => {
    expect(body(`const A = <Card><img src="/a.png" /></Card>;`)).toBe(`<img src="/a.png" />`);
  });

  it("walks into a map callback", () => {
    expect(body(`const A = <ul>{items.map((i) => <li>{i.name}</li>)}</ul>;`)).toBe(
      `<ul><li>Text</li></ul>`,
    );
  });

  it("emits both arms of a ternary", () => {
    const render = renderJsx(`const A = <div>{on ? <b>on</b> : <i>off</i>}</div>;`, {
      typescript: true,
    });
    expect(render?.hasBranch).toBe(true);
    expect(body(`const A = <div>{on ? <b>on</b> : <i>off</i>}</div>;`)).toBe(
      `<div><b>on</b><i>off</i></div>`,
    );
  });

  it("emits the right side of a logical and", () => {
    expect(body(`const A = <div>{open && <span>yes</span>}</div>;`)).toBe(
      `<div><span>yes</span></div>`,
    );
  });

  it("renders nothing for a comment", () => {
    expect(body(`const A = <div>{/* nothing here */}</div>;`)).toBe(`<div></div>`);
  });

  it("stands in for an opaque expression only where text is read", () => {
    expect(body(`const A = <h1>{title}</h1>;`)).toBe(`<h1>Text</h1>`);
    expect(body(`const A = <ul>{rows}</ul>;`)).toBe(`<ul></ul>`);
  });

  it("does not stand in for an element that is already named", () => {
    expect(body(`const A = <button aria-label="Close">{icon}</button>;`)).toBe(
      `<button aria-label="Close"></button>`,
    );
  });

  it("escapes text, and leaves a decoded entity as the character it is", () => {
    expect(body(`const A = <p>{"a < b & c"}</p>;`)).toBe(`<p>a &lt; b &amp; c</p>`);
    // The parser decodes JSX entities, so what reaches the DOM is the character.
    expect(body(`const A = <p>a&nbsp;b</p>;`)).toBe(`<p>a\u00a0b</p>`);
  });
});

describe("the node table", () => {
  it("carries the source position of every element", () => {
    const render = renderJsx(
      `export const A = () => (
  <div>
    <img src="/a.png" />
  </div>
);`,
      { typescript: true },
    );
    const img = render?.nodes.find((node) => node.tag === "img");
    expect(img?.line).toBe(3);
    expect(img?.column).toBe(5);
  });

  it("records a spread and what it could override", () => {
    const render = renderJsx(`const A = <img alt="" {...rest} src="/a.png" />;`, {
      typescript: true,
    });
    const img = render?.nodes[0];
    expect(img?.spread?.expression).toBe("rest");
    expect(img?.unknownAttributes.get("alt")?.cause).toBe("spread");
    expect(img?.pinnedAfterSpread.has("src")).toBe(true);
  });

  it("records dangerouslySetInnerHTML as unknown contents", () => {
    const render = renderJsx(`const A = <div dangerouslySetInnerHTML={{ __html: raw }} />;`, {
      typescript: true,
    });
    expect(render?.nodes[0]?.unknowableChild?.kind).toBe("opaque-expression");
  });
});

describe("a root layout", () => {
  it("lifts the html element's attributes out of the body", () => {
    const render = renderJsx(
      `export default function Layout({ children }) {
  return (
    <html lang="en">
      <head><title>Site</title></head>
      <body>{children}</body>
    </html>
  );
}`,
      { typescript: true },
    );

    expect(render?.htmlAttributes).toEqual([["lang", "en"]]);
    expect(render?.headHtml).toContain("<title");
    // `{children}` in a `<body>` is markup, not a name: nothing stands in for it.
    expect(render?.bodyHtml).toBe("");
    expect(render?.nodes[render!.htmlNodeIndex!]?.tag).toBe("html");
  });
});

describe("parse failures", () => {
  it("returns null rather than guessing", () => {
    expect(renderJsx(`const A = <div>`, { typescript: true })).toBeNull();
  });

  it("reads a Flow-annotated .jsx file", () => {
    const render = renderJsx(`type Props = { a: number };\nconst A = () => <div />;`, {
      typescript: false,
    });
    expect(render?.nodes[0]?.tag).toBe("div");
  });
});
