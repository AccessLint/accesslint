// Standalone (IIFE) entry point — excludes locale data bundles.

// Core audit
export { rules, runAudit, getRuleById, getActiveRules, clearAllCaches } from "./rules/index";
export type { ChunkedAudit } from "./rules/index";
export { createChunkedAudit } from "./rules/index";

// Configuration
export { configureRules } from "./rules/index";
export type { ConfigureOptions } from "./rules/index";

// Declarative rule engine
export { compileDeclarativeRule, validateDeclarativeRule } from "./rules/engine";

// Types
export type {
  Rule,
  Violation,
  AuditResult,
  DeclarativeRule,
  CheckType,
} from "./rules/types";

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
} from "./rules/utils/selector";

// Cache clearing (useful for test helpers and extension integration)
export { clearAriaAttrAuditCache } from "./rules/aria/aria-attr-audit";
export { clearColorCaches } from "./rules/utils/color";

// i18n (API only, no bundled locale data)
export { registerLocale, translateViolations } from "./i18n/registry";
export type { LocaleMap, RuleTranslation } from "./i18n/types";
