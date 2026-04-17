import { describe, it, expect } from "vitest";
import { rules, getActiveRules, getRuleById, runAudit } from "../rules/index";
import { registerLocale, translateViolations } from "./registry";
import { en } from "./en";
import { es } from "./es";

describe("i18n locale support", () => {
  it("returns original descriptions when no locale is set", () => {
    const active = getActiveRules();
    const imgAlt = active.find((r) => r.id === "text-alternatives/img-alt")!;
    expect(imgAlt.description).toBe(
      rules.find((r) => r.id === "text-alternatives/img-alt")!.description,
    );
  });

  it("applies registered locale translations", () => {
    registerLocale("test", {
      "text-alternatives/img-alt": { description: "Test description", guidance: "Test guidance" },
    });

    const active = getActiveRules({ locale: "test" });
    const imgAlt = active.find((r) => r.id === "text-alternatives/img-alt")!;
    expect(imgAlt.description).toBe("Test description");
    expect(imgAlt.guidance).toBe("Test guidance");
  });

  it("falls back to original for untranslated rules", () => {
    registerLocale("partial", {
      "text-alternatives/img-alt": { description: "Translated img-alt" },
    });

    const active = getActiveRules({ locale: "partial" });
    const linkName = active.find((r) => r.id === "navigable/link-name")!;
    const original = rules.find((r) => r.id === "navigable/link-name")!;
    expect(linkName.description).toBe(original.description);
    expect(linkName.guidance).toBe(original.guidance);
  });

  it("preserves guidance when translation omits it", () => {
    registerLocale("no-guidance", {
      "text-alternatives/img-alt": { description: "Translated description only" },
    });

    const active = getActiveRules({ locale: "no-guidance" });
    const imgAlt = active.find((r) => r.id === "text-alternatives/img-alt")!;
    expect(imgAlt.description).toBe("Translated description only");
    expect(imgAlt.guidance).toBe(rules.find((r) => r.id === "text-alternatives/img-alt")!.guidance);
  });

  it("does not mutate original rule objects", () => {
    const originalDesc = rules.find((r) => r.id === "text-alternatives/img-alt")!.description;

    registerLocale("mutate-check", {
      "text-alternatives/img-alt": { description: "Mutated?" },
    });
    getActiveRules({ locale: "mutate-check" });

    expect(rules.find((r) => r.id === "text-alternatives/img-alt")!.description).toBe(originalDesc);
  });

  it("locale only applies when passed in options", () => {
    registerLocale("temp", {
      "text-alternatives/img-alt": { description: "Temporary" },
    });
    expect(
      getActiveRules({ locale: "temp" }).find((r) => r.id === "text-alternatives/img-alt")!
        .description,
    ).toBe("Temporary");

    const original = rules.find((r) => r.id === "text-alternatives/img-alt")!;
    expect(getActiveRules().find((r) => r.id === "text-alternatives/img-alt")!.description).toBe(
      original.description,
    );
  });

  it("getRuleById applies locale via options", () => {
    registerLocale("lookup", {
      "text-alternatives/img-alt": { description: "Lookup translation" },
    });

    const rule = getRuleById("text-alternatives/img-alt", { locale: "lookup" })!;
    expect(rule.description).toBe("Lookup translation");

    // Without locale option, returns untranslated rule
    const untranslated = getRuleById("text-alternatives/img-alt")!;
    expect(untranslated.description).toBe(
      rules.find((r) => r.id === "text-alternatives/img-alt")!.description,
    );
  });

  it("getRuleById looks up additionalRules by id", () => {
    const custom = {
      id: "custom/my-rule",
      category: "custom",
      wcag: ["1.1.1"],
      level: "A" as const,
      description: "Custom rule",
      run: () => [],
    };
    expect(getRuleById("custom/my-rule", { additionalRules: [custom] })).toBe(custom);
    expect(getRuleById("custom/my-rule")).toBeUndefined();
  });

  it("runAudit translates violation messages when locale is passed", () => {
    registerLocale("es", es);
    // Parsing "<button></button>" gives an unlabeled button → button-name violation
    const doc = new DOMParser().parseFromString(
      '<html lang="en"><head><title>T</title></head><body><main><button></button></main></body></html>',
      "text/html",
    );
    const result = runAudit(doc, { locale: "es" });
    const buttonName = result.violations.find((v) => v.ruleId === "labels-and-names/button-name");
    expect(buttonName?.message).toBe("El botón no tiene texto discernible.");
  });

  it("English locale entries match all built-in rules", () => {
    const enIds = new Set(Object.keys(en));
    const ruleIds = new Set(rules.map((r) => r.id));

    for (const id of ruleIds) {
      expect(enIds.has(id), `Missing English translation for rule: ${id}`).toBe(true);
    }
    for (const id of enIds) {
      expect(ruleIds.has(id), `English translation for unknown rule: ${id}`).toBe(true);
    }
    expect(enIds.size).toBe(ruleIds.size);
  });

  it("English locale values stay in sync with rule source", () => {
    for (const rule of rules) {
      const t = en[rule.id];
      expect(t.description, `en.ts description out of sync for ${rule.id}`).toBe(rule.description);
      if (rule.guidance) {
        expect(t.guidance, `en.ts guidance out of sync for ${rule.id}`).toBe(rule.guidance);
      }
    }
  });
});

