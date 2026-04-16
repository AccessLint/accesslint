import React, { useState, useMemo, useRef, useCallback, type FC } from "react";
import { useChannel } from "storybook/manager-api";
import { useTheme } from "storybook/theming";
import { STORY_CHANGED } from "storybook/internal/core-events";
import { RESULT_EVENT, HIGHLIGHT, REMOVE_HIGHLIGHT } from "./constants";

interface EnrichedViolation {
  ruleId: string;
  selector: string;
  html: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  message: string;
  context?: string;
  description?: string;
  wcag?: string[];
  level?: "A" | "AA" | "AAA";
  guidance?: string;
}

const IMPACT_COLOR: Record<string, string> = {
  critical: "#d32f2f",
  serious: "#d32f2f",
  moderate: "#c43e00",
  minor: "#999999",
};

const IMPACT_ICON: Record<string, string> = {
  critical: "\u2716",
  serious: "\u2716",
  moderate: "\u26A0",
  minor: "\u00B7",
};

const IMPACT_ORDER: Record<string, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

const LEVEL_COLOR: Record<string, string> = {
  A: "#2e7d32",
  AA: "#1565c0",
  AAA: "#6a1b9a",
};

interface PanelProps {
  active?: boolean;
}

export const Panel: FC<PanelProps> = ({ active }) => {
  const theme = useTheme();
  const isDark = theme.base === "dark";

  const colors = useMemo(() => ({
    text: theme.textColor || (isDark ? "#e0e0e0" : "#424242"),
    textMuted: theme.textMutedColor || (isDark ? "#999" : "#616161"),
    bg: theme.appContentBg || (isDark ? "#1a1a1a" : "#fff"),
    bgDetails: isDark ? "#2a2a2a" : "#f5f5f5",
    bgSelected: isDark ? "#1a3a5c" : "#e3f2fd",
    border: theme.appBorderColor || (isDark ? "#444" : "#f0f0f0"),
    codeBg: isDark ? "#333" : "#fff",
    codeBorder: isDark ? "#555" : "#e0e0e0",
    tagBg: isDark ? "#444" : "#e0e0e0",
    tagText: isDark ? "#ccc" : "#616161",
    ruleId: isDark ? "#64b5f6" : "#1565c0",
  }), [isDark, theme]);

  const [violations, setViolations] = useState<EnrichedViolation[]>([]);
  const [ruleCount, setRuleCount] = useState(0);
  const [skippedReason, setSkippedReason] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const emit = useChannel({
    [RESULT_EVENT]: ({ result }: { storyId?: string; result: { violations?: EnrichedViolation[]; ruleCount?: number; skipped?: boolean; reason?: string }; status?: string }) => {
      if (result.skipped) {
        setViolations([]);
        setRuleCount(0);
        setSkippedReason(result.reason ?? "skipped");
        setExpandedIndex(null);
        setHighlightedIndex(null);
        return;
      }
      setViolations(result.violations ?? []);
      setRuleCount(result.ruleCount ?? 0);
      setSkippedReason(null);
      setExpandedIndex(null);
      setHighlightedIndex(null);
    },
    [STORY_CHANGED]: () => {
      setViolations([]);
      setRuleCount(0);
      setSkippedReason(null);
      setExpandedIndex(null);
      setHighlightedIndex(null);
    },
  });

  const sorted = useMemo(
    () => [...violations].sort((a, b) => (IMPACT_ORDER[a.impact] ?? 4) - (IMPACT_ORDER[b.impact] ?? 4)),
    [violations],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let next: number | null = null;
    switch (e.key) {
      case "ArrowDown":
        next = Math.min(index + 1, sorted.length - 1);
        break;
      case "ArrowUp":
        next = Math.max(index - 1, 0);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = sorted.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    buttonRefs.current[next]?.focus();
  }, [sorted.length]);

  if (!active) return null;

  const passed = ruleCount - new Set(violations.map((v) => v.ruleId)).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "system-ui, sans-serif" }}>
      {ruleCount > 0 && (
        <div style={{
          display: "flex",
          gap: "12px",
          padding: "8px 12px",
          fontSize: "11px",
          color: colors.textMuted,
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}>
          <span>{ruleCount} rules</span>
          <span style={{ color: "#2e7d32" }}>{passed} passed</span>
          <span style={{ color: violations.length > 0 ? "#d32f2f" : colors.textMuted }}>
            {new Set(violations.map((v) => v.ruleId)).size} failed
          </span>
        </div>
      )}
      {violations.length === 0 ? (
        <p style={{ padding: "12px", margin: 0, fontSize: "13px", color: colors.textMuted }}>
          {skippedReason
            ? `Accessibility audit skipped (${skippedReason} tag).`
            : "No accessibility violations found."}
        </p>
      ) : (
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <ul
            style={{ listStyle: "none", padding: 0, margin: 0 }}
            aria-label="Accessibility violations"
          >
            {sorted.map((v, i) => {
              const isOpen = expandedIndex === i;
              return (
                <li key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <button
                    ref={(el) => { buttonRefs.current[i] = el; }}
                    type="button"
                    onClick={() => {
                      setExpandedIndex(isOpen ? null : i);
                      if (highlightedIndex !== null) {
                        emit(REMOVE_HIGHLIGHT);
                        setHighlightedIndex(null);
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    aria-expanded={isOpen}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: isOpen ? colors.bgSelected : "transparent",
                      border: "none",
                      font: "inherit",
                      fontSize: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      color: colors.text,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        aria-hidden="true"
                        style={{
                          color: IMPACT_COLOR[v.impact],
                          fontWeight: "bold",
                          fontSize: "12px",
                        }}
                      >
                        {IMPACT_ICON[v.impact]}
                      </span>
                      <span style={{ color: IMPACT_COLOR[v.impact], fontSize: "11px" }}>
                        {v.impact}
                      </span>
                      <code style={{ fontSize: "11px", color: colors.ruleId }}>
                        {v.ruleId}
                      </code>
                    </div>
                    <div style={{ marginTop: "2px", color: colors.text, fontSize: "12px" }}>
                      {v.message}
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "4px 12px 12px", background: colors.bgDetails }}>
                      {v.description && (
                        <p style={{ margin: "4px 0 8px", fontSize: "12px", color: colors.text }}>
                          {v.description}
                        </p>
                      )}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                        {v.level && (
                          <span style={{
                            display: "inline-block",
                            padding: "0 5px",
                            fontSize: "10px",
                            fontWeight: 600,
                            borderRadius: "3px",
                            color: "#fff",
                            background: LEVEL_COLOR[v.level] || "#666",
                            lineHeight: "18px",
                          }}>
                            WCAG {v.level}
                          </span>
                        )}
                        {v.wcag?.map((ref) => (
                          <span
                            key={ref}
                            style={{
                              display: "inline-block",
                              padding: "0 5px",
                              fontSize: "10px",
                              fontWeight: 500,
                              borderRadius: "3px",
                              color: colors.tagText,
                              background: colors.tagBg,
                              lineHeight: "18px",
                            }}
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                      {v.guidance && (
                        <div style={{ marginBottom: "8px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 500, color: colors.textMuted, marginBottom: "4px" }}>
                            How to fix
                          </div>
                          <p style={{ margin: 0, fontSize: "12px", color: colors.text, whiteSpace: "pre-wrap" }}>
                            {v.guidance}
                          </p>
                        </div>
                      )}
                      {v.html && (
                        <div style={{ marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 500, color: colors.textMuted }}>
                              Element
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (highlightedIndex === i) {
                                  emit(REMOVE_HIGHLIGHT);
                                  setHighlightedIndex(null);
                                } else {
                                  const color = v.impact === "critical" || v.impact === "serious"
                                    ? "#d32f2f"
                                    : "#c43e00";
                                  const localSelector = v.selector.replace(/^.*>>>\s*iframe>\s*/, "");
                                  emit(HIGHLIGHT, {
                                    elements: [localSelector],
                                    color,
                                    style: "solid",
                                  });
                                  setHighlightedIndex(i);
                                }
                              }}
                              style={{
                                padding: "2px 8px",
                                fontSize: "11px",
                                fontWeight: 500,
                                border: `1px solid ${colors.codeBorder}`,
                                borderRadius: "4px",
                                background: highlightedIndex === i ? IMPACT_COLOR[v.impact] : colors.codeBg,
                                color: highlightedIndex === i ? "#fff" : colors.text,
                                cursor: "pointer",
                              }}
                            >
                              Highlight
                            </button>
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              padding: "6px 8px",
                              fontSize: "11px",
                              color: colors.text,
                              background: colors.codeBg,
                              border: `1px solid ${colors.codeBorder}`,
                              borderRadius: "4px",
                              overflow: "auto",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                            }}
                          >
                            {v.html}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
