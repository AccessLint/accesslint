import type { Rule, Violation, AuditResult, DiffResult } from "./types";
import {
  clearAriaHiddenCache,
  clearComputedRoleCache,
  clearAccessibleNameCache,
} from "./utils/aria";
import { clearAriaAttrAuditCache } from "./aria/aria-attr-audit";
import { clearColorCaches } from "./utils/color";
import { clearSelectorCache } from "./utils/selector";
import { applyLocale, translateViolations } from "../i18n/registry";

/**
 * Many imperative rules construct violations without setting `element`.
 * Post-processors (e.g. attachReactFiberSource) need the element reference,
 * so backfill any missing element by re-resolving the violation's selector
 * against the audited document. Shadow-DOM selectors (containing ` >>> `)
 * are skipped — they require global-document context and are rare.
 */
function backfillElements(violations: Violation[], doc: Document): void {
  for (const v of violations) {
    if (v.element) continue;
    if (!v.selector || v.selector.includes(" >>> ")) continue;
    try {
      const el = doc.querySelector(v.selector);
      if (el) v.element = el;
    } catch {
      // Invalid selector — leave element unset.
    }
  }
}

// Text Alternatives
import { imgAlt } from "./text-alternatives/img-alt";
import { svgImgAlt } from "./text-alternatives/svg-img-alt";
import { inputImageAlt } from "./text-alternatives/input-image-alt";
import { imageRedundantAlt } from "./text-alternatives/image-redundant-alt";
import { imageAltWords } from "./text-alternatives/image-alt-words";
import { areaAlt } from "./text-alternatives/area-alt";
import { objectAlt } from "./text-alternatives/object-alt";
import { roleImgAlt } from "./text-alternatives/role-img-alt";

// Time-based Media
import { videoCaptions } from "./time-based-media/video-captions";
import { audioTranscript } from "./time-based-media/audio-transcript";

// Adaptable
import { autocompleteValid } from "./adaptable/autocomplete-valid";
import { listChildren } from "./adaptable/list-children";
import { listitemParent } from "./adaptable/listitem-parent";
import { dlChildren } from "./adaptable/dl-children";
import { definitionList } from "./adaptable/definition-list";
import { orientationLock } from "./adaptable/orientation-lock";
import { ariaRequiredChildren } from "./adaptable/aria-required-children";
import { ariaRequiredParent } from "./adaptable/aria-required-parent";
import { tdHeadersAttr } from "./adaptable/td-headers-attr";
import { thHasDataCells } from "./adaptable/th-has-data-cells";
import { tdHasHeader } from "./adaptable/td-has-header";
import { scopeAttrValid } from "./adaptable/scope-attr-valid";
import { emptyTableHeader } from "./adaptable/empty-table-header";

// Distinguishable
import { metaViewport } from "./distinguishable/meta-viewport";
import { letterSpacing } from "./distinguishable/letter-spacing";
import { lineHeight } from "./distinguishable/line-height";
import { wordSpacing } from "./distinguishable/word-spacing";
import { linkInTextBlock } from "./distinguishable/link-in-text-block";
import { colorContrast } from "./distinguishable/color-contrast";
import { colorContrastEnhanced } from "./distinguishable/color-contrast-enhanced";

// Keyboard Accessible
import { serverImageMap } from "./keyboard-accessible/server-image-map";
import { tabindex } from "./keyboard-accessible/tabindex";
import { focusOrder } from "./keyboard-accessible/focus-order";
import { nestedInteractive } from "./keyboard-accessible/nested-interactive";
import { scrollableRegion } from "./keyboard-accessible/scrollable-region";
import { accesskeys } from "./keyboard-accessible/accesskeys";
import { focusVisible } from "./keyboard-accessible/focus-visible";

// Enough Time
import { metaRefresh } from "./enough-time/meta-refresh";
import { metaRefreshNoException } from "./enough-time/meta-refresh-no-exception";
import { blink } from "./enough-time/blink";
import { marquee } from "./enough-time/marquee";

