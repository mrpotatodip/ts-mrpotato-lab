# Can this commit ship?

How `GET /repos/:repoId/verdict?commit=<sha>` decides in `apps/elise-engine-api`. Terms: `apps/elise-engine-api/GLOSSARY.md` (Verdict, Accepted risk, Prior finding). Rules in code: `modules/verdict/utils/judge-commit.ts`.

## What a Verdict claims

- **A gate, not a rate.** A percentage of resolved findings hides one critical problem among many fixed low ones. The answer is `pass`, `fail` or `cannot_tell`, with the counts beside it as evidence.
- **Policy, not safety.** A `pass` means the Scans of this commit found nothing over the limit. A Scan cannot prove that no vulnerability exists.
- **One commit.** "Ship" means one version of the code. A Verdict is stale when the branch moves past its commit.
- **Computed on each request, never stored.** It cannot disagree with the Scans and decisions it reads. A stored snapshot is added only when someone must prove later what the Verdict was on ship day.

## When it passes

- **At least 1 succeeded `lite` Scan of the commit** (`VERDICT_MIN_SCANS`). It was 2 until 2026-11-12: one look can miss a problem and the agent differs from run to run. The person reads the Verdict and decides, so one Scan is enough to answer, and a person who wants a second look starts it. A Scan of a ref counts, because the Verdict is about the commit, not the branch. No Scan is `cannot_tell`. EliseLAB spends no tokens unasked.
- **Findings are merged, never averaged.** A problem that any Scan of the commit found is open, at the worst severity any Scan gave it. A second Scan can only make the Verdict stricter. A single `not_found` in the History does not cancel a Finding that another Scan of the same commit saw.
- **Every Prior finding was checked.** In the newest Scan, `priors_unchecked` is 0 and `priors_given` is below 50. At 50 the agent was asked about only the worst 50, so the Verdict cannot tell. Older Scans are not asked: a Scan that ran out of budget must not block a commit that a good Scan has since cleared.
- **Within the limit.** 0 critical, 0 high, at most 3 medium. A problem still `needs_validation` blocks until a person decides it. Low and informational never block. One fixed default for every account; per-account limits wait until someone needs them.

`cannot_tell` wins over `fail`: the over-limit reason is still listed, but the Scans are not trusted yet.

## Decisions by a person

- **Accepted risk** needs a signed-in login whose Role holds `company:findings:accepted_risk:update` (`tenant_admin` and `workspace_admin`; the service token is refused), a reason and 1 to 90 days. The triage row and its Audit trail row are saved in one transaction. A database check forbids `accepted_until` on any other status, and forbids an accepted risk with no reason. `PUT /findings/triage` with any other status cannot set it.
- **Expiry blocks again.** The Verdict lists an expired acceptance as open, with the time it ended.
- **Every decision is audited.** `PUT /findings/triage` with any status saves the decision and an Audit trail row in one transaction (`finding.triage.set`, or `finding.risk.accepted`). The row holds the new decision and the one it replaced. The actor is the signed-in person, or no one when the service token set it.
- **A false positive is dismissed, shown and audited.** It is listed under `dismissed`, so a Verdict is never silent about what a person removed. Today any caller with scan access can mark one, so a `pass` can be reached that way; the list and the Audit trail make it visible. Restricting it to admins is open.
- **A manual `fixed` is ignored.** A Scan of this commit found the problem here, and the Verdict is about this commit.

## Not built

- A CI step or GitHub check. EliseLAB has no GitHub App, so a CI step needs its own design once someone names the pipeline.
- Queuing a second Scan by itself. Raise the minimum (`VERDICT_MIN_SCANS`) only if real Scans show a second one still finds new problems.
