import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { runEffect } from "#/lib/effect-query";
import { dbConnect, type DbConnectType } from "#/lib/db-connection";
import { sandboxesOf } from "#/lib/scan-path";
import type { ScanParams } from "#/schemas";
import { findSealedKeyEffect } from "#/modules/anthropic-key";
import { findBranchEffect, findBranchesAtTipEffect, isCommitId } from "#/modules/branches";
import { runnerSandbox } from "#/modules/runners/lib";
import { neonScanRepo } from "#/modules/scan-ledger";
import { listPriorsEffect, recordScanSvc, SCAN_RECORDS_PRIOR_LIMIT, type PriorFinding } from "#/modules/scan-records";
import type { FullPhase } from "#/modules/scan-sandbox";
import { SCAN_WORKFLOW_MAX_POLLS } from "#/modules/scan-workflow/constants";
import type { Bindings } from "#/types/variables";
import { runScan } from "./run-scan";
import { settleScanCredit } from "./settle-scan-credit";

const branchAtTip = async (db: DbConnectType, accountId: string, repoId: string, ref: string | null | undefined) => {
  if (!ref || !isCommitId(ref)) return null;
  const atTip = await runEffect(findBranchesAtTipEffect(db, accountId, repoId, ref.toLowerCase()));
  return atTip.length === 1 ? atTip[0] : null;
};

// -----
// What the agent is asked to re-check: the unresolved findings
// of the branch it is reading, for the one skill whose findings
// are recorded. A scan with no tracked branch (a tag, an older
// commit, an untracked name, or a branch with no History yet)
// gets none: its checkout is not the code a History is about.
// A commit that is the latest of one tracked branch is that
// branch's code, so it gets that branch's list.
// -----
const priorsOf = async (env: Bindings, params: ScanParams): Promise<PriorFinding[]> => {
  if (params.options.skill !== "lite") return [];
  const db = dbConnect(env.DATABASE_URL);
  const scan = await runEffect(neonScanRepo(db).get(params.accountId, params.scanId));
  if (!scan) return [];
  const branch = scan.branch
    ? await runEffect(findBranchEffect(db, params.accountId, scan.repoId, scan.branch))
    : await branchAtTip(db, params.accountId, scan.repoId, scan.ref);
  return branch ? runEffect(listPriorsEffect(db, params.accountId, branch.id, SCAN_RECORDS_PRIOR_LIMIT)) : [];
};

export class ScanWorkflow extends WorkflowEntrypoint<Bindings, ScanParams> {
  // -----
  // The Sandbox namespace this Workflow starts its Scans in.
  // FullScanWorkflow overrides it.
  // -----
  protected get sandboxes(): Bindings["SANDBOX"] {
    return sandboxesOf(this.env, "lite");
  }

  // -----
  // How many 10-second polls the audit may take: 40 minutes for lite.
  // FullScanWorkflow overrides it with its own limit.
  // -----
  protected get maxPolls(): number {
    return SCAN_WORKFLOW_MAX_POLLS;
  }

  // -----
  // The Phases this Workflow runs, in order. A lite Scan has none: it is
  // one run of the agent. FullScanWorkflow overrides it.
  // -----
  protected get phases(): readonly FullPhase[] | undefined {
    return undefined;
  }

  async run(event: WorkflowEvent<ScanParams>, step: WorkflowStep) {
    return runScan(
      {
        maxPolls: this.maxPolls,
        phases: event.payload.runnerId ? undefined : this.phases,
        sandbox: event.payload.runnerId ? runnerSandbox(dbConnect(this.env.DATABASE_URL), event.payload, event.payload.runnerId) : this.sandboxes.getByName(event.payload.scanId),
        ledger: neonScanRepo(dbConnect(this.env.DATABASE_URL)),
        reports: this.env.REPORTS,
        readPriors: (params) => priorsOf(this.env, params),
        sealedKeyFor: (accountId) => runEffect(findSealedKeyEffect(dbConnect(this.env.DATABASE_URL), accountId)),
        recordScan: (params, status, error, usage) => runEffect(recordScanSvc(this.env, params, status, error, usage)),
        settleCredit: (params, status, usage) => settleScanCredit(this.env, params, status, usage),
      },
      event.payload,
      step,
    );
  }
}
