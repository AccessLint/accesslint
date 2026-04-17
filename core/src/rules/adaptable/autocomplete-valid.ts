import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, isComputedHidden } from "../utils/aria";

const VALID_AUTOCOMPLETE = new Set([
  "off",
  "on",
  "name",
  "honorific-prefix",
  "given-name",
  "additional-name",
  "family-name",
  "honorific-suffix",
  "nickname",
  "email",
  "username",
  "new-password",
  "current-password",
  "one-time-code",
  "organization-title",
  "organization",
  "street-address",
  "address-line1",
  "address-line2",
  "address-line3",
  "address-level4",
  "address-level3",
  "address-level2",
  "address-level1",
  "country",
  "country-name",
  "postal-code",
  "cc-name",
  "cc-given-name",
  "cc-additional-name",
  "cc-family-name",
  "cc-number",
  "cc-exp",
  "cc-exp-month",
  "cc-exp-year",
  "cc-csc",
  "cc-type",
  "transaction-currency",
  "transaction-amount",
  "language",
  "bday",
  "bday-day",
  "bday-month",
  "bday-year",
  "sex",
  "tel",
  "tel-country-code",
  "tel-national",
  "tel-area-code",
  "tel-local",
  "tel-extension",
  "impp",
  "url",
  "photo",
]);

// Contact-related fields that can be preceded by a contact type modifier
const CONTACT_FIELDS = new Set([
  "tel",
  "tel-country-code",
  "tel-national",
  "tel-area-code",
  "tel-local",
  "tel-extension",
  "email",
  "impp",
]);

const CONTACT_TYPES = new Set(["home", "work", "mobile", "fax", "pager"]);
const HINT_MODES = new Set(["shipping", "billing"]);

// WebAuthn credential type hint (allowed after the field name)
const CREDENTIAL_HINTS = new Set(["webauthn"]);

/**
 * Validate the autocomplete token structure per the HTML spec:
 * [section-*] [shipping|billing] [home|work|mobile|fax|pager] field-name [webauthn]
 */
function isValidAutocomplete(value: string): boolean {
  const tokens = value.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true; // empty is skipped

  let i = 0;

  // Optional section-* token
  if (tokens[i].startsWith("section-")) i++;

  // Optional hint mode (shipping/billing)
  if (i < tokens.length && HINT_MODES.has(tokens[i])) i++;

  // Optional contact type
  let hasContactType = false;
  if (i < tokens.length && CONTACT_TYPES.has(tokens[i])) {
    hasContactType = true;
    i++;
  }

  // Required: exactly one field name
  if (i >= tokens.length) return false;
  const fieldToken = tokens[i];
  if (!VALID_AUTOCOMPLETE.has(fieldToken)) return false;

  // If a contact type was used, the field must be contact-related
  if (hasContactType && !CONTACT_FIELDS.has(fieldToken)) return false;

  i++;

  // Optional credential hint (e.g. "webauthn") after field name
  if (i < tokens.length && CREDENTIAL_HINTS.has(tokens[i])) i++;

  // Must have consumed all tokens
  return i === tokens.length;
}

export const autocompleteValid: Rule = {
  id: "adaptable/autocomplete-valid",
  category: "adaptable",
  actRuleIds: ["73f2c2"],
  wcag: ["1.3.5"],
  level: "AA",
  fixability: "contextual",
  description: "Autocomplete attribute must use valid values from the HTML specification.",
  guidance:
    "The autocomplete attribute helps users fill forms by identifying input purposes. Use standard values like 'name', 'email', 'tel', 'street-address', 'postal-code', 'cc-number'. This benefits users with cognitive disabilities, motor impairments, and anyone using password managers or autofill. Check the HTML specification for the complete list of valid tokens.",
  run(doc) {
    const violations = [];
    for (const el of doc.querySelectorAll("[autocomplete]")) {
      // Skip hidden, disabled, and aria-disabled elements
      if (isAriaHidden(el)) continue;
      if (isComputedHidden(el)) continue;
      if ((el as HTMLInputElement).disabled) continue;
      if (el.getAttribute("aria-disabled") === "true") continue;

      const value = el.getAttribute("autocomplete")!.trim();
      if (!value) continue;

      if (!isValidAutocomplete(value)) {
        violations.push({
          ruleId: "adaptable/autocomplete-valid",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "serious" as const,
          message: `Invalid autocomplete value "${value}".`,
        });
      }
    }
    return violations;
  },
};
