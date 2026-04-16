import { makeNoDuplicateLandmarkRule } from "./constants";

export const noDuplicateMain = makeNoDuplicateLandmarkRule({
  id: "landmarks/no-duplicate-main",
  selector: 'main, [role="main"]',
  landmarkName: "main",
  description: "Page should not have more than one main landmark.",
  guidance: "Only one main landmark should exist per page. The main landmark identifies the primary content area. If you have multiple content sections, use <section> with appropriate headings instead of multiple main elements.",
  filterTopLevel: false,
});
