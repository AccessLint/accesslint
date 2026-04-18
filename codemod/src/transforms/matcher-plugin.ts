import type {
  API,
  ASTPath,
  AwaitExpression,
  CallExpression,
  Collection,
  ExpressionStatement,
  FileInfo,
  Identifier,
  JSCodeshift,
  MemberExpression,
  Node,
  Options,
  VariableDeclaration,
  VariableDeclarator,
} from "jscodeshift";

const TODO_PREFIX = "TODO(accesslint-codemod):";

const asString = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "name" in value) {
    const nested = (value as { name?: unknown }).name;
    if (typeof nested === "string") return nested;
  }
  return null;
};

const literalStringValue = (node: Node | null | undefined): string | null => {
  if (!node) return null;
  if (node.type === "Literal" || node.type === "StringLiteral") {
    const v = (node as { value?: unknown }).value;
    return typeof v === "string" ? v : null;
  }
  return null;
};

const isRequireCall = (node: Node | null | undefined, moduleName: string): boolean => {
  if (!node || node.type !== "CallExpression") return false;
  const call = node as CallExpression;
  if (call.callee.type !== "Identifier") return false;
  if ((call.callee as Identifier).name !== "require") return false;
  return literalStringValue(call.arguments[0] as Node | undefined) === moduleName;
};

export type MatcherPluginOptions = {
  sourceModule: string;
  targetModule: string;
  axeName?: string;
  matcherName?: string;
  configName?: string;
  targetMatcher?: string;
};

type ResolvedOptions = Required<MatcherPluginOptions>;

type Names = {
  axe: string | null;
  matcher: string | null;
  config: string | null;
};

const resolveOptions = (opts: Options): ResolvedOptions => {
  if (typeof opts.sourceModule !== "string" || typeof opts.targetModule !== "string") {
    throw new Error(
      "@accesslint/codemod matcher-plugin transform requires sourceModule and targetModule options",
    );
  }
  return {
    sourceModule: opts.sourceModule,
    targetModule: opts.targetModule,
    axeName: typeof opts.axeName === "string" ? opts.axeName : "axe",
    matcherName: typeof opts.matcherName === "string" ? opts.matcherName : "toHaveNoViolations",
    configName: typeof opts.configName === "string" ? opts.configName : "configureAxe",
    targetMatcher: typeof opts.targetMatcher === "string" ? opts.targetMatcher : "toBeAccessible",
  };
};

const transform = (file: FileInfo, api: API, options: Options): string | null | undefined => {
  const resolved = resolveOptions(options);
  const j: JSCodeshift = api.jscodeshift;
  const root = j(file.source);

  const names = collectImportedNames(j, root, resolved);
  if (!names.axe && !names.matcher && !names.config) {
    return null;
  }

  let mutated = false;
  const warnings: string[] = [];

  const effectiveMatcher = names.matcher ?? resolved.matcherName;

  if (names.matcher) {
    mutated = removeExpectExtend(j, root, names.matcher) || mutated;
  }

  if (names.axe) {
    mutated =
      collapseAxeThenAssert(j, root, names.axe, effectiveMatcher, resolved.targetMatcher) ||
      mutated;
    mutated =
      collapseInlineAxeAssert(j, root, names.axe, effectiveMatcher, resolved.targetMatcher) ||
      mutated;
  }

  if (names.config) {
    warnings.push(
      `${TODO_PREFIX} ${resolved.configName}(...) has no ${resolved.targetModule} equivalent. ` +
        `Apply options per-call via expect(el).${resolved.targetMatcher}({ disabledRules, failOn, ... }).`,
    );
  }

  mutated = rewriteImports(j, root, resolved, names) || mutated;

  if (!mutated && warnings.length === 0) return null;

  if (warnings.length > 0) {
    prependFileComments(j, root, warnings);
  }

  return root.toSource({ quote: "double" });
};

