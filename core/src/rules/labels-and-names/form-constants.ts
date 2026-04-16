import { getAccessibleTextContent } from "../utils/aria";

/** Selector for native labelable form elements, excluding button-type inputs and hidden inputs. */
export const NATIVE_LABELABLE_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), textarea, select';

/**
 * Find the <label> element associated with a labelable element,
 * either via `label[for=id]` or a wrapping `<label>`.
 */
export function findAssociatedLabel(el: Element): HTMLLabelElement | null {
  if (el.id) {
    const label = el.ownerDocument.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label) return label as HTMLLabelElement;
  }
  const parentLabel = el.closest("label");
  return parentLabel as HTMLLabelElement | null;
}

/**
 * Find the accessible text of the <label> associated with a labelable element.
 * Returns empty string if no label is found or label text is empty.
 */
export function getAssociatedLabelText(el: Element): string {
  if (el.id) {
    const label = el.ownerDocument.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label) {
      const text = getAccessibleTextContent(label).trim();
      if (text) return text;
    }
  }
  const parentLabel = el.closest("label");
  if (parentLabel) {
    const text = getAccessibleTextContent(parentLabel).trim();
    if (text) return text;
  }
  return "";
}
