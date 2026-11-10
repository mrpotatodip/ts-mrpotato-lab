# Repo history, and who may manage a team

Two decisions in `apps/elise-engine-api` that the code does not explain by itself. Terms: `apps/elise-engine-api/GLOSSARY.md` (Repo, History, Prior finding, Carried finding, Team, Group).

## Repo history

A second scan of a Repo starts from what the first one left open.

- **Evidence closes a problem.** The agent re-checks each Prior finding. A problem becomes `fixed_by_code` only when the agent says `not_found` and no new finding looks like it (same class and file). Silence and `cannot_tell` leave it `open` and `unchecked`. A history that closed problems by default would report a fixed repo after one scan that ran out of budget.
- **A Carried finding keeps its fingerprint.** The fingerprint hashes class, file and the agent's title, so a reworded title would make a known problem look new. The Worker gives each Prior finding a `priorId` (its fingerprint) and the agent echoes it.
- **Only `lite` findings are recorded**, so only `lite` scans have a History, a diff and priors. Wiring in `full` needs its nested `findings.json` mapped to rows first.
- **One active scan per Repo** is a partial unique index (`uq_scans_active_per_repo`), not a count: two requests cannot both pass. A scan that stalls is expired by the next request, so a dead Workflow never blocks a Repo.
- **The History moves in the batch that records the scan.** A failed scan, or a skill whose findings are not recorded, never changes it (`buildScanRecordSvc` enforces this, not its caller).
- **A scan with no tracked branch moves no History.** A tag or an old commit is not the code a History is about: its `not_found` would close findings of a branch. Its findings are recorded and it gets no priors. A tracked branch has its own History: `docs/adr/0004-repo-branches.md`, which replaces the one-History-per-Repo rule of this file.
- **Recording judges the answer against what was asked.** The priors are saved with the scan (`prior-findings.json`) when it launches, in a step of their own, and recording reads that file. Recomputing them from the database would give a different list after a retry or a triage change.
- **Record first, then mark succeeded.** The scan stays running, and its Repo stays blocked, until its findings and History are saved. If recording fails, the scan fails. A scan that a newer request closed as failed stays failed: later writes from its slow Workflow are refused.
- **At most 50 Prior findings, worst first.** Each costs the agent tokens. The rest stay open in the History and are not asked about, so they are never closed by omission.

Rules in code: `modules/scan-records/utils/plan-history.ts`. How to check the agent follows them: `skills/security-audit-lite/validate-output.cjs`.

## Managing a team

`/team` and `/groups` need a signed-in login whose Role holds the route's Power (`company:team:*`). `tenant_admin` and `workspace_admin` hold them; a `workspace_member` holds none. A `workspace_admin` can invite, revoke and run groups, but changing or removing a member stays with the `tenant_admin`. The service token is not accepted.

- Invites record who made them (`invited_by` is NOT NULL) and every change writes an Audit trail row with an actor Party. The service token names no one.
- The dashboard server forwards the user's session for these routes.
- An invite is emailed through a queue. Creating one saves it, then sends a message to `INVITE_EMAIL_QUEUE`; the consumer in the same Worker sends it with the `EMAIL` binding (Cloudflare Email Service), retrying with a longer wait each time and then parking it in `elise-invite-emails-dlq`. A queue failure never fails the create, because the answer still holds the token for the admin to share by hand. The message holds the link, so the queue holds a live token until it is sent. A resend is a new invite for the same email, which replaces the old one.
- An invite can never give `tenant_admin`. Roles and Powers are still open, so Groups grant nothing.
