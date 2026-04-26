import type { LocaleMap } from "./types";

export const en: LocaleMap = {
  "navigable/document-title": {
    description:
      "Documents must have a <title> element to provide users with an overview of content.",
    guidance:
      "Screen reader users rely on page titles to identify and navigate between tabs/windows. Add a descriptive <title> element in <head> that summarizes the page purpose. Keep titles unique across the site, placing specific content before the site name (e.g., 'Contact Us - Acme Corp').",
    messages: {
      "Document <title> element is empty.": "Document <title> element is empty.",
      "Document is missing a <title> element.": "Document is missing a <title> element.",
    },
  },
  "navigable/bypass": {
    description: "Page must have a mechanism to bypass repeated blocks of content.",
    guidance:
      'Keyboard users must be able to skip repetitive content like navigation. Provide a skip link at the top of the page that links to the main content (e.g., <a href="#main">Skip to main content</a>), or use a <main> landmark. Screen readers can jump directly to landmarks, so a properly marked-up <main> element satisfies this requirement.',
    messages: {
      "Page has no mechanism to bypass repeated content. Add a <main> landmark or skip link.":
        "Page has no mechanism to bypass repeated content. Add a <main> landmark or skip link.",
    },
  },
  "navigable/page-has-heading-one": {
    description: "Page should contain a level-one heading.",
    guidance:
      "A level-one heading (<h1> or role='heading' with aria-level='1') helps users understand the page topic and provides a landmark for screen reader navigation. Each page should have at least one level-one heading that describes the main content, typically matching or similar to the page title.",
    messages: {
      "Page does not contain a level-one heading.": "Page does not contain a level-one heading.",
    },
  },
  "labels-and-names/frame-title": {
    description: "Frames must have an accessible name.",
    guidance:
      "Screen readers announce frame titles when users navigate frames. Add a title attribute to <iframe> and <frame> elements that describes the frame's purpose (e.g., <iframe title='Video player'>). Avoid generic titles like 'frame' or 'iframe'. If the frame is decorative, use aria-hidden='true'.",
    messages: {
      "Frame is missing an accessible name. Add a title attribute.":
        "Frame is missing an accessible name. Add a title attribute.",
    },
  },
  "labels-and-names/frame-focusable-content": {
    description: "Iframes with interactive content must not be excluded from the tab order.",
    guidance:
      'An <iframe> with tabindex="-1" removes the frame itself from the tab order, but focusable elements inside remain reachable with arrow keys on some browsers and are unreachable on others. Remove tabindex="-1" from the iframe, or add tabindex="-1" to every focusable element inside it. If the frame is decorative, add aria-hidden="true" instead.',
    messages: {
      'iframe has tabindex="-1" but contains focusable content, making it unreachable by keyboard.':
        'iframe has tabindex="-1" but contains focusable content, making it unreachable by keyboard.',
    },
  },
  "labels-and-names/frame-title-unique": {
    description: "Frame titles should be unique.",
    guidance:
      "When multiple frames have identical titles, screen reader users cannot distinguish between them. Give each frame a unique, descriptive title that explains its specific purpose or content.",
    messages: {
      "Frame title is not unique. Use a distinct title for each frame.":
        "Frame title is not unique. Use a distinct title for each frame.",
    },
  },
  "distinguishable/meta-viewport": {
    description: "Viewport meta tag must not disable user scaling.",
    guidance:
      "Users with low vision need to zoom content up to 200% or more. Setting user-scalable=no or maximum-scale=1 prevents zooming and fails WCAG. Remove these restrictions. If your layout breaks at high zoom, fix the responsive design rather than preventing zoom.",
    messages: {
      "Viewport disables user scaling (user-scalable={0}). Remove this restriction.":
        "Viewport disables user scaling (user-scalable={0}). Remove this restriction.",
      "Viewport maximum-scale={0} restricts zooming. Set to at least 2 or remove.":
        "Viewport maximum-scale={0} restricts zooming. Set to at least 2 or remove.",
    },
  },
  "enough-time/meta-refresh": {
    description: "Meta refresh must not redirect or refresh automatically.",
    guidance:
      "Automatic page refreshes or redirects can disorient users, especially those using screen readers or with cognitive disabilities. They may lose their place or not have time to read content. If a redirect is needed, use a server-side redirect (HTTP 301/302) instead. For timed refreshes, provide user controls.",
    messages: {
      "Page redirects after {0} seconds without warning. Use server-side redirect.":
        "Page redirects after {0} seconds without warning. Use server-side redirect.",
      "Page auto-refreshes after {0} seconds. Provide user control over refresh.":
        "Page auto-refreshes after {0} seconds. Provide user control over refresh.",
    },
  },
  "enough-time/blink": {
    description: "The <blink> element must not be used.",
    guidance:
      "Blinking content can cause seizures in users with photosensitive epilepsy and is distracting for users with attention disorders. The <blink> element is deprecated and should never be used. If you need to draw attention to content, use less intrusive methods like color, borders, or icons.",
    messages: {
      "The <blink> element causes accessibility issues. Remove it entirely.":
        "The <blink> element causes accessibility issues. Remove it entirely.",
    },
  },
  "enough-time/marquee": {
    description: "The <marquee> element must not be used.",
    guidance:
      "Scrolling or moving content is difficult for many users to read, especially those with cognitive or visual disabilities. The <marquee> element is deprecated. Replace scrolling text with static content. If content must scroll, provide pause/stop controls and ensure it stops after 5 seconds.",
    messages: {
      "The <marquee> element causes accessibility issues. Replace with static content.":
        "The <marquee> element causes accessibility issues. Replace with static content.",
    },
  },
  "text-alternatives/img-alt": {
    description:
      "Images must have alternate text. Add an alt attribute to <img> elements. Decorative images may use an empty alt attribute (alt=\"\"), role='none', or role='presentation'.",
    guidance:
      "Every image needs an alt attribute. For informative images, describe the content or function concisely. For decorative images (backgrounds, spacers, purely visual flourishes), use alt='' to hide them from screen readers. Never omit alt entirely—screen readers may read the filename instead. When an image is inside a link or button that already has text, use alt='' if the image is decorative in that context, or write alt text that complements (not duplicates) the existing text.",
    messages: {
      'Image has whitespace-only alt text. Use alt="" for decorative images or provide descriptive text.':
        'Image has whitespace-only alt text. Use alt="" for decorative images or provide descriptive text.',
      "Image element missing alt attribute.": "Image element missing alt attribute.",
      'Element with role="img" has no accessible name. Add aria-label or aria-labelledby.':
        'Element with role="img" has no accessible name. Add aria-label or aria-labelledby.',
    },
  },
  "text-alternatives/svg-img-alt": {
    description:
      "SVG elements with an img, graphics-document, or graphics-symbol role must have an accessible name via a <title> element, aria-label, or aria-labelledby.",
    guidance:
      "Inline SVGs with role='img' need accessible names. Add a <title> element as the first child of the SVG (screen readers will announce it), or use aria-label on the SVG element. For complex SVGs, use aria-labelledby referencing both a <title> and <desc> element. Decorative SVGs should use aria-hidden='true' instead.",
    messages: {
      "{0} with role='{1}' has no accessible name.": "{0} with role='{1}' has no accessible name.",
    },
  },
  "text-alternatives/input-image-alt": {
    description:
      'Image inputs (<input type="image">) must have alternate text describing the button action.',
    guidance:
      "Image buttons (<input type='image'>) act as submit buttons with a custom image. Add alt text via alt, aria-label, or aria-labelledby that describes the action (e.g. alt='Search' or alt='Submit order'), not the image itself. Without it, screen readers announce only 'image' or the filename, giving no clue what the button does.",
    messages: { "Image input missing alt text.": "Image input missing alt text." },
  },
  "text-alternatives/image-redundant-alt": {
    description:
      "Image alt text should not duplicate adjacent link or button text. When alt text repeats surrounding text, screen reader users hear the same information twice.",
    guidance:
      "When an image is inside a link or button that also has text, make the alt text complementary rather than identical. If the image is purely decorative in that context, use alt='' to avoid repetition.",
    messages: {
      'Alt text "{0}" duplicates surrounding {1} text.':
        'Alt text "{0}" duplicates surrounding {1} text.',
    },
  },
  "text-alternatives/image-alt-words": {
    description:
      "Image alt text should not start with words like 'image of', 'photo of', or 'picture of' — screen readers already announce the element type.",
    guidance:
      "Screen readers already announce 'image' or 'graphic' before reading alt text, so phrases like 'image of', 'photo of', or 'picture of' are redundant. Remove these words and describe what the image shows. For example, change 'image of a dog' to 'golden retriever playing fetch'.",
    messages: {
      'Alt text "{0}" contains redundant word(s): {1}.':
        'Alt text "{0}" contains redundant word(s): {1}.',
    },
  },
  "text-alternatives/area-alt": {
    description: "Image map <area> elements must have alternative text.",
    guidance:
      "Each clickable region in an image map needs alternative text so screen reader users know what the region represents. Add an alt attribute to every <area> element describing its purpose. For complex image maps, consider using alternative approaches like SVG with embedded links, or a list of text links.",
    messages: {
      "Image map <area> element is missing alternative text.":
        "Image map <area> element is missing alternative text.",
    },
  },
  "text-alternatives/object-alt": {
    description: "<object> elements must have alternative text.",
    guidance:
      "Object elements embed external content that may not be accessible to all users. Provide alternative text via aria-label, aria-labelledby, or a title attribute. The fallback content inside <object> is only shown when the object fails to load and does not serve as an accessible name.",
    messages: {
      "<object> element is missing alternative text. Add aria-label, aria-labelledby, or a title attribute.":
        "<object> element is missing alternative text. Add aria-label, aria-labelledby, or a title attribute.",
    },
  },
  "text-alternatives/role-img-alt": {
    description: "Elements with role='img' must have an accessible name.",
    guidance:
      "When you assign role='img' to an element (like a div containing icon fonts or CSS backgrounds), you must provide an accessible name via aria-label or aria-labelledby. Without this, screen reader users have no way to understand what the image represents. If the image is decorative, use role='presentation' or role='none' instead.",
    messages: {
      "Element with role='img' has no accessible name. Add aria-label or aria-labelledby.":
        "Element with role='img' has no accessible name. Add aria-label or aria-labelledby.",
    },
  },
  "keyboard-accessible/server-image-map": {
    description: "Server-side image maps must not be used.",
    guidance:
      "Server-side image maps (using ismap attribute) send click coordinates to the server, which is inaccessible to keyboard users and screen readers who can't precisely click specific regions. Replace with client-side image maps (<map> with <area> elements) that provide keyboard access and accessible names, or use linked images/buttons instead.",
    messages: {
      "Server-side image map detected. Use client-side image map with <map> and <area> elements instead.":
        "Server-side image map detected. Use client-side image map with <map> and <area> elements instead.",
    },
  },
  "labels-and-names/form-label": {
    description: "Form elements must have labels. Use <label>, aria-label, or aria-labelledby.",
    guidance:
      "Every form input needs an accessible label so users understand what information to enter. Use a <label> element with a for attribute matching the input's id, wrap the input in a <label>, or use aria-label/aria-labelledby for custom components. Placeholders are not sufficient as labels since they disappear when typing. Labels should describe the information requested, not the field type (e.g., 'Email address', 'Search', 'Phone number').",
    messages: { "Form element has no accessible label.": "Form element has no accessible label." },
  },
  "labels-and-names/multiple-labels": {
    description: "Form fields should not have multiple label elements.",
    guidance:
      "When a form field has multiple <label> elements pointing to it, assistive technologies may announce only one label or behave inconsistently. Use a single <label> and combine any additional text into it, or use aria-describedby for supplementary information.",
    messages: {
      "Form field has {0} labels. Use a single label element.":
        "Form field has {0} labels. Use a single label element.",
    },
  },
  "labels-and-names/input-button-name": {
    description:
      "Input buttons must have discernible text via value, aria-label, or aria-labelledby.",
    guidance:
      "Input buttons (<input type='submit'>, type='button', type='reset'>) need accessible names so users know what action the button performs. Add a value attribute with descriptive text (e.g., value='Submit Form'), or use aria-label if the value must differ from the accessible name.",
    messages: { "Input button has no discernible text.": "Input button has no discernible text." },
  },
  "adaptable/autocomplete-valid": {
    description: "Autocomplete attribute must use valid values from the HTML specification.",
    guidance:
      "The autocomplete attribute helps users fill forms by identifying input purposes. Use standard values like 'name', 'email', 'tel', 'street-address', 'postal-code', 'cc-number'. This benefits users with cognitive disabilities, motor impairments, and anyone using password managers or autofill. Check the HTML specification for the complete list of valid tokens.",
    messages: { 'Invalid autocomplete value "{0}".': 'Invalid autocomplete value "{0}".' },
  },
  "labels-and-names/label-content-mismatch": {
    description:
      "Interactive elements with visible text must have accessible names that contain that text.",
    guidance:
      "For voice control users who activate controls by speaking their visible label, the accessible name must include the visible text. If aria-label is 'Submit form' but the button shows 'Send', voice users saying 'click Send' won't activate it. Ensure aria-label/aria-labelledby contains or matches the visible text.",
    messages: {
      'Accessible name "{0}" does not contain visible text "{1}".':
        'Accessible name "{0}" does not contain visible text "{1}".',
    },
  },
  "labels-and-names/label-title-only": {
    description: "Form elements should not use title attribute as the only accessible name.",
    guidance:
      "The title attribute is unreliable as a label because it only appears on hover/focus (not visible to touch users) and is often ignored by assistive technologies. Use a visible <label> element, aria-label, or aria-labelledby instead. Title can supplement a label but should not replace it.",
    messages: {
      "Form element uses title attribute as only label. Use <label>, aria-label, or aria-labelledby instead.":
        "Form element uses title attribute as only label. Use <label>, aria-label, or aria-labelledby instead.",
    },
  },
  "labels-and-names/label-placeholder-only": {
    description: "Form elements should not use placeholder attribute as the only accessible name.",
    guidance:
      "The placeholder attribute disappears as soon as the user begins typing, making it unreliable as a label. Users may forget the field's purpose mid-entry, and placeholders are often rendered with low contrast. Use a visible <label> element, aria-label, or aria-labelledby instead. Placeholder can supplement a label but should not replace it.",
    messages: {
      "Form element uses placeholder as only label. Use <label>, aria-label, or aria-labelledby instead.":
        "Form element uses placeholder as only label. Use <label>, aria-label, or aria-labelledby instead.",
    },
  },
  "keyboard-accessible/tabindex": {
    description:
      "Elements should not have tabindex greater than 0, which disrupts natural tab order.",
    guidance:
      "Positive tabindex values force elements to the front of the tab order regardless of DOM position, creating unpredictable navigation for keyboard users. Use tabindex='0' to add elements to the natural tab order, or tabindex='-1' to make elements programmatically focusable but not in tab order. Rely on DOM order for tab sequence.",
    messages: {
      'Element has tabindex="{0}" which disrupts tab order.':
        'Element has tabindex="{0}" which disrupts tab order.',
    },
  },
  "keyboard-accessible/focus-order": {
    description:
      "Non-interactive elements with tabindex='0' must have an interactive ARIA role so assistive technologies can convey their purpose.",
    guidance:
      "When adding tabindex='0' to non-interactive elements like <div> or <span>, screen readers announce them generically. Add an appropriate role (button, link, tab, etc.) so users understand the element's purpose. Also add keyboard event handlers (Enter/Space for buttons, Enter for links). Consider using native interactive elements instead.",
    messages: {
      'Non-interactive <{0}> with tabindex="0" has no interactive role.':
        'Non-interactive <{0}> with tabindex="0" has no interactive role.',
    },
  },
  "keyboard-accessible/nested-interactive": {
    description: "Interactive controls must not be nested inside each other.",
    guidance:
      "Nesting interactive elements (like a button inside a link, or a link inside a button) creates unpredictable behavior and confuses assistive technologies. The browser may remove the inner element from the accessibility tree. Restructure the HTML so interactive elements are siblings, not nested. If you need a clickable card, use CSS and JavaScript rather than nesting.",
    messages: {
      "Interactive element <{0}> is nested inside <{1}>.":
        "Interactive element <{0}> is nested inside <{1}>.",
    },
  },
  "keyboard-accessible/scrollable-region": {
    description: "Scrollable regions must be keyboard accessible.",
    guidance:
      "Content that scrolls must be accessible to keyboard users. If a region has overflow:scroll or overflow:auto and contains scrollable content, it needs either tabindex='0' to be focusable, or it must contain focusable elements. Without this, keyboard users cannot scroll the content.",
    messages: {
      "Scrollable region is not keyboard accessible. Add tabindex='0' or include focusable elements.":
        "Scrollable region is not keyboard accessible. Add tabindex='0' or include focusable elements.",
    },
  },
  "keyboard-accessible/accesskeys": {
    description: "Accesskey attribute values must be unique.",
    guidance:
      "When multiple elements share the same accesskey, browser behavior becomes unpredictable - usually only the first element is activated. Ensure each accesskey value is unique within the page. Also consider that accesskeys can conflict with browser and screen reader shortcuts, so use them sparingly.",
    messages: {
      'Duplicate accesskey "{0}". Each accesskey must be unique.':
        'Duplicate accesskey "{0}". Each accesskey must be unique.',
    },
  },
  "navigable/heading-order": {
    description:
      "Heading levels should increase by one; skipping levels (e.g. h2 to h4) makes navigation harder.",
    guidance:
      "Screen reader users navigate by headings to understand page structure. Skipping levels (h2 to h4) suggests missing content and creates confusion. Start with h1 for the page title, then use h2 for main sections, h3 for subsections, etc. You can go back up (h3 to h2) when starting a new section.",
    messages: {
      "Heading level {0} skipped from level {1}. Use h{2} instead.":
        "Heading level {0} skipped from level {1}. Use h{2} instead.",
    },
  },
  "navigable/empty-heading": {
    description: "Headings must have discernible text.",
    guidance:
      "Screen reader users navigate pages by headings, so empty headings create confusing navigation points. Ensure all headings contain visible text or accessible names. If a heading is used purely for visual styling, use CSS instead of heading elements.",
    messages: {
      "Heading is empty. Add text content or remove the heading element.":
        "Heading is empty. Add text content or remove the heading element.",
    },
  },
  "navigable/p-as-heading": {
    description: "Paragraphs should not be styled to look like headings.",
    guidance:
      "When paragraphs are styled with bold, large fonts to look like headings, screen reader users miss the semantic structure. Use proper heading elements (h1-h6) instead of styled paragraphs. If you need specific styling, apply CSS to the heading elements while maintaining proper heading hierarchy.",
    messages: {
      "Paragraph appears to be styled as a heading. Use an h1-h6 element instead.":
        "Paragraph appears to be styled as a heading. Use an h1-h6 element instead.",
    },
  },
  "landmarks/landmark-main": {
    description: "Page should have exactly one main landmark.",
    guidance:
      "The main landmark contains the primary content of the page. Screen readers allow users to jump directly to main content. Use a single <main> element (or role='main') to wrap the central content, excluding headers, footers, and navigation.",
    messages: {
      "Page has no main landmark.": "Page has no main landmark.",
      "Page has multiple main landmarks.": "Page has multiple main landmarks.",
    },
  },
  "landmarks/no-duplicate-banner": {
    description: "Page should not have more than one banner landmark.",
    guidance:
      "The banner landmark (typically <header>) identifies site-oriented content like logos and search. Only one top-level banner is allowed per page. If you need multiple headers, nest them inside sectioning elements (article, section, aside) where they become scoped headers rather than page-level banners.",
    messages: { "Page has multiple banner landmarks.": "Page has multiple banner landmarks." },
  },
  "landmarks/no-duplicate-contentinfo": {
    description: "Page should not have more than one contentinfo landmark.",
    guidance:
      "The contentinfo landmark (typically <footer>) contains information about the page like copyright and contact info. Only one top-level contentinfo is allowed per page. Nest additional footers inside sectioning elements to scope them.",
    messages: {
      "Page has multiple contentinfo landmarks.": "Page has multiple contentinfo landmarks.",
    },
  },
  "landmarks/no-duplicate-main": {
    description: "Page should not have more than one main landmark.",
    guidance:
      "Only one main landmark should exist per page. The main landmark identifies the primary content area. If you have multiple content sections, use <section> with appropriate headings instead of multiple main elements.",
    messages: { "Page has multiple main landmarks.": "Page has multiple main landmarks." },
  },
  "landmarks/banner-is-top-level": {
    description: "Banner landmark should not be nested within another landmark.",
    guidance:
      "The banner landmark should be a top-level landmark, not nested inside article, aside, main, nav, or section. If a header is inside these elements, it automatically becomes a generic header rather than a banner. Remove explicit role='banner' from nested headers or restructure the page.",
    messages: {
      "Banner landmark is nested within another landmark.":
        "Banner landmark is nested within another landmark.",
    },
  },
  "landmarks/contentinfo-is-top-level": {
    description: "Contentinfo landmark should not be nested within another landmark.",
    guidance:
      "The contentinfo landmark should be a top-level landmark. A footer inside article, aside, main, nav, or section becomes a scoped footer, not a contentinfo landmark. Remove explicit role='contentinfo' from nested footers or move the footer outside sectioning elements.",
    messages: {
      "Contentinfo landmark is nested within another landmark.":
        "Contentinfo landmark is nested within another landmark.",
    },
  },
  "landmarks/main-is-top-level": {
    description: "Main landmark should not be nested within another landmark.",
    guidance:
      "Screen readers provide a shortcut to jump directly to the main landmark. When <main> is nested inside another landmark (article, aside, nav, or section), some screen readers may not list it as a top-level landmark, making it harder to find. Move <main> outside any sectioning elements so it sits at the top level of the document.",
    messages: {
      "Main landmark is nested within another landmark.":
        "Main landmark is nested within another landmark.",
    },
  },
  "landmarks/complementary-is-top-level": {
    description: "Aside (complementary) landmark should be top-level or directly inside main.",
    guidance:
      "The complementary landmark (aside) should be top-level or a direct child of main. Nesting aside deep within other landmarks reduces its discoverability for screen reader users navigating by landmarks.",
    messages: {
      "Complementary landmark should be top-level.": "Complementary landmark should be top-level.",
    },
  },
  "landmarks/landmark-unique": {
    description: "Landmarks should have unique labels when there are multiple of the same type.",
    guidance:
      "When a page has multiple landmarks of the same type (e.g., multiple nav elements), each should have a unique accessible name via aria-label or aria-labelledby. This helps screen reader users distinguish between them (e.g., 'Main navigation' vs 'Footer navigation').",
    messages: {
      'Multiple {0} landmarks have the same label "{1}".':
        'Multiple {0} landmarks have the same label "{1}".',
      "Multiple {0} landmarks have no label. Add unique aria-label attributes.":
        "Multiple {0} landmarks have no label. Add unique aria-label attributes.",
    },
  },
  "landmarks/region": {
    description: "All page content should be contained within landmarks.",
    guidance:
      "Screen reader users navigate pages by landmarks. Content outside landmarks is harder to find and understand. Wrap all visible content in appropriate landmarks: <header>, <nav>, <main>, <aside>, <footer>, or <section> with a label. Skip links may exist outside landmarks.",
    messages: {
      "Content is not contained within a landmark region.":
        "Content is not contained within a landmark region.",
    },
  },
  "adaptable/list-children": {
    description:
      "<ul> and <ol> must only contain <li>, <script>, <template>, or <style> as direct children.",
    guidance:
      "Screen readers announce list structure ('list with 5 items') based on proper markup. Placing non-<li> elements directly inside <ul> or <ol> breaks this structure. Wrap content in <li> elements, or if you need wrapper divs for styling, apply styles to <li> elements directly and remove the wrapper (e.g., change <ul><div>item</div></ul> to <ul><li>item</li></ul>).",
    messages: { "List contains non-<li> child <{0}>.": "List contains non-<li> child <{0}>." },
  },
  "adaptable/listitem-parent": {
    description: "<li> elements must be contained in a <ul>, <ol>, or <menu>.",
    guidance:
      "List items (<li>) only have semantic meaning inside a list container (<ul>, <ol>, or <menu>). Without a list parent, screen readers will not announce 'list with N items' or allow users to skip between items using list navigation shortcuts. Wrap <li> elements in the appropriate list container — <ul> for unordered lists, <ol> for ordered/numbered lists.",
    messages: {
      "<li> is not contained in a <ul>, <ol>, or <menu>.":
        "<li> is not contained in a <ul>, <ol>, or <menu>.",
    },
  },
  "adaptable/dl-children": {
    description: "<dt> and <dd> elements must be contained in a <dl>.",
    guidance:
      "Definition terms (<dt>) and definitions (<dd>) only have semantic meaning inside a definition list (<dl>). Outside of <dl>, they're treated as generic text. Wrap related <dt> and <dd> pairs in a <dl> element to convey the term/definition relationship to assistive technologies.",
    messages: { "<{0}> is not contained in a <dl>.": "<{0}> is not contained in a <dl>." },
  },
  "adaptable/definition-list": {
    description:
      "<dl> elements must only contain <dt>, <dd>, <div>, <script>, <template>, or <style>.",
    guidance:
      "Definition lists have strict content requirements. Only <dt> (terms), <dd> (definitions), and <div> (for grouping dt/dd pairs) are valid children. Other elements break the list structure for screen readers. Move invalid elements outside the <dl>, or if they represent a term change to <dt>, if a definition change to <dd>. Styling wrappers should be replaced with <div> elements containing <dt>/<dd> pairs.",
    messages: { "<dl> contains invalid child <{0}>.": "<dl> contains invalid child <{0}>." },
  },
  "aria/aria-roles": {
    description: "ARIA role values must be valid.",
    guidance:
      "Invalid role values are ignored by assistive technologies, meaning the element will not have the intended semantics. Check the spelling and use only roles defined in the WAI-ARIA specification. Common roles include: button, link, navigation, main, dialog, alert, tab, tabpanel, menu, menuitem.",
    messages: { 'Invalid ARIA role "{0}".': 'Invalid ARIA role "{0}".' },
  },
  "aria/aria-valid-attr": {
    description: "ARIA attributes must be valid (correctly spelled).",
    guidance:
      "Misspelled ARIA attributes are ignored by assistive technologies. Check the spelling against the WAI-ARIA specification. Common mistakes: aria-labeledby (should be aria-labelledby), aria-role (should be role), aria-description (valid in ARIA 1.3+).",
    messages: { 'Invalid ARIA attribute "{0}".': 'Invalid ARIA attribute "{0}".' },
  },
  "aria/aria-valid-attr-value": {
    description: "ARIA attributes must have valid values.",
    guidance:
      "Each ARIA attribute accepts specific value types. Boolean attributes (aria-hidden, aria-disabled) accept only 'true' or 'false'. Tristate attributes (aria-checked, aria-pressed) also accept 'mixed'. Token attributes (aria-live, aria-autocomplete) accept predefined values. ID reference attributes (aria-labelledby, aria-describedby) must reference existing element IDs.",
    messages: {
      '{0} must be "true" or "false", got "{1}".': '{0} must be "true" or "false", got "{1}".',
      '{0} must be "true", "false", or "mixed", got "{1}".':
        '{0} must be "true", "false", or "mixed", got "{1}".',
      '{0} must be an integer, got "{1}".': '{0} must be an integer, got "{1}".',
      '{0} must be a number, got "{1}".': '{0} must be a number, got "{1}".',
      'Invalid value "{0}" for {1}.': 'Invalid value "{0}" for {1}.',
    },
  },
  "aria/aria-required-attr": {
    description: "Elements with ARIA roles must have all required ARIA attributes.",
    guidance:
      "Some ARIA roles require specific attributes to function correctly. For example, checkbox requires aria-checked, slider requires aria-valuenow, heading requires aria-level. Without these attributes, assistive technologies cannot convey the element's state or value to users. Add the missing required attribute with an appropriate value.",
    messages: { 'Role "{0}" requires attribute "{1}".': 'Role "{0}" requires attribute "{1}".' },
  },
  "aria/aria-allowed-attr": {
    description: "ARIA attributes must be allowed for the element's role.",
    guidance:
      "Each ARIA role supports specific attributes. Using unsupported attributes creates confusion for assistive technologies. Check the ARIA specification for which attributes are valid for each role, or remove the attribute if it's not needed.",
    messages: {
      'ARIA attribute "{0}" is not allowed on role "{1}".':
        'ARIA attribute "{0}" is not allowed on role "{1}".',
    },
  },
  "aria/aria-allowed-role": {
    description: "ARIA role must be appropriate for the element.",
    guidance:
      "Not all ARIA roles can be applied to all HTML elements. Many elements have implicit roles (e.g., <header> is implicitly banner, <nav> is navigation, <main> is main). Adding an explicit role that matches the implicit role is redundant. Adding a conflicting role breaks semantics. Either remove the role attribute or use a different element.",
    messages: {
      "Element <{0}> should not have an explicit role.":
        "Element <{0}> should not have an explicit role.",
      'Role "{0}" is not allowed on element <{1}>.': 'Role "{0}" is not allowed on element <{1}>.',
    },
  },
  "adaptable/aria-required-children": {
    description: "Certain ARIA roles require specific child roles to be present.",
    guidance:
      "Some ARIA roles represent containers that must contain specific child roles for proper semantics. For example, a list must contain listitems, a menu must contain menuitems. Add the required child elements with appropriate roles, or use native HTML elements that provide these semantics implicitly (e.g., <ul> with <li>).",
    messages: {
      'Role "{0}" requires children with role: {1}.':
        'Role "{0}" requires children with role: {1}.',
    },
  },
  "adaptable/aria-required-parent": {
    description: "Certain ARIA roles must be contained within specific parent roles.",
    guidance:
      "Some ARIA roles represent items that must exist within specific container roles. For example, a listitem must be within a list, a tab must be within a tablist. Wrap the element in the appropriate parent, or use native HTML elements that provide this structure (e.g., <li> inside <ul>).",
    messages: {
      'Role "{0}" must be contained within: {1}.': 'Role "{0}" must be contained within: {1}.',
    },
  },
  "aria/aria-hidden-body": {
    description: "aria-hidden='true' must not be present on the document body.",
    guidance:
      "Setting aria-hidden='true' on the body element hides all page content from assistive technologies, making the page completely inaccessible to screen reader users. Remove aria-hidden from the body element. If you need to hide content temporarily (e.g., behind a modal), use aria-hidden on specific sections instead.",
    messages: {
      "aria-hidden='true' on body hides all content from assistive technologies.":
        "aria-hidden='true' on body hides all content from assistive technologies.",
    },
  },
  "aria/aria-hidden-focus": {
    description: "Elements with aria-hidden='true' must not contain focusable elements.",
    guidance:
      "When aria-hidden='true' hides an element from assistive technologies but the element contains focusable children, keyboard users can focus those children but screen reader users won't know they exist. Either remove focusable elements from the hidden region, add tabindex='-1' to them, or remove aria-hidden.",
    messages: {
      "Focusable element is inside an aria-hidden region.":
        "Focusable element is inside an aria-hidden region.",
    },
  },
  "labels-and-names/aria-command-name": {
    description: "ARIA commands must have an accessible name.",
    guidance:
      "Interactive ARIA command roles (button, link, menuitem) must have accessible names so users know what action they perform. Add visible text content, aria-label, or aria-labelledby to provide a name.",
    messages: { "ARIA command has no accessible name.": "ARIA command has no accessible name." },
  },
  "labels-and-names/aria-input-field-name": {
    description: "ARIA input fields must have an accessible name.",
    guidance:
      "ARIA input widgets (combobox, listbox, searchbox, slider, spinbutton, textbox) must have accessible names so users understand what data to enter. Add a visible label with aria-labelledby, or use aria-label if a visible label is not possible.",
    messages: {
      "ARIA input field has no accessible name.": "ARIA input field has no accessible name.",
    },
  },
  "labels-and-names/aria-toggle-field-name": {
    description: "ARIA toggle fields must have an accessible name.",
    guidance:
      "ARIA toggle controls (checkbox, switch, radio, menuitemcheckbox, menuitemradio) must have accessible names so users understand what option they're selecting. Add visible text content, aria-label, or use aria-labelledby to reference a visible label.",
    messages: {
      "ARIA toggle field has no accessible name.": "ARIA toggle field has no accessible name.",
    },
  },
  "labels-and-names/aria-meter-name": {
    description: "ARIA meter elements must have an accessible name.",
    guidance:
      "Meter elements display a value within a known range (like disk usage or password strength). They must have accessible names so screen reader users understand what is being measured. Use aria-label or aria-labelledby to provide context.",
    messages: { "Meter has no accessible name.": "Meter has no accessible name." },
  },
  "labels-and-names/aria-progressbar-name": {
    description: "ARIA progressbar elements must have an accessible name.",
    guidance:
      "Progress indicators must have accessible names so screen reader users understand what process is being tracked. Use aria-label (e.g., 'File upload progress') or aria-labelledby to reference a visible heading or label.",
    messages: { "Progressbar has no accessible name.": "Progressbar has no accessible name." },
  },
  "labels-and-names/aria-dialog-name": {
    description: "ARIA dialogs must have an accessible name.",
    guidance:
      "Dialog and alertdialog elements must have accessible names so screen reader users understand the dialog's purpose when it opens. Use aria-label or aria-labelledby pointing to the dialog's heading. Native <dialog> elements should also have an accessible name.",
    messages: { "Dialog has no accessible name.": "Dialog has no accessible name." },
  },
  "labels-and-names/aria-tooltip-name": {
    description: "ARIA tooltips must have an accessible name.",
    guidance:
      "Tooltip elements must have accessible names (usually their text content). The tooltip content itself typically serves as the accessible name. Ensure the tooltip contains descriptive text content or has aria-label.",
    messages: { "Tooltip has no accessible name.": "Tooltip has no accessible name." },
  },
  "labels-and-names/aria-treeitem-name": {
    description: "ARIA treeitem elements must have an accessible name.",
    guidance:
      "Tree items must have accessible names so screen reader users can understand the tree structure and navigate it effectively. Provide text content, aria-label, or aria-labelledby for each treeitem.",
    messages: { "Treeitem has no accessible name.": "Treeitem has no accessible name." },
  },
  "aria/aria-prohibited-attr": {
    description: "ARIA attributes must not be prohibited for the element's role.",
    guidance:
      "Some ARIA roles prohibit certain attributes. For example, roles like 'none', 'presentation', 'generic', and text-level roles (code, emphasis, strong) prohibit aria-label and aria-labelledby because naming is not supported for these roles. Remove the prohibited attributes or change the role.",
    messages: {
      "aria-label and aria-labelledby are prohibited on <{0}> elements.":
        "aria-label and aria-labelledby are prohibited on <{0}> elements.",
      'aria-label and aria-labelledby are prohibited on role "{0}".':
        'aria-label and aria-labelledby are prohibited on role "{0}".',
      'Attribute "{0}" is prohibited on role "{1}".':
        'Attribute "{0}" is prohibited on role "{1}".',
    },
  },
  "aria/presentation-role-conflict": {
    description:
      "Elements with role='presentation' or role='none' must not be focusable or have global ARIA attributes.",
    guidance:
      "When an element has role='presentation' or role='none', it's marked as decorative and removed from the accessibility tree. However, if the element is focusable or has certain ARIA attributes, the presentation role is ignored and the element remains accessible. This creates confusion. Either remove the presentation role, or remove the focusability/ARIA attributes.",
    messages: {
      "Presentation role conflicts with: {0}. The role will be ignored.":
        "Presentation role conflicts with: {0}. The role will be ignored.",
      'Element with implicit presentation role (alt="") conflicts with: {0}. The decorative role will be ignored.':
        'Element with implicit presentation role (alt="") conflicts with: {0}. The decorative role will be ignored.',
    },
  },
  "labels-and-names/button-name": {
    description: "Buttons must have discernible text.",
    guidance:
      "Screen reader users need to know what a button does. Add visible text content, aria-label, or aria-labelledby. For icon buttons, use aria-label describing the action (e.g., aria-label='Close'). If the button contains an image, ensure the image has alt text describing the button's action.",
    messages: { "Button has no discernible text.": "Button has no discernible text." },
  },
  "labels-and-names/summary-name": {
    description: "<summary> elements must have an accessible name.",
    guidance:
      "The <summary> element provides the visible label for a <details> disclosure widget. It must have descriptive text content so screen reader users understand what will be revealed when expanded. Add clear, concise text that indicates what content is contained in the details section.",
    messages: {
      "<summary> element has no accessible name. Add descriptive text.":
        "<summary> element has no accessible name. Add descriptive text.",
    },
  },
  "navigable/link-name": {
    description: "Links must have discernible text via content, aria-label, or aria-labelledby.",
    guidance:
      "Screen reader users need to know where a link goes. Add descriptive text content, aria-label, or use aria-labelledby. For image links, ensure the image has alt text describing the link destination. Avoid generic text like 'click here' or 'read more'—link text should make sense out of context.",
    messages: { "Link has no discernible text.": "Link has no discernible text." },
  },
  "navigable/skip-link": {
    description: "Skip links must point to a valid target on the page.",
    guidance:
      "Skip links allow keyboard users to bypass repetitive navigation and jump directly to main content. The skip link should be the first focusable element on the page, link to the main content (e.g., href='#main'), and become visible when focused. It can be visually hidden until focused using CSS.",
    messages: {
      'Skip link points to "#{0}" which does not exist on the page.':
        'Skip link points to "#{0}" which does not exist on the page.',
    },
  },
  "distinguishable/link-in-text-block": {
    description: "Links within text blocks must be distinguishable by more than color alone.",
    guidance:
      "Users who cannot perceive color differences need other visual cues to identify links. Links in text should have underlines or other non-color indicators. If using color alone, ensure 3:1 contrast with surrounding text AND provide additional indication on focus/hover.",
    messages: {
      "Link in text block is not visually distinguishable from surrounding text. Add a non-color visual indicator such as an underline or border.":
        "Link in text block is not visually distinguishable from surrounding text. Add a non-color visual indicator such as an underline or border.",
    },
  },
  "readable/html-has-lang": {
    description: "The <html> element must have a lang attribute.",
    guidance:
      "Screen readers use the lang attribute to determine which language rules and pronunciation to use. Without it, content may be mispronounced. Set lang to the primary language of the page using a BCP 47 code (e.g., 'en' for English, 'es' for Spanish, 'fr' for French, 'de' for German, 'ja' for Japanese, 'zh' for Chinese, 'pt' for Portuguese, 'ar' for Arabic).",
    messages: {
      "<html> element missing lang attribute.": "<html> element missing lang attribute.",
    },
  },
  "readable/html-lang-valid": {
    description: "The lang attribute on <html> must have a valid value.",
    guidance:
      "The lang attribute must use a valid BCP 47 language tag. Use a 2 or 3 letter language code (e.g., 'en', 'fr', 'zh'), optionally followed by a region code (e.g., 'en-US', 'pt-BR'). Invalid tags prevent screen readers from correctly pronouncing content.",
    messages: { 'Invalid lang attribute value "{0}".': 'Invalid lang attribute value "{0}".' },
  },
  "readable/valid-lang": {
    description: "The lang attribute must have a valid value on all elements.",
    guidance:
      "When content in a different language appears within a page (e.g., a French quote in an English document), wrap it with a lang attribute to ensure correct pronunciation. The lang value must be a valid BCP 47 tag. Common codes: en, es, fr, de, zh, ja, pt, ar, ru.",
    messages: {
      "Empty lang attribute value.": "Empty lang attribute value.",
      'Invalid lang attribute value "{0}".': 'Invalid lang attribute value "{0}".',
    },
  },
  "readable/html-xml-lang-mismatch": {
    description: "The lang and xml:lang attributes on <html> must match.",
    guidance:
      "In XHTML documents, if both lang and xml:lang are present, they must specify the same base language. Mismatched values confuse assistive technologies. Either remove xml:lang (preferred for HTML5) or ensure both attributes have identical values.",
    messages: {
      'lang="{0}" and xml:lang="{1}" do not match.': 'lang="{0}" and xml:lang="{1}" do not match.',
    },
  },
  "adaptable/td-headers-attr": {
    description: "All cells in a table using headers attribute must reference valid header IDs.",
    guidance:
      "The headers attribute on table cells must reference IDs of header cells (th or td) within the same table. This creates explicit associations for screen readers. Verify all referenced IDs exist and spell them correctly. For simple tables, consider using scope on th elements instead.",
    messages: {
      'Headers attribute references the cell itself ("{0}").':
        'Headers attribute references the cell itself ("{0}").',
      'Headers attribute references non-existent ID "{0}".':
        'Headers attribute references non-existent ID "{0}".',
    },
  },
  "adaptable/th-has-data-cells": {
    description: "Table headers should be associated with data cells.",
    guidance:
      "Screen readers use <th> elements to announce column or row headers when navigating table cells — for example, reading 'Name: John' when moving to a cell. A table with <th> but no <td> elements means headers describe nothing, and screen readers cannot associate data with headers. Either add <td> data cells, or if this is not tabular data, use non-table markup instead.",
    messages: {
      "Table has header cells but no data cells.": "Table has header cells but no data cells.",
    },
  },
  "adaptable/td-has-header": {
    description: "Data cells in tables larger than 3x3 should have associated headers.",
    guidance:
      "In complex tables, screen reader users need header associations to understand data cells. Use th elements with scope attribute, or the headers attribute on td elements. For simple tables (≤3x3), this is less critical as context is usually clear.",
    messages: {
      "Data cell has no associated header. Add th elements with scope, or headers attribute.":
        "Data cell has no associated header. Add th elements with scope, or headers attribute.",
    },
  },
  "adaptable/scope-attr-valid": {
    description: "The scope attribute on table headers must have a valid value.",
    guidance:
      "The scope attribute tells screen readers which cells a header applies to. Valid values are: row, col, rowgroup, colgroup. Using invalid values breaks the association between headers and cells.",
    messages: {
      'Invalid scope value "{0}". Use row, col, rowgroup, or colgroup.':
        'Invalid scope value "{0}". Use row, col, rowgroup, or colgroup.',
    },
  },
  "adaptable/empty-table-header": {
    description: "Table header cells should have visible text.",
    guidance:
      "Empty table headers provide no information to screen reader users. Either add descriptive text to the header, or if the header is intentionally empty (like a corner cell), consider using a td element instead or adding a visually hidden label.",
    messages: {
      "Table header cell is empty. Add text or use aria-label.":
        "Table header cell is empty. Add text or use aria-label.",
    },
  },
  "labels-and-names/duplicate-id-aria": {
    description:
      "IDs used in ARIA and label associations must be unique to avoid broken references.",
    guidance:
      "When aria-labelledby, aria-describedby, aria-controls, or label[for] reference a duplicate ID, only the first matching element is used. This breaks the intended relationship and may leave controls unnamed or descriptions missing. Ensure IDs referenced by ARIA attributes and label associations are unique throughout the document.",
    messages: { 'Duplicate ID "{0}" referenced by {1}.': 'Duplicate ID "{0}" referenced by {1}.' },
  },
  "time-based-media/video-captions": {
    description:
      "Video elements must have captions via <track kind='captions'> or <track kind='subtitles'>.",
    guidance:
      "Captions provide text alternatives for audio content in videos, benefiting deaf users and those who cannot hear audio. Add a <track> element with kind='captions' pointing to a WebVTT caption file. Captions should include both dialogue and important sound effects.",
    messages: { "Video element has no captions track.": "Video element has no captions track." },
  },
  "time-based-media/audio-transcript": {
    description: "Audio elements should have a text alternative or transcript.",
    guidance:
      "Audio-only content like podcasts or recordings needs a text alternative for deaf users. Provide a transcript either on the same page or linked nearby. The transcript should include all spoken content and descriptions of relevant sounds.",
    messages: {
      "Audio element has no transcript or text alternative. Add a transcript or track element.":
        "Audio element has no transcript or text alternative. Add a transcript or track element.",
    },
  },
  "distinguishable/color-contrast": {
    description: "Text elements must have sufficient color contrast against the background.",
    guidance:
      "WCAG SC 1.4.3 requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (>=24px or >=18.66px bold). Increase the contrast by darkening the text or lightening the background, or vice versa.",
    messages: {
      "Insufficient color contrast ratio of {0}:1 (required {1}:1).":
        "Insufficient color contrast ratio of {0}:1 (required {1}:1).",
    },
  },
  "distinguishable/color-contrast-enhanced": {
    description:
      "Text elements must have enhanced color contrast against the background (WCAG AAA).",
    guidance:
      "WCAG SC 1.4.6 (AAA) requires a contrast ratio of at least 7:1 for normal text and 4.5:1 for large text (>=24px or >=18.66px bold). Higher contrast benefits users with low vision, aging eyes, or poor screen conditions. Increase the contrast by darkening the text or lightening the background, or vice versa.",
    messages: {
      "Insufficient enhanced contrast ratio of {0}:1 (required {1}:1).":
        "Insufficient enhanced contrast ratio of {0}:1 (required {1}:1).",
    },
  },
  "enough-time/meta-refresh-no-exception": {
    description: "Meta refresh must not be used with a delay (no exceptions).",
    guidance:
      "Automatic page refreshes and delayed redirects disorient users. Instant redirects (delay=0) are acceptable, but any positive delay is not. Use server-side redirects instead.",
    messages: {
      "Page has a {0}-second meta refresh delay. Use a server-side redirect instead.":
        "Page has a {0}-second meta refresh delay. Use a server-side redirect instead.",
      "Page has a {0}-second meta refresh delay. Remove the auto-refresh or provide user control.":
        "Page has a {0}-second meta refresh delay. Remove the auto-refresh or provide user control.",
    },
  },
  "distinguishable/letter-spacing": {
    description: "Letter spacing set with !important in style attributes must be at least 0.12em.",
    guidance:
      "WCAG 1.4.12 requires users to be able to override text spacing. Using !important on letter-spacing with a value below 0.12em prevents this. Either increase the value to at least 0.12em or remove !important.",
    messages: {
      "Letter spacing {0}em with !important is below the 0.12em minimum.":
        "Letter spacing {0}em with !important is below the 0.12em minimum.",
    },
  },
  "distinguishable/line-height": {
    description: "Line height set with !important in style attributes must be at least 1.5.",
    guidance:
      "WCAG 1.4.12 requires users to be able to override text spacing. Using !important on line-height with a value below 1.5 prevents this. Either increase the value to at least 1.5 or remove !important.",
    messages: {
      "Line height {0} with !important is below the 1.5 minimum.":
        "Line height {0} with !important is below the 1.5 minimum.",
    },
  },
  "distinguishable/word-spacing": {
    description: "Word spacing set with !important in style attributes must be at least 0.16em.",
    guidance:
      "WCAG 1.4.12 requires users to be able to override text spacing. Using !important on word-spacing with a value below 0.16em prevents this. Either increase the value to at least 0.16em or remove !important.",
    messages: {
      "Word spacing {0}em with !important is below the 0.16em minimum.":
        "Word spacing {0}em with !important is below the 0.16em minimum.",
    },
  },
  "adaptable/orientation-lock": {
    description: "Page orientation must not be restricted using CSS transforms.",
    guidance:
      "Users with motor disabilities may mount their device in a fixed orientation. Using CSS transforms with @media (orientation: portrait/landscape) to rotate content 90° effectively locks the page to one orientation. Remove the orientation-dependent transform and use responsive design instead.",
    messages: {
      "CSS locks page orientation via @media (orientation: {0}) with a 90° transform.":
        "CSS locks page orientation via @media (orientation: {0}) with a 90° transform.",
    },
  },
  "aria/presentational-children-focusable": {
    description:
      "Elements with a role that makes children presentational must not contain focusable content.",
    guidance:
      "Roles like button, checkbox, img, tab, and others make their children presentational — hidden from assistive technologies. If those children are focusable, keyboard users can reach elements that screen reader users cannot perceive. Move focusable content outside the parent or remove the focusability.",
    messages: {
      'Focusable element inside a "{0}" role whose children are presentational.':
        'Focusable element inside a "{0}" role whose children are presentational.',
    },
  },
  "keyboard-accessible/focus-visible": {
    description: "Elements in sequential focus order must have a visible focus indicator.",
    guidance:
      "Keyboard users need to see which element has focus. Do not remove the default focus outline (outline: none) without providing an alternative visible indicator. Use :focus-visible or :focus styles to ensure focus is always perceivable.",
    messages: {
      "Focusable element has outline removed without a visible focus alternative.":
        "Focusable element has outline removed without a visible focus alternative.",
    },
  },
  "input-assistance/accessible-authentication": {
    description:
      'Password inputs must not block password managers. Avoid autocomplete="off" and allow pasting.',
    guidance:
      'WCAG 2.2 SC 3.3.8 requires that authentication steps either avoid cognitive function tests or provide a mechanism to assist users. Password managers are a key assistive mechanism. Setting autocomplete="off" on password fields prevents password managers from filling credentials. Blocking paste via onpaste attributes prevents users from pasting stored passwords. Set autocomplete to "current-password" for login forms or "new-password" for registration/change-password forms, and do not block paste on password fields.',
    messages: {
      'Password field has autocomplete="off" which blocks password managers.':
        'Password field has autocomplete="off" which blocks password managers.',
      "Password field blocks pasting, preventing password manager use.":
        "Password field blocks pasting, preventing password manager use.",
    },
  },
};
