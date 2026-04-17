import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { emptyHeading } from "./empty-heading";

const RULE_ID = "navigable/empty-heading";

describe(RULE_ID, () => {
  it("reports empty h1", () => {
    expectViolations(emptyHeading, "<html><body><h1></h1></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports empty h2", () => {
    expectViolations(emptyHeading, "<html><body><h2></h2></body></html>", { count: 1 });
  });

  it("reports whitespace-only heading", () => {
    expectViolations(emptyHeading, "<html><body><h1>   </h1></body></html>", { count: 1 });
  });

  it("reports empty role=heading", () => {
    expectViolations(
      emptyHeading,
      '<html><body><div role="heading" aria-level="2"></div></body></html>',
      { count: 1 },
    );
  });

  it("passes heading with text", () => {
    expectNoViolations(emptyHeading, "<html><body><h1>Page Title</h1></body></html>");
  });

  it("passes heading with aria-label", () => {
    expectNoViolations(emptyHeading, '<html><body><h1 aria-label="Page Title"></h1></body></html>');
  });

  it("passes heading with aria-labelledby", () => {
    expectNoViolations(
      emptyHeading,
      '<html><body><span id="title">Page Title</span><h1 aria-labelledby="title"></h1></body></html>',
    );
  });

  it("skips aria-hidden headings", () => {
    expectNoViolations(emptyHeading, '<html><body><h1 aria-hidden="true"></h1></body></html>');
  });

  it("reports multiple empty headings", () => {
    expectViolations(emptyHeading, "<html><body><h1></h1><h2></h2><h3></h3></body></html>", {
      count: 3,
    });
  });

  it("passes heading with nested text", () => {
    expectNoViolations(emptyHeading, "<html><body><h1><span>Title</span></h1></body></html>");
  });

  it("passes heading with img alt text (accName from content)", () => {
    expectNoViolations(
      emptyHeading,
      '<html><body><h1><img src="logo.png" alt="Company Name"></h1></body></html>',
    );
  });

  it("passes heading with img inside a link", () => {
    expectNoViolations(
      emptyHeading,
      '<html><body><h1><a href="/"><img src="logo.png" alt="Home"></a></h1></body></html>',
    );
  });

  it("reports heading with img with empty alt", () => {
    expectViolations(
      emptyHeading,
      '<html><body><h1><img src="logo.png" alt=""></h1></body></html>',
      { count: 1 },
    );
  });

  it("passes heading with child element having aria-label", () => {
    expectNoViolations(
      emptyHeading,
      '<html><body><h1><span role="img" aria-label="Logo"></span></h1></body></html>',
    );
  });

  it("passes heading with svg with aria-label", () => {
    expectNoViolations(
      emptyHeading,
      '<html><body><h1><svg aria-label="Logo"><path d="M0 0"/></svg></h1></body></html>',
    );
  });

  it("passes heading with svg title element", () => {
    expectNoViolations(
      emptyHeading,
      '<html><body><h1><svg><title>Logo</title><path d="M0 0"/></svg></h1></body></html>',
    );
  });

  it("passes heading with img aria-label (no alt)", () => {
    expectNoViolations(
      emptyHeading,
      '<html><body><h1><img src="logo.png" aria-label="Company"></h1></body></html>',
    );
  });
});
