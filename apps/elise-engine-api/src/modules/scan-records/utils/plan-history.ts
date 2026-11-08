import type { FindingTriageStatusValue, RepoFindingStateValue } from "@repo/contracts/elise";
import type { HistoryPlan, NewHistoryRow, PlanInput, PlannedFinding, PriorTally } from "#/modules/scan-records/types";

// -----
// How one succeeded scan changes a repo's history.
//
// A problem is closed only by evidence: the agent says
// not_found and nothing in the scan looks like it under
// another name. Silence and cannot_tell leave it as it
// was and mark it unchecked. Priors are only those the
// agent was given, so a repo with more than the cap is
// never closed for the ones it was not asked about.
//
// A problem found that was fixed (by code, or by a
// person's decision) is a regression. One that was
// regressed stays regressed while it is still found.
// -----
export const planHistory = (input: PlanInput): HistoryPlan => {
  const { scanId, repoId, branchId, tenantId, history, triage, given, found, recheck } = input;
  const givenIds = new Set(given.map((prior) => prior.priorId));

  const planned = new Map<string, PlannedFinding>();
  for (const { finding, fingerprint } of found) {
    const carried = [finding.priorId, fingerprint].find((id) => id != null && givenIds.has(id)) ?? null;
    const key = carried ?? fingerprint;
    if (!planned.has(key)) planned.set(key, { finding, fingerprint: key, origin: carried ? "carried" : "new" });
  }

  const rows = new Map<string, NewHistoryRow>();
  const stateOf = (fingerprint: string): RepoFindingStateValue => {
    const before = history.get(fingerprint)?.state ?? "open";
    const fixedByPerson: FindingTriageStatusValue = "fixed";
    return before === "fixed_by_code" || (before === "open" && triage.get(fingerprint) === fixedByPerson) ? "regressed" : before;
  };

  for (const { fingerprint } of planned.values()) {
    const before = history.get(fingerprint);
    rows.set(fingerprint, {
      repoId,
      branchId,
      tenantId,
      fingerprint,
      state: stateOf(fingerprint),
      unchecked: false,
      firstSeenScanId: before?.firstSeenScanId ?? scanId,
      lastSeenScanId: scanId,
      fixedInScanId: before?.fixedInScanId ?? null,
      possibleDuplicateOf: before?.possibleDuplicateOf ?? null,
    });
  }

  const newOnes = [...planned.values()].filter((item) => item.origin === "new");
  const tally: PriorTally = { given: given.length, carried: 0, closed: 0, unchecked: 0 };
  for (const prior of given) {
    if (planned.get(prior.priorId)?.origin === "carried") tally.carried += 1;
    if (planned.has(prior.priorId)) continue;
    const before = history.get(prior.priorId);
    if (!before) continue;

    const lookalikes = prior.file === null ? [] : newOnes.filter((item) => item.finding.class === prior.class && (item.finding.location[0]?.file ?? null) === prior.file);
    for (const lookalike of lookalikes) {
      const row = rows.get(lookalike.fingerprint);
      if (row) row.possibleDuplicateOf = prior.priorId;
    }

    const gone = recheck.some((entry) => entry.priorId === prior.priorId && entry.result === "not_found");
    const closed = gone && lookalikes.length === 0;
    if (closed) tally.closed += 1;
    else tally.unchecked += 1;
    rows.set(prior.priorId, {
      repoId,
      branchId,
      tenantId,
      fingerprint: prior.priorId,
      state: closed ? "fixed_by_code" : before.state,
      unchecked: !closed,
      firstSeenScanId: before.firstSeenScanId,
      lastSeenScanId: before.lastSeenScanId,
      fixedInScanId: closed ? scanId : before.fixedInScanId,
      possibleDuplicateOf: before.possibleDuplicateOf,
    });
  }

  return { findings: [...planned.values()], history: [...rows.values()], tally };
};
