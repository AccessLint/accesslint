import type { Rule, Violation, DeclarativeRule, CheckType } from "./types";
import { getSelector, getHtmlSnippet } from "./utils/selector";
import { isAriaHidden } from "./utils/aria";

/**
 * Validate a declarative rule spec. Returns an error message string if
 * invalid, or null if valid.
 */
export function validateDeclarativeRule(spec: unknown): string | null {
  if (typeof spec !== "object" || spec === null) {
    return "Rule spec must be an object";
  }
  const s = spec as Record<string, unknown>;
  if (typeof s.id !== "string" || s.id.length === 0) {
    return "Rule must have a non-empty string id";
  }
  if (typeof s.selector !== "string" || s.selector.length === 0) {
    return "Rule must have a non-empty string selector";
  }
  if (typeof s.check !== "object" || s.check === null) {
    return "Rule must have a check object";
  }
  const check = s.check as Record<string, unknown>;
  const validTypes = [
    "selector-exists",
    "attribute-value",
    "attribute-missing",
    "attribute-regex",
    "child-required",
    "child-invalid",
  ];
  if (!validTypes.includes(check.type as string)) {
    return `Invalid check type: ${String(check.type)}`;
  }
  if (
    typeof s.impact !== "string" ||
    !["critical", "serious", "moderate", "minor"].includes(s.impact)
  ) {
    return "Rule must have a valid impact (critical|serious|moderate|minor)";
  }
  if (typeof s.message !== "string" || s.message.length === 0) {
    return "Rule must have a non-empty message";
  }
  if (typeof s.description !== "string") {
    return "Rule must have a description string";
  }
  if (!Array.isArray(s.wcag)) {
    return "Rule must have a wcag array";
  }
  if (typeof s.level !== "string" || !["A", "AA"].includes(s.level)) {
    return "Rule must have level A or AA";
  }

  // Validate check-specific fields
  const err = validateCheckFields(check);
  if (err) return err;

  return null;
}

function validateCheckFields(check: Record<string, unknown>): string | null {
  switch (check.type) {
    case "selector-exists":
      return null;
    case "attribute-value":
      if (typeof check.attribute !== "string")
        return "attribute-value check requires attribute string";
      if (![">", "<", "=", "!=", "in", "not-in"].includes(check.operator as string)) {
        return "attribute-value check requires valid operator";
      }
      if (check.value === undefined) return "attribute-value check requires value";
      return null;
    case "attribute-missing":
      if (typeof check.attribute !== "string")
        return "attribute-missing check requires attribute string";
      return null;
    case "attribute-regex":
      if (typeof check.attribute !== "string")
        return "attribute-regex check requires attribute string";
      if (typeof check.pattern !== "string") return "attribute-regex check requires pattern string";
      if (typeof check.shouldMatch !== "boolean")
        return "attribute-regex check requires shouldMatch boolean";
      return null;
    case "child-required":
      if (typeof check.childSelector !== "string")
        return "child-required check requires childSelector string";
      return null;
    case "child-invalid":
      if (!Array.isArray(check.allowedChildren))
        return "child-invalid check requires allowedChildren array";
      return null;
    default:
      return `Unknown check type: ${String(check.type)}`;
  }
}

/** Apply {{value}} and {{tag}} template substitutions to a message string. */
function applyTemplate(template: string, el: Element, check: CheckType): string {
  let result = template;
  if (result.includes("{{tag}}")) {
    result = result.replace(/\{\{tag\}\}/g, el.tagName.toLowerCase());
  }
  if (result.includes("{{value}}")) {
    let value = "";
    if ("attribute" in check && check.attribute) {
      value = el.getAttribute(check.attribute) ?? "";
    }
    result = result.replace(/\{\{value\}\}/g, value);
  }
  return result;
}

/**
 * Compile a declarative rule JSON spec into a Rule object with a
 * generated run() method.
 */
