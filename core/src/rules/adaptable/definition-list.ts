import type { DeclarativeRule } from "../types";
import { compileDeclarativeRule } from "../engine";

const definitionListSpec: DeclarativeRule = {
  id: "adaptable/definition-list",
  selector: "dl",
  check: {
    type: "child-invalid",
    allowedChildren: ["dt", "dd", "div", "script", "template", "style"],
  },
  impact: "serious",
  message: "<dl> contains invalid child <{{tag}}>.",
  description:
    "<dl> elements must only contain <dt>, <dd>, <div>, <script>, <template>, or <style>.",
  wcag: ["1.3.1"],
  level: "A",
  fixability: "contextual",
  guidance:
    "Definition lists have strict content requirements. Only <dt> (terms), <dd> (definitions), and <div> (for grouping dt/dd pairs) are valid children. Other elements break the list structure for screen readers. Move invalid elements outside the <dl>, or if they represent a term change to <dt>, if a definition change to <dd>. Styling wrappers should be replaced with <div> elements containing <dt>/<dd> pairs.",
};

export const definitionList = compileDeclarativeRule(definitionListSpec);
