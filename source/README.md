# @accesslint/source

Audit component **source** for accessibility. Parses a JSX/TSX file, renders its
intrinsic elements as HTML, and runs [`@accesslint/core`](../core) over the
result — so a finding comes back with the rule, the message, and the line in the
file you wrote.

No bundler, no dev server, no rendering, and no execution of the code being
audited. Point it at a file and it answers.

## The contract

**What the source does not pin down produces silence, not a guess.** A finding
this package returns is a defect at runtime whatever the unknowns turn out to be.
Everything else comes back as a _candidate_ — the violation the engine reported,
plus the unknown that stopped it from being a finding.

That split is the point. Findings are safe to post as review comments on a
protected branch. Candidates are input for a later layer that can go get the
missing evidence (the component's own definition, the spread's source) and decide.

False negatives are the accepted price.

## Usage

```ts
import { auditSource } from "@accesslint/source";
import { Window } from "happy-dom";

const window = new Window();
for (const key of Object.getOwnPropertyNames(window)) {
  if (!globalThis[key]) globalThis[key] = window[key];
}
globalThis.getComputedStyle = window.getComputedStyle.bind(window);

const { findings, candidates } = auditSource({
  source: await readFile("Avatar.tsx", "utf8"),
  filename: "Avatar.tsx",
  document: window.document,
});

for (const finding of findings) {
  console.log(`${finding.file}:${finding.line} ${finding.ruleId} — ${finding.message}`);
}
```

The DOM is yours to provide: happy-dom, jsdom, or a real browser, along with the
globals the engine's rules read (`getComputedStyle`, the element constructors).
The package brings no DOM of its own.

`renderJsx` is exported too, for looking at the synthetic HTML directly.

## What it can and cannot see

| The source says                        | The audit reads it as                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `<img src="/a.png" />`                 | an intrinsic element, fully audited                                          |
| `<img src={url} />`                    | `src` present with an unknown value; a missing `alt` here is still a finding |
| `<img {...props} />`                   | absence unprovable — every missing-attribute finding becomes a candidate     |
| `<img {...props} alt="" />`            | `alt` provably empty: nothing after a spread can override it                 |
| `<img alt="" {...props} />`            | `alt` unknown: the spread can override it                                    |
| `<Button>…</Button>`                   | the component vanishes, its children are audited in place                    |
| `<ul><MenuItem /></ul>`                | the list's contents are unknown — container rules go quiet                   |
| `<ul>{items.map((i) => <div />)}</ul>` | the `<div>` is real, and reported                                            |
| `<h1>{title}</h1>`                     | a stand-in name, so "empty heading" is not claimed                           |
| `{cond ? <a /> : <b />}`               | both arms, so document-order rules go quiet for the file                     |
| `style={{ display: "none" }}`          | hidden, exactly as at runtime                                                |
| `aria-hidden={flag}`                   | may not be in the accessibility tree: the subtree goes quiet                 |
| a file that does not parse             | no findings at all                                                           |

Every file is treated as a component, so page-level rules never run — with one
exception: a file containing a literal `<html>` tag (a Next.js root layout, a
Remix root) is asked whether it set `lang`, because all of that evidence is in
the one tag.

Rendering-dependent rules (contrast, spacing, focus visibility) and cross-element
`idref` rules are off in source mode. `SOURCE_MODE_DISABLED_RULES` is exported if
you want to see the list.

Two kinds of file are skipped outright, both because a finding in one could not be
a defect a user hits: JSX rendered by something that is not a DOM (satori,
`@vercel/og`, Next's image modules), and test files and fixtures, whose markup is
written to be wrong. `includeTestFiles` turns the second one back on.

## Coverage today

JSX and TSX, measured against ten popular React repositories — 12,557 files, 109
findings, zero confirmed false positives after hand-triaging every one. What the
first run got wrong lives on as the "what the corpus taught" tests in
`src/audit.test.ts`.

Vue and Svelte map onto the same semantics and are next, each behind the same gate.
