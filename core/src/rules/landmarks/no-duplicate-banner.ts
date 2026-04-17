import { makeNoDuplicateLandmarkRule } from "./constants";

export const noDuplicateBanner = makeNoDuplicateLandmarkRule({
  id: "landmarks/no-duplicate-banner",
  selector: 'header, [role="banner"]',
  landmarkName: "banner",
  description: "Page should not have more than one banner landmark.",
  guidance:
    "The banner landmark (typically <header>) identifies site-oriented content like logos and search. Only one top-level banner is allowed per page. If you need multiple headers, nest them inside sectioning elements (article, section, aside) where they become scoped headers rather than page-level banners.",
  filterTopLevel: true,
});
