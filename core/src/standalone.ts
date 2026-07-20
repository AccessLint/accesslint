// Standalone (IIFE) entry point — excludes locale data bundles.

export { version } from "./metadata";

// Core audit
export { rules, runAudit, getRuleById, getActiveRules, clearAllCaches } from "./rules/index";
export type { ChunkedAudit, AuditOptions } from "./rules/index";
export { createChunkedAudit } from "./rules/index";

// Declarative rule engine
export { compileDeclarativeRule, validateDeclarativeRule } from "./rules/engine";

// Types
export type {
  Rule,
  DeprecatedInfo,
  Violation,
  AuditResult,
  TestEngine,
  TestEnvironment,
  DeclarativeRule,
  CheckType,
  SourceLocation,
} from "./rules/types";

// Source mapping (opt-in post-processors)
export { attachReactFiberSource } from "./sourcemap/react-fiber";

// Utilities (useful for custom rule authors)
export {
  getAccessibleName,
  getComputedRole,
  getImplicitRole,
  isAriaHidden,
  isValidRole,
  getAccessibleTextContent,
  clearAriaHiddenCache,
  clearComputedRoleCache,
} from "./rules/utils/aria";

export {
  getSelector,
  getHtmlSnippet,
  querySelectorShadowAware,
  extractAnchor,
  buildRelativeLocation,
} from "./rules/utils/selector";

export { getResilientLocator } from "./rules/utils/resilient-locator";
export { isGeneratedId, isStableId } from "./rules/utils/generated-id";

// Cache clearing (useful for test helpers and extension integration)
export { clearAriaAttrAuditCache } from "./rules/aria/aria-attr-audit";
export { clearColorCaches } from "./rules/utils/color";

// i18n (API only, no bundled locale data)
export { registerLocale, translateViolations } from "./i18n/registry";
export type { LocaleMap, RuleTranslation } from "./i18n/types";