// Navigable
import { documentTitle } from "./navigable/document-title";
import { bypass } from "./navigable/bypass";
import { pageHasHeadingOne } from "./navigable/page-has-heading-one";
import { headingOrder } from "./navigable/heading-order";
import { emptyHeading } from "./navigable/empty-heading";
import { pAsHeading } from "./navigable/p-as-heading";
import { linkName } from "./navigable/link-name";
import { skipLink } from "./navigable/skip-link";

// Landmarks
import { landmarkMain } from "./landmarks/landmark-main";
import { noDuplicateBanner } from "./landmarks/no-duplicate-banner";
import { noDuplicateContentinfo } from "./landmarks/no-duplicate-contentinfo";
import { noDuplicateMain } from "./landmarks/no-duplicate-main";
import { bannerIsTopLevel } from "./landmarks/banner-is-top-level";
import { contentinfoIsTopLevel } from "./landmarks/contentinfo-is-top-level";
import { mainIsTopLevel } from "./landmarks/main-is-top-level";
import { complementaryIsTopLevel } from "./landmarks/complementary-is-top-level";
import { landmarkUnique } from "./landmarks/landmark-unique";
import { region } from "./landmarks/region";

// Readable
import { htmlHasLang } from "./readable/html-has-lang";
import { htmlLangValid } from "./readable/html-lang-valid";
import { validLang } from "./readable/valid-lang";
import { htmlXmlLangMismatch } from "./readable/html-xml-lang-mismatch";

// Labels and Names
import { frameTitle } from "./labels-and-names/frame-title";
import { frameTitleUnique } from "./labels-and-names/frame-title-unique";
import { frameFocusableContent } from "./labels-and-names/frame-focusable-content";
import { formLabel } from "./labels-and-names/form-label";
import { multipleLabels } from "./labels-and-names/multiple-labels";
import { inputButtonName } from "./labels-and-names/input-button-name";
import { labelContentMismatch } from "./labels-and-names/label-content-mismatch";
import { labelTitleOnly } from "./labels-and-names/label-title-only";
import { labelPlaceholderOnly } from "./labels-and-names/label-placeholder-only";
import { ariaCommandName } from "./labels-and-names/aria-command-name";
import { ariaInputFieldName } from "./labels-and-names/aria-input-field-name";
import { ariaToggleFieldName } from "./labels-and-names/aria-toggle-field-name";
import { ariaMeterName } from "./labels-and-names/aria-meter-name";
import { ariaProgressbarName } from "./labels-and-names/aria-progressbar-name";
import { ariaDialogName } from "./labels-and-names/aria-dialog-name";
import { ariaTooltipName } from "./labels-and-names/aria-tooltip-name";
import { ariaTreeitemName } from "./labels-and-names/aria-treeitem-name";
import { buttonName } from "./labels-and-names/button-name";
import { summaryName } from "./labels-and-names/summary-name";
import { duplicateIdAria } from "./labels-and-names/duplicate-id-aria";

// Input Assistance
import { accessibleAuthentication } from "./input-assistance/accessible-authentication";

// ARIA
import { ariaRoles } from "./aria/aria-roles";
import { ariaValidAttr } from "./aria/aria-valid-attr";
import { ariaValidAttrValue } from "./aria/aria-valid-attr-value";
import { ariaRequiredAttr } from "./aria/aria-required-attr";
import { ariaAllowedAttr } from "./aria/aria-allowed-attr";
import { ariaAllowedRole } from "./aria/aria-allowed-role";
import { ariaHiddenBody } from "./aria/aria-hidden-body";
import { ariaHiddenFocus } from "./aria/aria-hidden-focus";
import { ariaProhibitedAttr } from "./aria/aria-prohibited-attr";
import { presentationRoleConflict } from "./aria/presentation-role-conflict";
import { presentationalChildrenFocusable } from "./aria/presentational-children-focusable";

