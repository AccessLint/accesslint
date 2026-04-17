/**
 * Synthetic DOM generator for benchmarks.
 * Builds documents with a realistic mix of elements that exercise audit rules.
 */

function generateElements(n: number): string {
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const mod = i % 68;
    switch (mod) {
      // ── Images ──────────────────────────────────────────────
      // Valid image with alt
      case 0:
        parts.push(`<img src="img${i}.jpg" alt="Photo ${i}">`);
        break;
      // image-alt: missing alt
      case 1:
        parts.push(`<img src="img${i}.jpg">`);
        break;
      // input-image-alt: input type=image without alt
      case 2:
        parts.push(`<input type="image" src="btn${i}.png">`);
        break;
      // image-redundant-alt: link text matches img alt
      case 3:
        parts.push(`<a href="#">text <img alt="text"></a>`);
        break;
      // object-alt: object without alt text
      case 4:
        parts.push(`<object data="file${i}.swf"></object>`);
        break;
      // role-img-alt: div with role=img but no name
      case 5:
        parts.push(`<div role="img"></div>`);
        break;

      // ── Forms ───────────────────────────────────────────────
      // Valid labeled input
      case 6:
        parts.push(`<label for="input${i}">Field ${i}</label><input id="input${i}" type="text">`);
        break;
      // label: missing label on text input
      case 7:
        parts.push(`<input type="text" placeholder="no label ${i}">`);
        break;
      // label: select without label (exercises formLabel)
      case 8:
        parts.push(`<select><option>A</option></select>`);
        break;
      // input-button-name: submit with empty value
      case 9:
        parts.push(`<input type="submit" value="">`);
        break;
      // autocomplete-valid: invalid autocomplete value
      case 10:
        parts.push(`<input type="text" autocomplete="nope">`);
        break;
      // label: textarea missing label
      case 11:
        parts.push(`<textarea></textarea>`);
        break;

      // ── Headings ────────────────────────────────────────────
      // Valid headings
      case 12:
        parts.push(`<h2>Heading ${i}</h2>`);
        break;
      case 13:
        parts.push(`<h3>Sub-heading ${i}</h3>`);
        break;
      // empty-heading: empty heading element
      case 14:
        parts.push(`<h3></h3>`);
        break;
      // heading-order: skipped heading level (h2 → h4 with no h3)
      case 15:
        parts.push(`<h2>Section ${i}</h2><h4>Sub ${i}</h4>`);
        break;

      // ── ARIA (valid) ────────────────────────────────────────
      case 16:
        parts.push(`<div role="button" aria-label="Action ${i}">Click</div>`);
        break;
      case 17:
        parts.push(`<div role="checkbox" aria-checked="false" aria-label="Check ${i}">Check</div>`);
        break;

      // ── ARIA (violations) ───────────────────────────────────
      // aria-allowed-role: invalid role value
      case 18:
        parts.push(`<div role="madeup${i}">Bad role</div>`);
        break;
      // aria-valid-attr: misspelled aria attribute
      case 19:
        parts.push(`<div aria-labeledby="x">text</div>`);
        break;
      // aria-valid-attr-value: invalid aria attribute value
      case 20:
        parts.push(`<div aria-hidden="nope">text</div>`);
        break;
      // aria-required-attr: checkbox missing aria-checked
      case 21:
        parts.push(`<div role="checkbox">Check</div>`);
        break;
      // aria-required-children: list without listitem children
      case 22:
        parts.push(`<div role="list"><div>item</div></div>`);
        break;
      // aria-required-parent: listitem without list parent
      case 23:
        parts.push(`<div role="listitem">item</div>`);
        break;
      // aria-hidden-focus: focusable element inside aria-hidden
      case 24:
        parts.push(`<div aria-hidden="true"><button>X</button></div>`);
        break;
      // aria-input-field-name: textbox without name
      case 25:
        parts.push(`<div role="textbox"></div>`);
        break;
      // aria-toggle-field-name: switch without name
      case 26:
        parts.push(`<div role="switch"></div>`);
        break;
      // aria-meter-name: meter without name
      case 27:
        parts.push(`<div role="meter"></div>`);
        break;
      // aria-progressbar-name: progressbar without name
      case 28:
        parts.push(`<div role="progressbar"></div>`);
        break;
      // aria-dialog-name: dialog without name
      case 29:
        parts.push(`<div role="dialog">content</div>`);
        break;
      // aria-tooltip-name: tooltip without name
      case 30:
        parts.push(`<div role="tooltip">tip</div>`);
        break;
      // aria-treeitem-name: treeitem without name
      case 31:
        parts.push(`<div role="treeitem"></div>`);
        break;
      // presentation-role-conflict: button with conflicting presentation role
      case 32:
        parts.push(`<button role="presentation">Click</button>`);
        break;

      // ── Links ───────────────────────────────────────────────
      // Valid link
      case 33:
        parts.push(`<a href="/page${i}">Link ${i}</a>`);
        break;
      // link-name: empty link
      case 34:
        parts.push(`<a href="/page${i}"></a>`);
        break;

      // ── Buttons ─────────────────────────────────────────────
      // Valid button
      case 35:
        parts.push(`<button type="button">Button ${i}</button>`);
        break;
      // button-name: empty button
      case 36:
        parts.push(`<button type="button"></button>`);
        break;

      // ── Tables ──────────────────────────────────────────────
      // Valid table
      case 37:
        parts.push(`<table><tr><th>Header ${i}</th></tr><tr><td>Data ${i}</td></tr></table>`);
        break;
      // scope-attr-valid: invalid scope value
      case 38:
        parts.push(`<table><tr><th scope="invalid">H</th></tr><tr><td>data</td></tr></table>`);
        break;
      // empty-table-header: empty th element
      case 39:
        parts.push(`<table><tr><th></th></tr><tr><td>data</td></tr></table>`);
        break;
      // td-headers-attr: td referencing nonexistent header
      case 40:
        parts.push(
          `<table><tr><th id="h${i}">H</th></tr><tr><td headers="nonexistent">data</td></tr></table>`,
        );
        break;

      // ── Lists ───────────────────────────────────────────────
      // Valid list
      case 41:
        parts.push(`<ul><li>Item ${i}a</li><li>Item ${i}b</li><li>Item ${i}c</li></ul>`);
        break;
      // list: invalid child of ul
      case 42:
        parts.push(`<ul><div>invalid child</div></ul>`);
        break;
      // dlitem: orphan dt outside dl
      case 43:
        parts.push(`<dt>orphan term</dt>`);
        break;
      // definition-list: dl with invalid child
      case 44:
        parts.push(`<dl><p>invalid child</p></dl>`);
        break;

      // ── Navigation ─────────────────────────────────────────
      case 45:
        parts.push(`<nav aria-label="Nav ${i}"><a href="/a${i}">A</a><a href="/b${i}">B</a></nav>`);
        break;

      // ── Labeled select (valid) ──────────────────────────────
      case 46:
        parts.push(
          `<label for="sel${i}">Select ${i}</label><select id="sel${i}"><option>A</option></select>`,
        );
        break;

      // ── SVG with role=img (valid) ───────────────────────────
      case 47:
        parts.push(`<svg role="img" aria-label="Icon ${i}"><circle r="10"/></svg>`);
        break;

      // ── Keyboard ────────────────────────────────────────────
      // tabindex: positive tabindex value
      case 48:
        parts.push(`<div tabindex="5">text</div>`);
        break;
      // nested-interactive: nested interactive elements
      case 49:
        parts.push(`<a href="#"><button>Nested</button></a>`);
        break;

      // ── Document structure ──────────────────────────────────
      // frame-title: iframe without title
      case 50:
        parts.push(`<iframe title=""></iframe>`);
        break;
      // marquee: deprecated marquee element
      case 51:
        parts.push(`<marquee>text</marquee>`);
        break;

      // ── Language ────────────────────────────────────────────
      // valid-lang: invalid lang attribute
      case 52:
        parts.push(`<span lang="xyz-invalid">text</span>`);
        break;

      // ── Media ───────────────────────────────────────────────
      // video-caption: video without captions
      case 53:
        parts.push(`<video src="v.mp4"></video>`);
        break;
      // audio-caption: audio without captions
      case 54:
        parts.push(`<audio src="a.mp3"></audio>`);
        break;

      // ── Additional violations ─────────────────────────────────
      // aria-command-name: menuitem without accessible name
      case 55:
        parts.push(`<div role="menuitem"></div>`);
        break;
      // label-title-only: input labeled only by title attribute
      case 56:
        parts.push(`<input type="text" title="Name ${i}">`);
        break;
      // blink: deprecated blink element
      case 57:
        parts.push(`<blink>Blinking text ${i}</blink>`);
        break;
      // skip-link: skip link with nonexistent target
      case 58:
        parts.push(`<a href="#nonexistent-target-${i}">Skip to content</a>`);
        break;
      // duplicate-id-aria: duplicate IDs referenced by ARIA
      case 59:
        parts.push(
          `<div id="dup-${i}">A</div><div id="dup-${i}">B</div><input aria-labelledby="dup-${i}">`,
        );
        break;
      // form-field-multiple-labels: input with multiple labels
      case 60:
        parts.push(
          `<label for="ml-${i}">Label A</label><label for="ml-${i}">Label B</label><input id="ml-${i}" type="text">`,
        );
        break;
      // aria-allowed-attr: ARIA attribute not valid for the role
      case 61:
        parts.push(`<div role="alert" aria-checked="true">Alert ${i}</div>`);
        break;

      // ── Plain content (padding to 68) ─────────────────────────
      case 62:
        parts.push(`<p>Paragraph content for element ${i}.</p>`);
        break;
      case 63:
        parts.push(`<section aria-label="Section ${i}"><p>Content</p></section>`);
        break;
      case 64:
        parts.push(`<span>Inline text ${i}</span>`);
        break;
      case 65:
        parts.push(`<div>Block content ${i}</div>`);
        break;
      case 66:
        parts.push(`<p>More paragraph content for element ${i}.</p>`);
        break;
      case 67:
        parts.push(`<p>Final padding element ${i}.</p>`);
        break;
    }
  }
  return parts.join("\n");
}

/**
 * Generate the raw HTML string for `n` elements.
 */
export function generateHtml(n: number): string {
  const body = generateElements(n);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<title>Benchmark Document</title>
<meta http-equiv="refresh" content="5">
<meta name="viewport" content="maximum-scale=1">
</head>
<body>
<header>Site header</header>
<header>Duplicate header</header>
<nav><a href="/a">Link A</a></nav>
<nav><a href="/b">Link B</a></nav>
<main>
<h1>Benchmark Page</h1>
${body}
</main>
<main><p>Duplicate main</p></main>
<div><p>Content outside any landmark</p></div>
<footer>Site footer</footer>
<footer>Duplicate footer</footer>
</body>
</html>`;
}

/**
 * Generate a Document with approximately `n` elements exercising various rule targets.
 */
export function generateDoc(n: number): Document {
  return new DOMParser().parseFromString(generateHtml(n), "text/html");
}

/** ~100 elements */
export const TINY_SIZE = 100;
/** ~500 elements */
export const SMALL_SIZE = 500;
/** ~2,000 elements */
export const MEDIUM_SIZE = 2_000;
/** ~5,000 elements */
export const LARGE_SIZE = 5_000;
