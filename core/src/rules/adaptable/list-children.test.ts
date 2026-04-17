import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { listChildren } from "./list-children";

const RULE_ID = "adaptable/list-children";

describe(RULE_ID, () => {
  it("passes valid ul", () => {
    expectNoViolations(listChildren, "<html><body><ul><li>A</li><li>B</li></ul></body></html>");
  });

  it("reports non-li child in ul", () => {
    expectViolations(listChildren, "<html><body><ul><div>Bad</div></ul></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports bare text node in ul", () => {
    expectViolations(listChildren, "<html><body><ul>Bare text<li>Item</li></ul></body></html>", {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /text.*<li>|<li>.*text/,
    });
  });

  it("passes style element inside ul (CSS-in-JS)", () => {
    expectNoViolations(
      listChildren,
      "<html><body><ul><style>.x{color:red}</style><li>A</li></ul></body></html>",
    );
  });

  it("passes ul with only whitespace text nodes", () => {
    expectNoViolations(listChildren, "<html><body><ul> <li>A</li> <li>B</li> </ul></body></html>");
  });
});