export const rules: Rule[] = [
  // Text Alternatives
  imgAlt,
  svgImgAlt,
  inputImageAlt,
  imageRedundantAlt,
  imageAltWords,
  areaAlt,
  objectAlt,
  roleImgAlt,

  // Time-based Media
  videoCaptions,
  audioTranscript,

  // Adaptable
  autocompleteValid,
  listChildren,
  listitemParent,
  dlChildren,
  definitionList,
  orientationLock,
  ariaRequiredChildren,
  ariaRequiredParent,
  tdHeadersAttr,
  thHasDataCells,
  tdHasHeader,
  scopeAttrValid,
  emptyTableHeader,

  // Distinguishable
  metaViewport,
  letterSpacing,
  lineHeight,
  wordSpacing,
  linkInTextBlock,
  colorContrast,
  colorContrastEnhanced,

  // Keyboard Accessible
  serverImageMap,
  tabindex,
  focusOrder,
  nestedInteractive,
  scrollableRegion,
  accesskeys,
  focusVisible,

  // Enough Time
  metaRefresh,
  metaRefreshNoException,
  blink,
  marquee,

  // Navigable
  documentTitle,
  bypass,
  pageHasHeadingOne,
  headingOrder,
  emptyHeading,
  pAsHeading,
  linkName,
  skipLink,

  // Landmarks
  landmarkMain,
  noDuplicateBanner,
  noDuplicateContentinfo,
  noDuplicateMain,
  bannerIsTopLevel,
  contentinfoIsTopLevel,
  mainIsTopLevel,
  complementaryIsTopLevel,
  landmarkUnique,
  region,

  // Readable
  htmlHasLang,
  htmlLangValid,
  validLang,
  htmlXmlLangMismatch,

  // Labels and Names
  frameTitle,
  frameTitleUnique,
  frameFocusableContent,
  formLabel,
  multipleLabels,
  inputButtonName,
  labelContentMismatch,
  labelTitleOnly,
  labelPlaceholderOnly,
  ariaCommandName,
  ariaInputFieldName,
  ariaToggleFieldName,
  ariaMeterName,
  ariaProgressbarName,
  ariaDialogName,
  ariaTooltipName,
  ariaTreeitemName,
  buttonName,
  summaryName,
  duplicateIdAria,

  // Input Assistance
  accessibleAuthentication,

  // ARIA
  ariaRoles,
  ariaValidAttr,
  ariaValidAttrValue,
  ariaRequiredAttr,
  ariaAllowedAttr,
  ariaAllowedRole,
  ariaHiddenBody,
  ariaHiddenFocus,
  ariaProhibitedAttr,
  presentationRoleConflict,
  presentationalChildrenFocusable,
];

export interface ChunkedAudit {
  /** Process rules for up to budgetMs. Returns true if more rules remain. */
  processChunk(budgetMs: number): boolean;
  /** Return all violations collected so far. */
  getViolations(): Violation[];
  /** Return rules that were skipped due to errors. */
  getSkippedRules(): { ruleId: string; error: string }[];
}

export interface AuditOptions {
  /** Additional rules to include (e.g. compiled declarative rules) */
  additionalRules?: Rule[];
  /** Rule IDs to disable */
  disabledRules?: string[];
  /** Include AAA-level rules (excluded by default) */
  includeAAA?: boolean;
  /** Exclude page-level rules (document-title, landmarks, html-has-lang, etc.)
   *  for auditing components rendered in isolation */
  componentMode?: boolean;
  /** Locale for translated rule descriptions/guidance (e.g. 'en', 'es') */
  locale?: string;
}

/**
 * Return the full set of active rules for the given options: bundled (minus
 * user-disabled, minus AAA unless includeAAA is set) plus any additional
 * rules. When a locale is passed, returns shallow-cloned rules with
 * translated descriptions and guidance.
 */
