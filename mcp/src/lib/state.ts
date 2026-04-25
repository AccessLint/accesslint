import type { AuditResult } from "@accesslint/core";
import { audit as cliAudit } from "@accesslint/cli";

const MAX_STORED_AUDITS = 10;
const storedAudits = new Map<string, AuditResult>();
const expectedTokens = new Map<string, string>();

export interface AuditCallOptions {
  name?: string;
  includeAAA?: boolean;
  componentMode?: boolean;
  disabledRules?: string[];
}

export function audit(html: string, options?: AuditCallOptions): AuditResult {
  const { name, ...auditOptions } = options ?? {};
  const result = cliAudit(html, auditOptions);

  if (name) {
    storeAudit(name, result);
  }

  return result;
}

export function storeAudit(name: string, result: AuditResult): void {
  // Evict oldest entry if at capacity
  if (storedAudits.size >= MAX_STORED_AUDITS && !storedAudits.has(name)) {
    const oldest = storedAudits.keys().next().value;
    if (oldest !== undefined) {
      storedAudits.delete(oldest);
    }
  }
  storedAudits.set(name, result);
}

export function getStoredAudit(name: string): AuditResult | undefined {
  return storedAudits.get(name);
}

export function clearStoredAudits(): void {
  storedAudits.clear();
  expectedTokens.clear();
}

export function registerExpectedToken(name: string, token: string): void {
  expectedTokens.set(name, token);
}

export function consumeExpectedToken(name: string): string | undefined {
  const token = expectedTokens.get(name);
  expectedTokens.delete(name);
  return token;
}
