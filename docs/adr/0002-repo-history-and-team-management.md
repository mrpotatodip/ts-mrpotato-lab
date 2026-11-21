# Repo history, and who may manage a team

Two decisions in `apps/elise-engine-api` that the code does not explain by itself. Terms: `apps/elise-engine-api/GLOSSARY.md` (Repo, History, Prior finding, Carried finding, Team, Group).

## Repo history

A second `lite` scan of a Repo started from what the first one left open. No Scan does that now: every new Scan runs the full Skill, moves no History and is given no Prior findings (ADR 0006), and the code that did it was removed (#178). The bullets below say how the older path worked, because its History rows stay as data.

- **Evidence closed a problem.** The agent re-checked each Prior finding. A problem becomes `fixed_by_code` only when the agent says `not_found` and no new finding looks like it (same class and file). Silence and `cannot_tell` leave it `open` and `unchecked`. A history that closed problems by default would report a fixed repo after one scan that ran out of budget.
- **A Carried finding kept its fingerprint.** The fingerprint hashed class, file and the agent's title, so a reworded title would have made a known problem look new. The Worker gave each Prior finding a `priorId` (its fingerprint) and the agent echoed it.
- **Only `lite` scans moved a History.** A profile scan (the full Skill) has its findings recorded in `scan_findings`, from its nested `findings.json`, but it writes no History row and is given no Prior findings. The History is frozen at the end of the lite era, and old rows are never changed.
- **The History is frozen and read for state.** Its rows are kept as data and never changed. A Branch's findings are not read from it: they are the merge of every succeeded Scan of the Branch, made on each read from the Scans' own `scan_findings` (ADR 0004). A finding with a History row takes its state from it (`open`, `fixed_by_code`, `regressed`), and any other finding is `open`. The "not re-checked" flag on a row is no longer read: a finding is "not in the latest Scan" when its last-seen Scan is not the Branch's newest succeeded Scan. A Scan never closes a problem, so only a person's decision or a closure the older path recorded does.
- **One active scan per Repo** is a partial unique index (`uq_scans_active_per_repo`), not a count: two requests cannot both pass. A scan that stalls is expired by the next request, so a dead Workflow never blocks a Repo.
- **The History moved in the batch that recorded the scan.** Nothing writes it now: the record is the scan row and its findings only.
- **A scan with no tracked branch moved no History.** A tag or an old commit is not the code a History is about: its `not_found` would have closed findings of a branch. A tracked branch has its own History: `docs/adr/0004-repo-branches.md`, which replaces the one-History-per-Repo rule of this file.
- **Recording judged the answer against what was asked.** The priors were saved with the scan (`prior-findings.json`) when it launched, and recording read that file. Older Scans still serve both that file and `recheck.json`.
- **Record first, then mark succeeded.** The scan stays running, and its Repo stays blocked, until its findings are saved. If recording fails, the scan fails. A scan that a newer request closed as failed stays failed: later writes from its slow Workflow are refused.
- **At most 50 Prior findings were given, worst first.** Each cost the agent tokens. The rest stayed open in the History and were not asked about, so they were never closed by omission. The Verdict still reads this limit on old rows (ADR 0003).

The lite Skill and its output checker (#141), and the planning, writing and reading of the History and Prior findings (#178), were removed; old lite rows keep the History they wrote.

## Managing a team

`/team` and `/groups` need a signed-in login whose Role holds the route's Power (`company:team:*`). `tenant_admin` and `workspace_admin` hold them; a `workspace_member` holds none. A `workspace_admin` can invite, revoke and run groups, but changing or removing a member stays with the `tenant_admin`. The service token is not accepted.

- Invites record who made them (`invited_by` is NOT NULL) and every change writes an Audit trail row with an actor Party. The service token names no one.
- The dashboard server forwards the user's session for these routes.
- An invite is emailed through a queue. Creating one saves it, then sends a message to `EMAIL_QUEUE` (the Cloudflare queue is still `elise-invite-emails`); the consumer in the same Worker sends it with the `EMAIL` binding (Cloudflare Email Service), retrying with a longer wait each time and then parking it in `elise-invite-emails-dlq`. A queue failure never fails the create, because the answer still holds the token for the admin to share by hand. The message holds the link, so the queue holds a live token until it is sent. A resend is a new invite for the same email, which replaces the old one.
- A `workspace_watcher` (label "Watcher") holds only `company:summary:read`. `requireScanAccess` asks a signed-in login for `company:dashboard:read` on every route behind it except `GET /repos` and `GET /repos/:repoId/findings`, which need `company:summary:read`, so a Watcher reads the Summary page and nothing else, and cannot start a scan, add a repo or triage a finding. The other three roles hold both Powers. The service token is unchanged. The dashboard sends a user's session on these routes, not the token. The migration (`0070_workspace_watcher`) must run before an engine that asks for the Dashboard Power deploys, or every member is refused.
- An invite can never give `tenant_admin`. Roles and Powers are still open, so Groups grant nothing.