export function getActiveRules(options?: AuditOptions): Rule[] {
  const disabled = new Set(options?.disabledRules ?? []);
  const includeAAA = !!options?.includeAAA;
  const componentMode = !!options?.componentMode;

  const active = rules.filter((r) => {
    if (disabled.has(r.id)) return false;
    if (r.level === "AAA" && !includeAAA) return false;
    if (componentMode && r.tags?.includes("page-level")) return false;
    return true;
  });

  const combined = options?.additionalRules?.length
    ? active.concat(options.additionalRules)
    : active;

  return options?.locale ? applyLocale(combined, options.locale) : combined;
}

/**
 * Create a chunked audit that processes rules in time-boxed batches.
 * Call processChunk() repeatedly (e.g. via setTimeout) to avoid long tasks.
 */
export function createChunkedAudit(doc: Document, options?: AuditOptions): ChunkedAudit {
  clearAllCaches();

  const activeRules = getActiveRules(options);
  const locale = options?.locale;
  const violations: Violation[] = [];
  const skippedRules: { ruleId: string; error: string }[] = [];
  let index = 0;

  return {
    processChunk(budgetMs: number) {
      const start = performance.now();
      while (index < activeRules.length) {
        const rule = activeRules[index];
        try {
          const result = rule.run(doc);
          for (let i = 0; i < result.length; i++) violations.push(result[i]);
        } catch (e) {
          skippedRules.push({ ruleId: rule.id, error: e instanceof Error ? e.message : String(e) });
        }
        index++;
        if (performance.now() - start >= budgetMs) break;
      }
      return index < activeRules.length;
    },
    getViolations() {
      backfillElements(violations, doc);
      return locale ? translateViolations(violations, locale) : violations;
    },
    getSkippedRules() {
      return skippedRules;
    },
  };
}

export function clearAllCaches(): void {
  clearAriaHiddenCache();
  clearComputedRoleCache();
  clearAccessibleNameCache();
  clearColorCaches();
  clearAriaAttrAuditCache();
  clearSelectorCache();
}

export function runAudit(doc: Document, options?: AuditOptions): AuditResult {
  clearAllCaches();

  const activeRules = getActiveRules(options);
  const locale = options?.locale;
  const violations: Violation[] = [];
  const skippedRules: { ruleId: string; error: string }[] = [];
  for (const rule of activeRules) {
    try {
      const result = rule.run(doc);
      for (let i = 0; i < result.length; i++) violations.push(result[i]);
    } catch (e) {
      skippedRules.push({ ruleId: rule.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  backfillElements(violations, doc);
  return {
    url: doc.location?.href ?? "",
    timestamp: Date.now(),
    violations: locale ? translateViolations(violations, locale) : violations,
    ruleCount: activeRules.length,
    skippedRules,
  };
}

/**
 * Compare two audit results to find added, fixed, and unchanged violations.
 * Violations are matched by ruleId + selector.
 */
export function diffAudit(before: AuditResult, after: AuditResult): DiffResult {
  const key = (v: Violation) => `${v.ruleId}\0${v.selector}`;

  const beforeSet = new Map<string, Violation>();
  for (const v of before.violations) {
    beforeSet.set(key(v), v);
  }

  const afterSet = new Map<string, Violation>();
  for (const v of after.violations) {
    afterSet.set(key(v), v);
  }

  const added: Violation[] = [];
  const unchanged: Violation[] = [];

  for (const [k, v] of afterSet) {
    if (beforeSet.has(k)) {
      unchanged.push(v);
    } else {
      added.push(v);
    }
  }

  const fixed: Violation[] = [];
  for (const [k, v] of beforeSet) {
    if (!afterSet.has(k)) {
      fixed.push(v);
    }
  }

  return { added, fixed, unchanged };
}

const ruleMap = new Map<string, Rule>(rules.map((r) => [r.id, r]));

export function getRuleById(
  id: string,
  options?: { locale?: string; additionalRules?: Rule[] },
): Rule | undefined {
  const rule = ruleMap.get(id) ?? options?.additionalRules?.find((r) => r.id === id);
  if (!rule) return undefined;
  return options?.locale ? applyLocale([rule], options.locale)[0] : rule;
}