export function compileDeclarativeRule(spec: DeclarativeRule): Rule {
  const skipAriaHidden = spec.skipAriaHidden !== false; // default true

  return {
    id: spec.id,
    category: spec.id.split("/")[0],
    actRuleIds: spec.actRuleIds,
    wcag: spec.wcag,
    level: spec.level,
    tags: spec.tags,
    fixability: spec.fixability,
    browserHint: spec.browserHint,
    description: spec.description,
    guidance: spec.guidance,
    run(doc: Document): Violation[] {
      const violations: Violation[] = [];

      switch (spec.check.type) {
        case "selector-exists": {
          for (const el of doc.querySelectorAll(spec.selector)) {
            if (skipAriaHidden && isAriaHidden(el)) continue;
            violations.push({
              ruleId: spec.id,
              selector: getSelector(el),
              html: getHtmlSnippet(el),
              impact: spec.impact,
              message: applyTemplate(spec.message, el, spec.check),
              fix: spec.fix,
              element: el,
            });
          }
          break;
        }

        case "attribute-value": {
          const { attribute, operator, value } = spec.check;
          for (const el of doc.querySelectorAll(spec.selector)) {
            if (skipAriaHidden && isAriaHidden(el)) continue;
            const attrVal = el.getAttribute(attribute);
            if (attrVal === null) continue;
            if (isAttributeViolation(attrVal, operator, value)) {
              violations.push({
                ruleId: spec.id,
                selector: getSelector(el),
                html: getHtmlSnippet(el),
                impact: spec.impact,
                message: applyTemplate(spec.message, el, spec.check),
                fix: spec.fix,
                element: el,
              });
            }
          }
          break;
        }

        case "attribute-missing": {
          const { attribute } = spec.check;
          for (const el of doc.querySelectorAll(spec.selector)) {
            if (skipAriaHidden && isAriaHidden(el)) continue;
            if (!el.hasAttribute(attribute)) {
              violations.push({
                ruleId: spec.id,
                selector: getSelector(el),
                html: getHtmlSnippet(el),
                impact: spec.impact,
                message: applyTemplate(spec.message, el, spec.check),
                fix: spec.fix,
                element: el,
              });
            }
          }
          break;
        }

        case "attribute-regex": {
          const { attribute, pattern, flags, shouldMatch } = spec.check;
          let regex: RegExp;
          try {
            regex = new RegExp(pattern, flags);
          } catch {
            break; // invalid regex — skip rule silently
          }
          for (const el of doc.querySelectorAll(spec.selector)) {
            if (skipAriaHidden && isAriaHidden(el)) continue;
            const attrVal = el.getAttribute(attribute);
            if (attrVal === null) continue;
            const matches = regex.test(attrVal);
            if (shouldMatch && !matches) {
              violations.push({
                ruleId: spec.id,
                selector: getSelector(el),
                html: getHtmlSnippet(el),
                impact: spec.impact,
                message: applyTemplate(spec.message, el, spec.check),
                fix: spec.fix,
                element: el,
              });
            } else if (!shouldMatch && matches) {
              violations.push({
                ruleId: spec.id,
                selector: getSelector(el),
                html: getHtmlSnippet(el),
                impact: spec.impact,
                message: applyTemplate(spec.message, el, spec.check),
                fix: spec.fix,
                element: el,
              });
            }
          }
          break;
        }

        case "child-required": {
          const { childSelector } = spec.check;
          for (const el of doc.querySelectorAll(spec.selector)) {
            if (skipAriaHidden && isAriaHidden(el)) continue;
            if (!el.querySelector(childSelector)) {
              violations.push({
                ruleId: spec.id,
                selector: getSelector(el),
                html: getHtmlSnippet(el),
                impact: spec.impact,
                message: applyTemplate(spec.message, el, spec.check),
                fix: spec.fix,
                element: el,
              });
            }
          }
          break;
        }

        case "child-invalid": {
          const allowedSet = new Set(spec.check.allowedChildren.map((t) => t.toLowerCase()));
          const allowedRoleSet = spec.check.allowedChildRoles
            ? new Set(spec.check.allowedChildRoles.map((r) => r.toLowerCase()))
            : null;
          const semanticChildren = spec.check.allowedChildren.filter(
            (t) => t !== "script" && t !== "template",
          );
          const wrapped = semanticChildren.map((t) => `<${t}>`).join(" or ");
          for (const el of doc.querySelectorAll(spec.selector)) {
            if (skipAriaHidden && isAriaHidden(el)) continue;
            // Skip elements with role="presentation" or role="none" —
            // presentational containers have no semantics to enforce
            const parentRole = el.getAttribute("role")?.trim().toLowerCase();
            if (parentRole === "presentation" || parentRole === "none") continue;
            let found = false;
            // Check for bare text nodes (non-whitespace) — invalid direct children
            for (const node of el.childNodes) {
              if (node.nodeType === 3 && node.textContent && node.textContent.trim()) {
                violations.push({
                  ruleId: spec.id,
                  selector: getSelector(el),
                  html: getHtmlSnippet(el),
                  impact: spec.impact,
                  message: `<${el.tagName.toLowerCase()}> contains direct text content. Wrap in ${wrapped}.`,
                  fix: spec.fix,
                  element: el,
                });
                found = true;
                break;
              }
            }
            if (found) continue;
            for (const child of el.children) {
              if (allowedSet.has(child.tagName.toLowerCase())) continue;
              // Check child's role attribute
              const childRole = child.getAttribute("role")?.trim().toLowerCase();
              if (childRole && allowedRoleSet?.has(childRole)) continue;
              // Allow role="presentation" / role="none" children (pass-through containers)
              if (childRole === "presentation" || childRole === "none") continue;
              violations.push({
                ruleId: spec.id,
                selector: getSelector(child),
                html: getHtmlSnippet(child),
                impact: spec.impact,
                message: applyTemplate(spec.message, child, spec.check),
                fix: spec.fix,
                element: child,
              });
              break; // one violation per parent
            }
          }
          break;
        }
      }

      return violations;
    },
  };
}

function isAttributeViolation(
  attrVal: string,
  operator: ">" | "<" | "=" | "!=" | "in" | "not-in",
  value: number | string | string[],
): boolean {
  switch (operator) {
    case ">":
      return parseFloat(attrVal) > (value as number);
    case "<":
      return parseFloat(attrVal) < (value as number);
    case "=":
      return attrVal === String(value);
    case "!=":
      return attrVal !== String(value);
    case "in":
      return Array.isArray(value) && value.includes(attrVal);
    case "not-in":
      return Array.isArray(value) && !value.includes(attrVal);
    default:
      return false;
  }
}
