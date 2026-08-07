import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { presentationalChildrenFocusable } from "./presentational-children-focusable";

const RULE_ID = "aria/presentational-children-focusable";

describe(RULE_ID, () => {
  it("reports focusable link inside role=option", () => {
    expectViolations(
      presentationalChildrenFocusable,
      '<li role="option"><a href="/page">Link</a></li>',
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });

  it("reports focusable button inside role=tab", () => {
    expectViolations(
      presentationalChildrenFocusable,
      '<div role="tab"><button>Click</button></div>',
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });

  it("skips link with tabindex=-1 inside role=option", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      '<li role="option"><a href="/page" tabindex="-1">Link</a></li>',
    );
  });

  it("skips disabled button inside role=tab", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      '<div role="tab"><button disabled>Click</button></div>',
    );
  });

  it("skips elements without children-presentational role", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      '<div role="group"><a href="/page">Link</a></div>',
    );
  });

  it("skips aria-hidden subtrees", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      '<li role="option" aria-hidden="true"><a href="/page">Link</a></li>',
    );
  });

  it("reports input inside role=img", () => {
    expectViolations(presentationalChildrenFocusable, '<div role="img"><input type="text"></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("skips input with tabindex=-1 inside role=img", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      '<div role="img"><input type="text" tabindex="-1"></div>',
    );
  });

  it("skips a link hidden by inline display:none inside role=button", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      '<div role="button"><div style="display:none"><a href="/x">Link</a></div></div>',
    );
  });

  it("skips a link hidden by a stylesheet class inside role=button", () => {
    // A common card-with-collapsed-popup shape: the popup's links are
    // unreachable until it opens, and hiding comes from a class rather than an
    // inline style, so an inline-only check would report all of them.
    expectNoViolations(
      presentationalChildrenFocusable,
      `<html><head><style>.popup_content { display: none; }</style></head>
       <body>
         <div role="button">
           <img src="/thumbnail.jpg" alt="">
           <div class="popup_content">
             <a href="https://example.com/one">One</a>
             <a href="https://example.com/two">Two</a>
           </div>
         </div>
       </body></html>`,
    );
  });

  it("skips a link hidden by visibility:hidden inside role=button", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      `<html><head><style>.panel { visibility: hidden; }</style></head>
       <body><div role="button"><div class="panel"><a href="/x">Link</a></div></div></body></html>`,
    );
  });

  it("still reports a visible sibling when another descendant is hidden", () => {
    expectViolations(
      presentationalChildrenFocusable,
      `<html><head><style>.popup_content { display: none; }</style></head>
       <body>
         <div role="button">
           <div class="popup_content"><a href="/hidden">Hidden</a></div>
           <a href="/visible">Visible</a>
         </div>
       </body></html>`,
      { count: 1, ruleId: RULE_ID, selectorIncludes: "a" },
    );
  });

  it("still reports a visually hidden but focusable link inside role=button", () => {
    // sr-only content is off-screen, not out of the tab order — a keyboard user
    // can still land on it, so it remains a violation.
    expectViolations(
      presentationalChildrenFocusable,
      `<html><head><style>
         .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; }
       </style></head>
       <body><div role="button"><a href="/x" class="sr-only">Skip</a></div></body></html>`,
      { count: 1, ruleId: RULE_ID },
    );
  });
});
