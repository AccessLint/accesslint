import type { AuditOptions, Violation } from "@accesslint/core";

/** Source dialects this package can audit. Only `jsx`/`tsx` ship today. */
export type Dialect = "jsx" | "tsx";

/**
 * Why the static layer could not decide a finding. Every suppressed candidate
 * carries one, and it names the evidence a resolver (cross-file import walk, or
 * the LLM verifier) would have to produce to unsuppress the finding.
 */
export type UnknownKind =
  /** The element carries `{...spread}`, so an attribute's absence is unprovable. */
  | "spread"
  /** A child is a component element, so what it renders is unknown here. */
  | "component-child"
  /** A child is an expression whose shape does not resolve to JSX or a literal. */
  | "opaque-expression"
  /** An attribute the rule reads has an expression value. */
  | "unknown-attribute-value"
  /** role / aria-hidden / hidden / inert / style is unknown on the element or an ancestor. */
  | "unknown-semantics"
  /** aria-labelledby points at an id this file does not define. */
  | "external-idref"
  /** The file emits exclusive branches, so document order is not a real order. */
  | "exclusive-branches";

export interface SourceUnknown {
  kind: UnknownKind;
  /** Human-readable statement of what is unknown, for the comment or the log. */
  detail: string;
  /** The attribute involved, when the unknown is attribute-shaped. */
  attribute?: string;
  /** The source text of the expression involved, truncated. */
  expression?: string;
}

/** A violation the static layer proved, located in the source file. */
export interface SourceFinding {
  ruleId: string;
  impact: Violation["impact"];
  message: string;
  context?: string;
  /** The synthetic HTML for the element, as the engine saw it. */
  html: string;
  selector: string;
  /** 1-based line in the *source* file, from the AST. */
  line: number;
  /** 1-based column in the source file. */
  column: number;
  /** The filename passed in, when one was. */
  file?: string;
}

/**
 * A violation the engine reported that the source cannot prove. Never a comment
 * on its own: it is the input to the unsuppression layer, which may promote it
 * only against real repo evidence.
 */
export interface SourceCandidate extends SourceFinding {
  unknown: SourceUnknown;
}

export interface SourceAuditResult {
  findings: SourceFinding[];
  candidates: SourceCandidate[];
  dialect: Dialect | null;
  /** False when the file could not be parsed — findings and candidates are empty. */
  parsed: boolean;
  /** The synthetic HTML the engine audited, markers removed. For debugging. */
  html: string;
}

export interface AuditSourceOptions {
  /** The file's source text. */
  source: string;
  /**
   * A document to audit in. Emptied and rewritten. The caller owns the DOM
   * implementation (happy-dom, jsdom, a browser) exactly as `@accesslint/core`
   * expects, including the globals its rules read (`getComputedStyle`, element
   * constructors).
   */
  document: Document;
  /** Used for dialect detection and reported on every finding. */
  filename?: string;
  /** Overrides detection from `filename`. */
  dialect?: Dialect;
  /**
   * Merged over the source-mode defaults. `disabledRules` adds to
   * `SOURCE_MODE_DISABLED_RULES` rather than replacing it, and `componentMode`
   * cannot be turned off — see decision 8 in the plan.
   */
  auditOptions?: Omit<AuditOptions, "componentMode">;
}
