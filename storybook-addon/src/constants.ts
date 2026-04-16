export const ADDON_ID = "accesslint/a11y";
export const PARAM_KEY = "accesslint";
export const STATUS_TYPE_ID = "accesslint/a11y";
export const RESULT_EVENT = `${ADDON_ID}/result`;

// Storybook highlight addon events (storybook/highlight is only available on
// the preview side, so we derive the event names the same way Storybook does).
const HIGHLIGHT_ADDON_ID = "storybook/highlight";
export const HIGHLIGHT = `${HIGHLIGHT_ADDON_ID}/add`;
export const REMOVE_HIGHLIGHT = `${HIGHLIGHT_ADDON_ID}/remove`;
