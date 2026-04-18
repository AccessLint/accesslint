export type PluginSpec = {
  sourceModule: string;
  targetModule: string;
};

export const plugins = {
  "jest-axe": {
    sourceModule: "jest-axe",
    targetModule: "@accesslint/jest",
  },
  "vitest-axe": {
    sourceModule: "vitest-axe",
    targetModule: "@accesslint/vitest",
  },
  "jasmine-axe": {
    sourceModule: "jasmine-axe",
    targetModule: "@accesslint/jest",
  },
} as const satisfies Record<string, PluginSpec>;

export type PluginKey = keyof typeof plugins;
