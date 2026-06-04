export interface PackageJsonish {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface InferredDefaults {
  devUrl: string;
  framework: string | null;
  storybook: { present: boolean; url: string };
}

const DEFAULT_DEV_PORT = 3000;
const DEFAULT_STORYBOOK_PORT = 6006;

export function parsePortFromScript(script: string | undefined): number | null {
  if (!script) return null;
  const m = script.match(/(?:^|\s)(?:-p|--port)[=\s]+(\d{2,5})\b/);
  return m ? Number(m[1]) : null;
}

interface FrameworkRule {
  label: string;
  deps: string[];
  prefixes?: string[];
  port: number;
}

// Order matters: astro/sveltekit depend on vite but bind a different port, so they precede it.
const FRAMEWORKS: FrameworkRule[] = [
  { label: "astro", deps: ["astro"], port: 4321 },
  { label: "sveltekit", deps: ["@sveltejs/kit"], port: 5173 },
  { label: "angular", deps: ["@angular/core"], port: 4200 },
  { label: "vue-cli", deps: ["@vue/cli-service"], port: 8080 },
  { label: "gatsby", deps: ["gatsby"], port: 8000 },
  { label: "vite", deps: ["vite"], port: 5173 },
  { label: "next", deps: ["next"], port: 3000 },
  { label: "nuxt", deps: ["nuxt"], port: 3000 },
  { label: "remix", deps: [], prefixes: ["@remix-run/"], port: 3000 },
  { label: "create-react-app", deps: ["react-scripts"], port: 3000 },
];

function allDeps(pkg: PackageJsonish | null): Set<string> {
  return new Set([
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.devDependencies ?? {}),
  ]);
}

function matchFramework(deps: Set<string>): FrameworkRule | null {
  for (const fw of FRAMEWORKS) {
    if (fw.deps.some((d) => deps.has(d))) return fw;
    if (fw.prefixes?.some((p) => [...deps].some((d) => d.startsWith(p)))) return fw;
  }
  return null;
}

function detectStorybook(
  pkg: PackageJsonish | null,
  deps: Set<string>,
): InferredDefaults["storybook"] {
  const scripts = pkg?.scripts ?? {};
  const scriptEntry = Object.entries(scripts).find(
    ([name, cmd]) => /storybook/i.test(name) || /storybook/i.test(cmd),
  );
  const hasDep = [...deps].some((d) => d === "storybook" || d.startsWith("@storybook/"));
  const present = Boolean(scriptEntry) || hasDep;
  const port = parsePortFromScript(scriptEntry?.[1]) ?? DEFAULT_STORYBOOK_PORT;
  return { present, url: `http://localhost:${port}` };
}

export function inferDefaults(pkg: PackageJsonish | null): InferredDefaults {
  const deps = allDeps(pkg);
  const fw = matchFramework(deps);
  const scripts = pkg?.scripts ?? {};
  const scriptPort = parsePortFromScript(scripts.dev) ?? parsePortFromScript(scripts.start);
  const port = scriptPort ?? fw?.port ?? DEFAULT_DEV_PORT;
  return {
    devUrl: `http://localhost:${port}`,
    framework: fw?.label ?? null,
    storybook: detectStorybook(pkg, deps),
  };
}
