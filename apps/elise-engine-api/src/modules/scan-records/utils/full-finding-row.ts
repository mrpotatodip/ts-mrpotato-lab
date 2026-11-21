import { sha256Hex } from "@repo/db-elise";
import type { ScanParams } from "#/schemas";
import { SCAN_RECORDS_FULL_CLASS } from "#/modules/scan-records/constants";
import type { FullFinding } from "#/modules/scan-records/schemas";
import type { NewFindingRow } from "#/modules/scan-records/types";

const validationPlanText = (plan: { local?: string; deployment?: string }): string | null => {
  const parts = [plan.local ? `Local: ${plan.local}` : null, plan.deployment ? `Deployment: ${plan.deployment}` : null].filter((part) => part !== null);
  return parts.length === 0 ? null : parts.join("\n");
};

// -----
// A nested record of the full skill as a scan_findings row.
// The record has no class and its fingerprint is a source-derived
// id (not 64 hex), so findingId keeps that id and the stored
// fingerprint is its SHA-256, as triage needs. An open problem
// of a full scan is never in the History, so origin stays "new".
// -----
export const fullFindingRowOf = async (finding: FullFinding, params: Pick<ScanParams, "accountId" | "scanId">): Promise<NewFindingRow> => {
  const first = finding.evidence[0];
  const confirmed = finding.verdict === "confirmed";
  return {
    tenantId: params.accountId,
    scanId: params.scanId,
    findingId: finding.fingerprint,
    fingerprint: await sha256Hex(finding.fingerprint),
    status: finding.verdict,
    severity: confirmed ? finding.severity.overall_severity : null,
    title: finding.title,
    class: SCAN_RECORDS_FULL_CLASS,
    file: first?.file ?? null,
    line: first?.line ?? null,
    actor: null,
    impact: finding.description,
    evidence: finding.evidence.length === 0 ? null : finding.evidence.map((entry) => entry.description).join("\n"),
    fix: confirmed ? finding.remediation.strategy : null,
    needs: confirmed ? null : validationPlanText(finding.validation_plan),
    origin: "new",
  };
};
