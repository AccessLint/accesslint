// Tool names as the model sees them. A connection contributes
// `<connection>__<tool>`, and mounting an extension prefixes its contributions
// with the mount name, so `agent/extensions/accesslint.ts` mounting a
// connection authored at `connections/api.ts` yields `accesslint__api__*`.
const PREFIX = "accesslint__api__";

export const TOOL = {
  listDomains: `${PREFIX}list_domains`,
  addDomain: `${PREFIX}add_domain`,
  generateFlows: `${PREFIX}generate_flows`,
  getDraft: `${PREFIX}get_draft`,
  runFlow: `${PREFIX}run_flow`,
  getRun: `${PREFIX}get_run`,
  scanPage: `${PREFIX}scan_page`,
  getScan: `${PREFIX}get_scan`,
} as const;
