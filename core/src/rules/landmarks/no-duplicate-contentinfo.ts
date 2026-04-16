import { makeNoDuplicateLandmarkRule } from "./constants";

export const noDuplicateContentinfo = makeNoDuplicateLandmarkRule({
  id: "landmarks/no-duplicate-contentinfo",
  selector: 'footer, [role="contentinfo"]',
  landmarkName: "contentinfo",
  description: "Page should not have more than one contentinfo landmark.",
  guidance: "The contentinfo landmark (typically <footer>) contains information about the page like copyright and contact info. Only one top-level contentinfo is allowed per page. Nest additional footers inside sectioning elements to scope them.",
  filterTopLevel: true,
});
