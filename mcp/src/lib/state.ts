import type { AuditResult } from "@accesslint/core";
import { audit as cliAudit } from "@accesslint/cli";

const MAX_STORED_AUDITS = 10;
const storedAudits = new Map<string, AuditResult>();

export function audit(
  html: string,
  options?: { name?: string }
): AuditResult {
  const result = cliAudit(html);

  if (options?.name) {
    storeAudit(options.name, result);
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
}