const collectImportedNames = (
  j: JSCodeshift,
  root: Collection,
  opts: ResolvedOptions,
): Names => {
  const names: Names = { axe: null, matcher: null, config: null };

  root
    .find(j.ImportDeclaration, { source: { value: opts.sourceModule } })
    .forEach((path) => {
      const specifiers = path.node.specifiers ?? [];
      for (const spec of specifiers) {
        if (spec.type === "ImportSpecifier") {
          const imported = asString(spec.imported.name);
          const local = asString(spec.local?.name) ?? imported;
          if (!imported || !local) continue;
          if (imported === opts.axeName) names.axe = local;
          else if (imported === opts.matcherName) names.matcher = local;
          else if (imported === opts.configName) names.config = local;
        } else if (
          spec.type === "ImportDefaultSpecifier" ||
          spec.type === "ImportNamespaceSpecifier"
        ) {
          const local = asString(spec.local?.name);
          if (local) {
            names.axe = names.axe ?? `${local}.${opts.axeName}`;
            names.matcher = names.matcher ?? `${local}.${opts.matcherName}`;
          }
        }
      }
    });

  root
    .find(j.VariableDeclarator)
    .filter((p) => isRequireCall(p.node.init, opts.sourceModule))
    .forEach((path) => {
      const id = path.node.id;
      if (id.type === "ObjectPattern") {
        for (const prop of id.properties) {
          if (prop.type === "ObjectProperty" || prop.type === "Property") {
            const key = prop.key;
            const value = prop.value;
            if (key.type === "Identifier" && value.type === "Identifier") {
              if (key.name === opts.axeName) names.axe = value.name;
              else if (key.name === opts.matcherName) names.matcher = value.name;
              else if (key.name === opts.configName) names.config = value.name;
            }
          }
        }
      }
    });

  return names;
};

const removeExpectExtend = (
  j: JSCodeshift,
  root: Collection,
  matcherLocal: string,
): boolean => {
  const calls = root.find(j.ExpressionStatement, {
    expression: {
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: { type: "Identifier", name: "expect" },
        property: { type: "Identifier", name: "extend" },
      },
    },
  });

  let changed = false;
  calls.forEach((path) => {
    const call = (path.node as ExpressionStatement).expression as CallExpression;
    const args = call.arguments;
    const usesTarget = args.some((arg) => {
      if (arg.type === "Identifier" && arg.name === matcherLocal) return true;
      if (arg.type === "ObjectExpression") {
        return arg.properties.some((p) => {
          if (p.type === "ObjectProperty" || p.type === "Property") {
            const k = p.key;
            const v = p.value;
            return (
              (k.type === "Identifier" && k.name === matcherLocal) ||
              (v.type === "Identifier" && v.name === matcherLocal)
            );
          }
          if (p.type === "SpreadElement" || p.type === "SpreadProperty") {
            const arg = p.argument;
            return arg.type === "Identifier" && arg.name === matcherLocal;
          }
          return false;
        });
      }
      return false;
    });
    if (usesTarget) {
      j(path).remove();
      changed = true;
    }
  });
  return changed;
};

const collapseAxeThenAssert = (
  j: JSCodeshift,
  root: Collection,
  axeLocal: string,
  matcherLocal: string,
  targetMatcher: string,
): boolean => {
  let changed = false;
  root.find(j.VariableDeclaration).forEach((declPath) => {
    const decl = declPath.node as VariableDeclaration;
    if (decl.declarations.length !== 1) return;
    const declarator = decl.declarations[0] as VariableDeclarator;
    if (declarator.id.type !== "Identifier") return;
    const resultVar = declarator.id.name;
    const init = declarator.init;
    if (!init || init.type !== "AwaitExpression") return;
    const awaited = (init as AwaitExpression).argument;
    if (!awaited || !isAxeCall(awaited, axeLocal)) return;

    const axeCall = awaited as CallExpression;
    if (axeCall.arguments.length < 1) return;
    const target = axeCall.arguments[0];
    if (target.type === "SpreadElement") return;
    const hadExtraArgs = axeCall.arguments.length > 1;

    const parent = declPath.parent.node as Node & { body?: Node[] };
    const siblings = parent.body;
    if (!Array.isArray(siblings)) return;
    const index = siblings.indexOf(decl);
    if (index < 0 || index + 1 >= siblings.length) return;

    const nextStmt = siblings[index + 1];
    if (!matchesMatcherCall(nextStmt, resultVar, matcherLocal)) return;

    const replacement = buildTargetStatement(j, target, hadExtraArgs, targetMatcher);
    siblings.splice(index, 2, replacement);
    changed = true;
  });

  return changed;
};

