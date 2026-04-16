export interface Category {
  slug: string;
  name: string;
  wcagGuideline: string | null;
  principle: "perceivable" | "operable" | "understandable" | "robust" | null;
}

export const categories: Category[] = [
  { slug: "text-alternatives", name: "Text Alternatives", wcagGuideline: "1.1", principle: "perceivable" },
  { slug: "time-based-media", name: "Time-based Media", wcagGuideline: "1.2", principle: "perceivable" },
  { slug: "adaptable", name: "Adaptable", wcagGuideline: "1.3", principle: "perceivable" },
  { slug: "distinguishable", name: "Distinguishable", wcagGuideline: "1.4", principle: "perceivable" },
  { slug: "keyboard-accessible", name: "Keyboard Accessible", wcagGuideline: "2.1", principle: "operable" },
  { slug: "enough-time", name: "Enough Time", wcagGuideline: "2.2", principle: "operable" },
  { slug: "navigable", name: "Navigable", wcagGuideline: "2.4", principle: "operable" },
  { slug: "landmarks", name: "Landmarks", wcagGuideline: null, principle: null },
  { slug: "readable", name: "Readable", wcagGuideline: "3.1", principle: "understandable" },
  { slug: "input-assistance", name: "Input Assistance", wcagGuideline: "3.3", principle: "understandable" },
  { slug: "labels-and-names", name: "Labels and Names", wcagGuideline: "4.1", principle: "robust" },
  { slug: "aria", name: "ARIA", wcagGuideline: "4.1", principle: "robust" },
];
