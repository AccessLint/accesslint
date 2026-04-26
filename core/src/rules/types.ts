/**
 * How easily an agent can fix violations of this rule:
 * - `mechanical`: Deterministic fix, no judgment needed (e.g., remove tabindex > 0)
 * - `contextual`: Needs surrounding context but an LLM can reason about it (e.g., suggest alt text)
 * - `visual`: Requires seeing the rendered output or design intent (e.g., color contrast). Violation context may include computed values like colors and ratios that partially bridge the gap.
 */
export type Fixability = "mechanical" | "contextual" | "visual";

export interface Rule {
  id: string;
  category: string;
  actRuleIds?: string[];
  wcag: string[];
  level: "A" | "AA" | "AAA";
  tags?: string[];
  /** How easily an agent can fix violations of this rule */
  fixability?: Fixability;
  /** Hint describing what an agent with browser access (screenshots, DevTools) can do to improve fixing or verifying this rule */
  browserHint?: string;
  description: string;
  /** Generic remediation guidance for the AI to contextualize */
  guidance?: string;
  run(doc: Document): Violation[];
}

/** Structured fix suggestion for agents and automated tooling */
export type FixSuggestion =
  | { type: "add-attribute"; attribute: string; value: string }
  | { type: "set-attribute"; attribute: string; value: string }
  | { type: "remove-attribute"; attribute: string }
  | {
      type: "add-element";
      tag: string;
      parent: string;
      attributes?: Record<string, string>;
      textContent?: string;
    }
  | { type: "remove-element" }
  | { type: "add-text-content"; text?: string }
  | { type: "suggest"; suggestion: string };

export interface Violation {
  ruleId: string;
  selector: string;
  html: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  message: string;
  /** Surrounding context for understanding the violation (shown in reports and used by AI) */
  context?: string;
  /** Structured fix suggestion for agents and automated tooling */
  fix?: FixSuggestion;
  element?: Element;
  /**
   * Candidate source locations for the violating element, ordered highest-confidence first.
   * Populated by an opt-in post-processor (e.g. attachReactFiberSource); absent on static audits.
   */
  source?: SourceLocation[];
}

/** A candidate source-code location for a violating DOM element. */
export interface SourceLocation {
  /** Source file path or URL — always opened-able; chunk URLs are resolved via sourcemap before reaching this field. */
  file: string;
  /** 1-based line number. */
  line: number;
  /** 1-based column, when known. */
  column?: number;
  /** Component or function name, when known (e.g. "ProductCard"). */
  symbol?: string;
  /** 0 = JSX literal that produced the element; 1+ = enclosing component(s). */
  ownerDepth: number;
}

export interface AuditResult {
  url: string;
  timestamp: number;
  violations: Violation[];
  ruleCount: number;
  skippedRules: { ruleId: string; error: string }[];
}

export interface DiffResult {
  /** Violations present in `after` but not in `before` */
  added: Violation[];
  /** Violations present in `before` but not in `after` */
  fixed: Violation[];
  /** Violations present in both */
  unchanged: Violation[];
}

// --- Declarative rule engine types ---

export interface SelectorExistsCheck {
  type: "selector-exists";
}

export interface AttributeValueCheck {
  type: "attribute-value";
  attribute: string;
  operator: ">" | "<" | "=" | "!=" | "in" | "not-in";
  value: number | string | string[];
}

export interface AttributeMissingCheck {
  type: "attribute-missing";
  attribute: string;
}

export interface AttributeRegexCheck {
  type: "attribute-regex";
  attribute: string;
  pattern: string;
  flags?: string;
  shouldMatch: boolean;
}

export interface ChildRequiredCheck {
  type: "child-required";
  childSelector: string;
}

export interface ChildInvalidCheck {
  type: "child-invalid";
  allowedChildren: string[];
  /** Also accept children with these role attribute values */
  allowedChildRoles?: string[];
}

export type CheckType =
  | SelectorExistsCheck
  | AttributeValueCheck
  | AttributeMissingCheck
  | AttributeRegexCheck
  | ChildRequiredCheck
  | ChildInvalidCheck;

export interface DeclarativeRule {
  id: string;
  actRuleIds?: string[];
  selector: string;
  check: CheckType;
  impact: "critical" | "serious" | "moderate" | "minor";
  message: string;
  description: string;
  wcag: string[];
  level: "A" | "AA" | "AAA";
  tags?: string[];
  fixability?: Fixability;
  browserHint?: string;
  guidance?: string;
  fix?: FixSuggestion;
  skipAriaHidden?: boolean;
  documentOnly?: boolean;
}
