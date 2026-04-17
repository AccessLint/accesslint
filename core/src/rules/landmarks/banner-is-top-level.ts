import { makeNestedLandmarkRule } from "./constants";

export const bannerIsTopLevel = makeNestedLandmarkRule({
  id: "landmarks/banner-is-top-level",
  selector: '[role="banner"]',
  landmarkName: "Banner",
  description: "Banner landmark should not be nested within another landmark.",
  guidance:
    "The banner landmark should be a top-level landmark, not nested inside article, aside, main, nav, or section. If a header is inside these elements, it automatically becomes a generic header rather than a banner. Remove explicit role='banner' from nested headers or restructure the page.",
});
