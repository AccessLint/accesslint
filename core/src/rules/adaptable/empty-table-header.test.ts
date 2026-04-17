import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { emptyTableHeader } from "./empty-table-header";

const RULE_ID = "adaptable/empty-table-header";

describe(RULE_ID, () => {
  it("passes header with text", () => {
    expectNoViolations(
      emptyTableHeader,
      `
      <table>
        <tr><th>Name</th><th>Age</th></tr>
      </table>
    `,
    );
  });

  it("reports empty header", () => {
    expectViolations(
      emptyTableHeader,
      `
      <table>
        <tr><th></th><th>Name</th></tr>
      </table>
    `,
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });

  it("passes header with aria-label", () => {
    expectNoViolations(
      emptyTableHeader,
      `
      <table>
        <tr><th aria-label="Select all"></th><th>Name</th></tr>
      </table>
    `,
    );
  });

  it("reports whitespace-only header", () => {
    expectViolations(
      emptyTableHeader,
      `
      <table>
        <tr><th>   </th><th>Name</th></tr>
      </table>
    `,
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });

  it("skips presentational tables", () => {
    expectNoViolations(
      emptyTableHeader,
      `
      <table role="none">
        <tr><th></th></tr>
      </table>
    `,
    );
  });

  it("skips aria-hidden headers", () => {
    expectNoViolations(
      emptyTableHeader,
      `
      <table>
        <tr><th aria-hidden="true"></th></tr>
      </table>
    `,
    );
  });
});
