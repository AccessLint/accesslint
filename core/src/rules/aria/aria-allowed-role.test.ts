import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaAllowedRole } from "./aria-allowed-role";

const RULE_ID = "aria/aria-allowed-role";

describe(RULE_ID, () => {
  it("passes valid role on div", () => {
    expectNoViolations(ariaAllowedRole, '<div role="button">Click me</div>');
  });

  it("passes valid role on button", () => {
    expectNoViolations(ariaAllowedRole, '<button role="switch">Toggle</button>');
  });

  it("reports invalid role on button", () => {
    expectViolations(ariaAllowedRole, '<button role="heading">Not a heading</button>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /heading/,
    });
  });

  it("passes checkbox role on button", () => {
    expectNoViolations(ariaAllowedRole, '<button role="checkbox" aria-checked="false">Option</button>');
  });

  it("reports role on elements that should not have roles", () => {
    expectViolations(ariaAllowedRole, '<meta role="button">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes any role on span", () => {
    expectNoViolations(ariaAllowedRole, '<span role="button">Click</span>');
  });

  it("allows presentation/none on img with empty alt", () => {
    expectNoViolations(ariaAllowedRole, '<img alt="" role="presentation" src="spacer.gif">');
  });

  it("reports non-presentation role on img with empty alt", () => {
    expectViolations(ariaAllowedRole, '<img alt="" role="button" src="icon.png">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes menuitem role on li", () => {
    expectNoViolations(ariaAllowedRole, '<ul><li role="menuitem">Item</li></ul>');
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(ariaAllowedRole, '<button role="heading" aria-hidden="true">Hidden</button>');
  });

  // Redundant-but-valid roles (implicit role == explicit role)
  it("passes redundant role=button on button", () => {
    expectNoViolations(ariaAllowedRole, '<button role="button">Click</button>');
  });

  it("passes redundant role=link on a[href]", () => {
    expectNoViolations(ariaAllowedRole, '<a href="/" role="link">Home</a>');
  });

  it("passes redundant role=navigation on nav", () => {
    expectNoViolations(ariaAllowedRole, '<nav role="navigation"><a href="/">Home</a></nav>');
  });

  it("passes redundant role=main on main", () => {
    expectNoViolations(ariaAllowedRole, '<main role="main">Content</main>');
  });

  it("passes redundant role=complementary on aside", () => {
    expectNoViolations(ariaAllowedRole, '<aside role="complementary">Sidebar</aside>');
  });

  it("passes combobox role on input[type=search]", () => {
    expectNoViolations(ariaAllowedRole, '<input type="search" role="combobox" aria-expanded="false" aria-controls="list1">');
  });

  it("passes searchbox role on input[type=search]", () => {
    expectNoViolations(ariaAllowedRole, '<input type="search" role="searchbox">');
  });

  it("reports disallowed role on input[type=search]", () => {
    expectViolations(ariaAllowedRole, '<input type="search" role="button">', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /button/,
    });
  });
});
