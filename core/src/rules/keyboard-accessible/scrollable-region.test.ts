import { describe, it, expect, vi, afterEach } from "vitest";
import { makeDoc } from "../../test-helpers";
import { scrollableRegion } from "./scrollable-region";
import * as colorUtils from "../utils/color";
import { clearColorCaches } from "../utils/color";

function mockScrollable(
  el: Element,
  scrollHeight = 300,
  clientHeight = 100,
  scrollWidth = 0,
  clientWidth = 200,
) {
  Object.defineProperty(el, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
  Object.defineProperty(el, "scrollWidth", { value: scrollWidth, configurable: true });
  Object.defineProperty(el, "clientWidth", { value: clientWidth, configurable: true });
}

function spyScrollOverflow(targetAttr = "data-scrollable") {
  return vi.spyOn(colorUtils, "getCachedComputedStyle").mockImplementation((el: Element) => {
    const isTarget = (el as HTMLElement).hasAttribute?.(targetAttr);
    return {
      overflowX: "visible",
      overflowY: isTarget ? "scroll" : "visible",
    } as unknown as CSSStyleDeclaration;
  });
}

describe("keyboard-accessible/scrollable-region", () => {
  afterEach(() => {
    clearColorCaches();
    vi.restoreAllMocks();
  });

  describe("with mocked scroll metrics (real violation path)", () => {
    it("reports scrollable region without tabindex or focusable child", () => {
      spyScrollOverflow();
      const doc = makeDoc(`<div data-scrollable>Some content here</div>`);
      mockScrollable(doc.querySelector("[data-scrollable]")!);

      const violations = scrollableRegion.run(doc);
      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe("keyboard-accessible/scrollable-region");
      expect(violations[0].impact).toBe("serious");
    });

    it("passes scrollable region with tabindex='0'", () => {
      spyScrollOverflow();
      const doc = makeDoc(`<div data-scrollable tabindex="0">Some content here</div>`);
      mockScrollable(doc.querySelector("[data-scrollable]")!);

      expect(scrollableRegion.run(doc)).toHaveLength(0);
    });

    it("does not pass scrollable region with tabindex='-1'", () => {
      spyScrollOverflow();
      const doc = makeDoc(`<div data-scrollable tabindex="-1">Some content here</div>`);
      mockScrollable(doc.querySelector("[data-scrollable]")!);

      expect(scrollableRegion.run(doc)).toHaveLength(1);
    });

    it("passes scrollable region containing a focusable child", () => {
      spyScrollOverflow();
      const doc = makeDoc(`<div data-scrollable><button>Click me</button></div>`);
      mockScrollable(doc.querySelector("[data-scrollable]")!);

      expect(scrollableRegion.run(doc)).toHaveLength(0);
    });

    it("passes scrollable region containing a link", () => {
      spyScrollOverflow();
      const doc = makeDoc(`<div data-scrollable><a href="/foo">Link</a></div>`);
      mockScrollable(doc.querySelector("[data-scrollable]")!);

      expect(scrollableRegion.run(doc)).toHaveLength(0);
    });

    it("skips aria-hidden scrollable regions", () => {
      spyScrollOverflow();
      const doc = makeDoc(`<div data-scrollable aria-hidden="true">Hidden content</div>`);
      mockScrollable(doc.querySelector("[data-scrollable]")!);

      expect(scrollableRegion.run(doc)).toHaveLength(0);
    });

    it("skips role='presentation' scrollable regions", () => {
      spyScrollOverflow();
      const doc = makeDoc(`<div data-scrollable role="presentation">Decorative</div>`);
      mockScrollable(doc.querySelector("[data-scrollable]")!);

      expect(scrollableRegion.run(doc)).toHaveLength(0);
    });

    it("skips role='none' scrollable regions", () => {
      spyScrollOverflow();
      const doc = makeDoc(`<div data-scrollable role="none">Decorative</div>`);
      mockScrollable(doc.querySelector("[data-scrollable]")!);

      expect(scrollableRegion.run(doc)).toHaveLength(0);
    });

    it("skips widget containers (listbox, menu, tree, tabpanel)", () => {
      for (const role of ["listbox", "menu", "tree", "tabpanel"]) {
        spyScrollOverflow();
        const doc = makeDoc(`<div data-scrollable role="${role}">Widget content</div>`);
        mockScrollable(doc.querySelector("[data-scrollable]")!);

        expect(scrollableRegion.run(doc), `role="${role}" should be skipped`).toHaveLength(0);
        vi.restoreAllMocks();
      }
    });

    it("skips elements with no meaningful overflow (overflowH < 14px)", () => {
      spyScrollOverflow();
      const doc = makeDoc(`<div data-scrollable>Content</div>`);
      // scrollHeight - clientHeight = 10, which is < 14px threshold
      mockScrollable(doc.querySelector("[data-scrollable]")!, 110, 100, 0, 200);

      expect(scrollableRegion.run(doc)).toHaveLength(0);
    });

    it("skips elements with no text content or media", () => {
      spyScrollOverflow();
      const doc = makeDoc(`<div data-scrollable></div>`);
      mockScrollable(doc.querySelector("[data-scrollable]")!);

      expect(scrollableRegion.run(doc)).toHaveLength(0);
    });

    it("does not report overflow: auto region with image content but no keyboard access", () => {
      vi.spyOn(colorUtils, "getCachedComputedStyle").mockImplementation(
        (el: Element) =>
          ({
            overflowX: "visible",
            overflowY: (el as HTMLElement).hasAttribute?.("data-scrollable") ? "auto" : "visible",
          }) as unknown as CSSStyleDeclaration,
      );
      const doc = makeDoc(`<div data-scrollable><img src="photo.jpg" alt="Photo"></div>`);
      mockScrollable(doc.querySelector("[data-scrollable]")!);

      const violations = scrollableRegion.run(doc);
      expect(violations).toHaveLength(1);
    });
  });

  describe("DOM-only fallback (scroll metrics unavailable)", () => {
    it("skips all elements when scrollHeight and clientHeight are both 0", () => {
      vi.spyOn(colorUtils, "getCachedComputedStyle").mockReturnValue({
        overflowX: "visible",
        overflowY: "scroll",
      } as unknown as CSSStyleDeclaration);
      // No mockScrollable call — default DOM properties remain 0
      const doc = makeDoc(`<div style="overflow: scroll;">Content</div>`);

      expect(scrollableRegion.run(doc)).toHaveLength(0);
    });
  });

  describe("non-scrollable elements", () => {
    it("passes element with overflow: hidden", () => {
      vi.spyOn(colorUtils, "getCachedComputedStyle").mockReturnValue({
        overflowX: "hidden",
        overflowY: "hidden",
      } as unknown as CSSStyleDeclaration);
      const doc = makeDoc(`<div>Content</div>`);

      expect(scrollableRegion.run(doc)).toHaveLength(0);
    });

    it("passes element with overflow: visible", () => {
      vi.spyOn(colorUtils, "getCachedComputedStyle").mockReturnValue({
        overflowX: "visible",
        overflowY: "visible",
      } as unknown as CSSStyleDeclaration);
      const doc = makeDoc(`<div>Content</div>`);

      expect(scrollableRegion.run(doc)).toHaveLength(0);
    });
  });
});