describe("i18n message translation", () => {
  it("translates static violation messages", () => {
    registerLocale("es", es);
    const violations = [
      {
        ruleId: "labels-and-names/button-name",
        message: "Button has no discernible text.",
        html: "<button></button>",
        selector: "button",
        impact: "critical" as const,
      },
    ];
    const translated = translateViolations(violations, "es");
    expect(translated[0].message).toBe("El botón no tiene texto discernible.");
  });

  it("translates dynamic messages with single placeholder", () => {
    registerLocale("es", es);
    const violations = [
      {
        ruleId: "aria/aria-roles",
        message: 'Invalid ARIA role "banana".',
        html: "<div>",
        selector: "div",
        impact: "critical" as const,
      },
    ];
    const translated = translateViolations(violations, "es");
    expect(translated[0].message).toBe('Rol ARIA inválido "banana".');
  });

  it("translates dynamic messages with multiple placeholders", () => {
    registerLocale("es", es);
    const violations = [
      {
        ruleId: "navigable/heading-order",
        message: "Heading level 4 skipped from level 2. Use h3 instead.",
        html: "<h4>",
        selector: "h4",
        impact: "moderate" as const,
      },
    ];
    const translated = translateViolations(violations, "es");
    expect(translated[0].message).toBe(
      "Nivel de encabezado 4 saltado desde el nivel 2. Use h3 en su lugar.",
    );
  });

  it("returns original message when no matching template exists", () => {
    registerLocale("es", es);
    const violations = [
      {
        ruleId: "labels-and-names/button-name",
        message: "Some unexpected message format.",
        html: "<button>",
        selector: "button",
        impact: "critical" as const,
      },
    ];
    const translated = translateViolations(violations, "es");
    expect(translated[0].message).toBe("Some unexpected message format.");
  });

  it("returns original violations when locale is not registered", () => {
    const violations = [
      {
        ruleId: "labels-and-names/button-name",
        message: "Button has no discernible text.",
        html: "<button>",
        selector: "button",
        impact: "critical" as const,
      },
    ];
    const translated = translateViolations(violations, "unknown");
    expect(translated).toBe(violations);
  });

  it("does not mutate original violation objects", () => {
    registerLocale("es", es);
    const original = {
      ruleId: "labels-and-names/button-name",
      message: "Button has no discernible text.",
      html: "<button>",
      selector: "button",
      impact: "critical" as const,
    };
    const violations = [original];
    const translated = translateViolations(violations, "es");
    expect(original.message).toBe("Button has no discernible text.");
    expect(translated[0].message).toBe("El botón no tiene texto discernible.");
  });

  it("handles placeholders that contain placeholder-like text", () => {
    registerLocale("es", es);
    // Captured value contains literal text that looks like a placeholder reference
    const violations = [
      {
        ruleId: "aria/aria-valid-attr-value",
        message: 'aria-checked must be "true" or "false", got "{1} weird".',
        html: "<div>",
        selector: "div",
        impact: "critical" as const,
      },
    ];
    const translated = translateViolations(violations, "es");
    expect(translated[0].message).toBe(
      'aria-checked debe ser "true" o "false", se obtuvo "{1} weird".',
    );
  });

  it("Spanish locale has messages for all rules with English messages", () => {
    for (const [ruleId, enEntry] of Object.entries(en)) {
      if (enEntry.messages) {
        const esEntry = es[ruleId];
        expect(esEntry?.messages, `Missing Spanish messages for rule: ${ruleId}`).toBeDefined();
        for (const key of Object.keys(enEntry.messages)) {
          expect(
            esEntry.messages![key],
            `Missing Spanish message translation for ${ruleId}: "${key}"`,
          ).toBeDefined();
        }
      }
    }
  });
});