const collapseInlineAxeAssert = (
  j: JSCodeshift,
  root: Collection,
  axeLocal: string,
  matcherLocal: string,
  targetMatcher: string,
): boolean => {
  let changed = false;
  root.find(j.CallExpression).forEach((path: ASTPath<CallExpression>) => {
    const call = path.node;
    const callee = call.callee;
    if (callee.type !== "MemberExpression") return;
    const member = callee as MemberExpression;
    if (member.object.type !== "CallExpression") return;
    const expectCall = member.object;
    if (expectCall.callee.type !== "Identifier" || expectCall.callee.name !== "expect") return;
    if (member.property.type !== "Identifier" || member.property.name !== matcherLocal) return;
    if (expectCall.arguments.length !== 1) return;
    const expectArg = expectCall.arguments[0];
    if (expectArg.type !== "AwaitExpression") return;
    const inner = (expectArg as AwaitExpression).argument;
    if (!inner || !isAxeCall(inner, axeLocal)) return;

    const axeCall = inner as CallExpression;
    if (axeCall.arguments.length < 1) return;
    const target = axeCall.arguments[0];
    if (target.type === "SpreadElement") return;
    const hadExtraArgs = axeCall.arguments.length > 1;

    const newCall = buildTargetCall(j, target, hadExtraArgs, targetMatcher);
    path.replace(newCall);
    changed = true;
  });

  return changed;
};

const matchesMatcherCall = (
  node: Node,
  resultVar: string,
  matcherLocal: string,
): boolean => {
  if (node.type !== "ExpressionStatement") return false;
  const expr = (node as ExpressionStatement).expression;
  if (expr.type !== "CallExpression") return false;
  const callee = expr.callee;
  if (callee.type !== "MemberExpression") return false;
  const member = callee as MemberExpression;
  if (member.object.type !== "CallExpression") return false;
  const expectCall = member.object;
  if (expectCall.callee.type !== "Identifier" || expectCall.callee.name !== "expect") return false;
  if (expectCall.arguments.length !== 1) return false;
  const arg = expectCall.arguments[0];
  if (arg.type !== "Identifier" || (arg as Identifier).name !== resultVar) return false;
  if (member.property.type !== "Identifier") return false;
  return (member.property as Identifier).name === matcherLocal;
};

const isAxeCall = (node: Node, axeLocal: string): boolean => {
  if (node.type !== "CallExpression") return false;
  const call = node as CallExpression;
  const callee = call.callee;
  if (axeLocal.includes(".")) {
    const [obj, prop] = axeLocal.split(".");
    return (
      callee.type === "MemberExpression" &&
      (callee as MemberExpression).object.type === "Identifier" &&
      ((callee as MemberExpression).object as Identifier).name === obj &&
      (callee as MemberExpression).property.type === "Identifier" &&
      ((callee as MemberExpression).property as Identifier).name === prop
    );
  }
  return callee.type === "Identifier" && (callee as Identifier).name === axeLocal;
};

