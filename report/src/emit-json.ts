import type { Report } from "./aggregate.js";

export function emitJson(report: Report): string {
  return JSON.stringify(report, null, 2) + "\n";
}
