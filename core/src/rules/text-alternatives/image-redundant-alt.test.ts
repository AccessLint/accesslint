import { describe, it } from "vitest";
import { imageRedundantAlt } from "./image-redundant-alt";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "text-alternatives/image-redundant-alt";

describe(RULE_ID, () => {
  it("reports img alt duplicating parent link text", () => {
    expectViolations(imageRedundantAlt, '<a href="/home">Home<img src="home.png" alt="Home"></a>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports img alt duplicating parent button text", () => {
    expectViolations(
      imageRedundantAlt,
      '<button>Submit<img src="arrow.png" alt="Submit"></button>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes when alt differs from link text", () => {
    expectNoViolations(
      imageRedundantAlt,
      '<a href="/home">Go home<img src="home.png" alt="House icon"></a>',
    );
  });

  it("passes img with empty alt inside link", () => {
    expectNoViolations(imageRedundantAlt, '<a href="/home">Home<img src="icon.png" alt=""></a>');
  });

  it("passes img not inside link or button", () => {
    expectNoViolations(imageRedundantAlt, '<div>Hello<img src="photo.jpg" alt="Hello"></div>');
  });

  it("comparison is case-insensitive", () => {
    expectViolations(imageRedundantAlt, '<a href="/home">HOME<img src="icon.png" alt="home"></a>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });
});