const buildTargetCall = (
  j: JSCodeshift,
  target: CallExpression["arguments"][number],
  hadExtraArgs: boolean,
  targetMatcher: string,
): CallExpression => {
  const expectCall = j.callExpression(j.identifier("expect"), [target]);
  const call = j.callExpression(
    j.memberExpression(expectCall, j.identifier(targetMatcher)),
    [],
  );
  if (hadExtraArgs) {
    const comment = j.commentLine(
      ` ${TODO_PREFIX} original axe() options not auto-migrated; re-apply via ${targetMatcher}({ disabledRules, failOn, ... })`,
      true,
      false,
    );
    (call as Node & { comments?: unknown[] }).comments = [comment];
  }
  return call;
};

const buildTargetStatement = (
  j: JSCodeshift,
  target: CallExpression["arguments"][number],
  hadExtraArgs: boolean,
  targetMatcher: string,
): ExpressionStatement => {
  const call = buildTargetCall(j, target, hadExtraArgs, targetMatcher);
  const stmt = j.expressionStatement(call);
  const callWithComments = call as Node & { comments?: unknown[] };
  if (callWithComments.comments) {
    (stmt as Node & { comments?: unknown[] }).comments = callWithComments.comments;
    callWithComments.comments = undefined;
  }
  return stmt;
};

const rewriteImports = (
  j: JSCodeshift,
  root: Collection,
  opts: ResolvedOptions,
  names: Names,
): boolean => {
  let changed = false;
  const hasConfig = Boolean(names.config);

  root
    .find(j.ImportDeclaration, { source: { value: opts.sourceModule } })
    .forEach((path) => {
      const node = path.node;
      if (hasConfig) {
        const kept = (node.specifiers ?? []).filter((spec) => {
          if (spec.type !== "ImportSpecifier") return false;
          return spec.imported.name === opts.configName;
        });
        if (kept.length === (node.specifiers?.length ?? 0)) return;
        node.specifiers = kept;
        changed = true;
      } else {
        const sideEffect = j.importDeclaration([], j.literal(opts.targetModule));
        j(path).replaceWith(sideEffect);
        changed = true;
      }
    });

  if (hasConfig) {
    const anySource = root.find(j.ImportDeclaration, { source: { value: opts.sourceModule } });
    const anyTarget = root.find(j.ImportDeclaration, { source: { value: opts.targetModule } });
    if (anySource.size() > 0 && anyTarget.size() === 0) {
      const sideEffect = j.importDeclaration([], j.literal(opts.targetModule));
      anySource.at(0).insertAfter(sideEffect);
      changed = true;
    }
  }

  root.find(j.VariableDeclaration).forEach((path) => {
    const decl = path.node as VariableDeclaration;
    if (decl.declarations.length !== 1) return;
    const declarator = decl.declarations[0] as VariableDeclarator;
    if (!isRequireCall(declarator.init, opts.sourceModule)) return;

    if (hasConfig) {
      if (declarator.id.type === "ObjectPattern") {
        const before = declarator.id.properties.length;
        declarator.id.properties = declarator.id.properties.filter((prop) => {
          if (prop.type === "ObjectProperty" || prop.type === "Property") {
            const k = prop.key;
            if (k.type === "Identifier") {
              return k.name === opts.configName;
            }
          }
          return true;
        });
        if (declarator.id.properties.length !== before) changed = true;
      }
    } else {
      const sideEffectRequire = j.expressionStatement(
        j.callExpression(j.identifier("require"), [j.literal(opts.targetModule)]),
      );
      j(path).replaceWith(sideEffectRequire);
      changed = true;
    }
  });

  return changed;
};

const prependFileComments = (j: JSCodeshift, root: Collection, lines: string[]): void => {
  const program = root.get().node.program;
  const body = program.body;
  if (body.length === 0) return;
  const first = body[0];
  const existing = (first.comments ?? []) as unknown[];
  const newComments = lines.map((text) => j.commentLine(` ${text}`, true, false));
  first.comments = [...newComments, ...existing];
};

export default transform;
export const parser = "tsx";
