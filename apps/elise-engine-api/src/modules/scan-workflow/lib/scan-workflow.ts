import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { runEffect } from "#/lib/effect-query";
import { dbConnect, type DbConnectType } from "#/lib/db-connection";
import type { ScanParams } from "#/schemas";
import { findBranchEffect, findBranchesAtTipEffect, isCommitId } from "#/modules/branches";
import { neonScanRepo } from "#/modules/scan-ledger";
import { listPriorsEffect, recordScanSvc, SCAN_RECORDS_PRIOR_LIMIT, type PriorFinding } from "#/modules/scan-records";
import type { Bindings } from "#/types/variables";
import { runScan } from "./run-scan";

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
  async run(event: WorkflowEvent<ScanParams>, step: WorkflowStep) {
    return runScan(
      {
        sandbox: this.env.SANDBOX.getByName(event.payload.scanId),
        ledger: neonScanRepo(dbConnect(this.env.DATABASE_URL)),
        reports: this.env.REPORTS,
        readPriors: (params) => priorsOf(this.env, params),
        recordScan: (params, status, error, usage) => runEffect(recordScanSvc(this.env, params, status, error, usage)),
      },
      event.payload,
      step,
    );
  }
}
