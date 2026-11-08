# Elise Engine API Glossary

The words used by the scan service: a Worker that clones a public GitHub repo into a sandbox, runs an AI security review, and keeps the report. Use these words in route text, tickets and lessons.

## Parts

**Scan**:
One run that clones a repo, audits it with the agent, and saves a report.
_Avoid_: Job, task, run (when you mean the whole thing)

**Scan ID**:
A random UUID that names one scan and its sandbox, and is the folder name in the R2 bucket.
_Avoid_: Job ID, request ID

**Worker**:
The Cloudflare program in `src/index.ts` that receives HTTP requests and starts scans.
_Avoid_: Server, backend, API

**Sandbox**:
One Durable Object plus the container it starts, used for exactly one scan (class `ScanSandbox`).
_Avoid_: VM, box

**Durable Object**:
A named Cloudflare object with its own storage that controls the container for one scan.
_Avoid_: Actor, session

**Container**:
A Linux machine that starts from the image and runs the agent.
_Avoid_: Docker, VM, pod

**Image**:
The frozen file system a container starts from, built from the Dockerfile.
_Avoid_: Docker image (say "image"), snapshot

**Instance type**:
The size of a container: vCPU, memory, and disk. We use `standard-1`.
_Avoid_: Plan, tier

**R2 bucket**:
The Cloudflare storage that holds each scan's saved files.
_Avoid_: Database, S3

## The agent

**Agent**:
The Claude Code program that runs inside the container and reads the repo.
_Avoid_: Bot, AI

**Skill**:
A folder of written instructions the agent follows. We have `lite` and `full`.
_Avoid_: Prompt, plugin

**Step**:
Where a running Scan is: `cloning`, `auditing` or `saving`. It is null when the Scan has not started or has ended.

**Usage**:
What a Scan spent: tokens, a cost estimate, turns and duration. The Agent reports it when it ends; a Scan that fails after the Agent started keeps it.

**Scan file**:
A file a Scan saved. Its bytes are in R2; its row in `scan_files` (Neon) holds the name, size and R2 key.

**Report**:
The `REPORT.md` file the agent writes for people to read.
_Avoid_: Output, result

**Repo**:
One repo an Account scans, kept once per Account (`scan_repos`) however its URL was typed: `owner/name` in lowercase, without `.git` or a trailing slash. It can be added without a Scan. Its Scans, Branches and decisions hang off it. An Account has one active Scan per Repo and at most 200 Repos.
_Avoid_: Project, target

**Branch**:
A line of code of a Repo that has a History of its own (`scan_repo_branches`). It is known by its exact name, and case counts, so `main` typed and `main` read from GitHub are one Branch. A Repo tracks at most 25. Any real branch becomes a Branch when a Scan of it succeeds and the Repo has a free slot, or when a person adds it. The Repo's default branch is a pointer (`default_branch`) to the name git last reported, not a row. A new Branch starts with an empty History.
_Avoid_: Ref (a ref can also be a tag or a commit)

**One-off Scan**:
A Scan that ends with no Branch: its `ref` is a tag or a commit, the clone was on a detached HEAD, or the Repo has no free slot. It records its Findings and can count toward a Verdict, but it has no Prior findings and no History, and it saves the reason (`untracked_reason`). A `ref` is fetched as a branch first (`refs/heads/NAME`), so a tag with the same name as a branch is never read by mistake.

**History**:
Where a Branch's problems stand across its Scans (`scan_repo_findings`), one row per fingerprint, with the Scan that first and last saw it. The state is `open`, `fixed_by_code` (a Scan checked and it was gone) or `regressed` (it was fixed and came back). Only a succeeded `lite` Scan of a tracked Branch changes it, and only inside the transaction that records the Scan.

**Prior finding**:
An unresolved problem from the History that the Worker hands the agent (`prior-findings.json`, at most 50, worst first) to re-check before it hunts for new ones. Its `priorId` is its fingerprint. The list is saved with the Scan (`prior-findings.json`), and the answer is judged against it. A one-off Scan gets none. Resolved means fixed by code, or marked fixed, false positive or accepted risk by a person.

**Carried finding**:
A Prior finding the agent re-checked and still saw. It is repeated in the Scan's `findings.json` with its `priorId` and keeps its fingerprint, so a reworded title does not make it new. A Prior the agent did not answer for stays open and `unchecked`: a problem is closed only by evidence, never by silence.

**Verdict**:
The answer to "can this commit ship?": `pass`, `fail` or `cannot_tell`. It belongs to one commit and is computed on each request from the Scans of that commit. `pass` means the Scans found nothing over the limit, never that the commit is safe. `cannot_tell` means the Scans cannot be trusted yet (fewer than 2, or a Prior finding left unchecked). Only `pass` ships.
_Avoid_: Acceptance rate, score, safe

**Accepted risk**:
A Finding that a signed-in `tenant_admin` chose to ship with. It has a reason, a name in the Audit trail and an end date of at most 90 days. The Verdict lists it until the end date, and after that it blocks again.
_Avoid_: Waiver, exception

**Finding**:
One security problem in `findings.json`, with a status of `confirmed` or `needs_validation`.
_Avoid_: Bug, issue, vulnerability (until a person checks it)

**Detached run**:
Starting the agent in the background with its output in files, then polling for its exit code.
_Avoid_: Async run

## Safety and cost

**Outbound handler**:
Worker code that sees every network request the container makes and decides to block it or pass it on.
_Avoid_: Proxy, firewall

**Allowlist**:
The short list of hosts the container may reach: `github.com` and `api.anthropic.com`.
_Avoid_: Whitelist

**Secret**:
A value stored in the Worker, not in git, such as `ANTHROPIC_API_KEY` or `SCAN_API_TOKEN`.
_Avoid_: Env var (an env var is not always secret)

**Budget cap**:
The most dollars the agent may spend in one scan (`--max-budget-usd`). The ceiling is `MAX_BUDGET_USD`.
_Avoid_: Limit, quota

**Effort**:
How hard the agent thinks: `low`, `medium`, `high`, `xhigh`, or `max`.
_Avoid_: Quality, depth

## Ambiguities

- "Sandbox" means the Durable Object and the container together. "Container" means the Linux machine only.
- A finding is not a confirmed vulnerability until a person checks it.

**Account**:
The customer that owns scans. In the database an Account is a Tenant row, and the Account ID is the Tenant's UUID. The dashboard server sends it in the `x-account-id` header, taken from the signed-in session.
_Avoid_: user, org

**Tenant**:
The database row of an Account (`tenants`). It belongs to one Party. Scans, Findings and team invites carry its ID.

**Team**:
Everyone who holds a Role in an Account, plus the invites still waiting. A `tenant_admin` manages it.
_Avoid_: Members list (when you mean the whole Team), Group

**Team invite**:
An email, a Role and a one-time link that lets one person join an Account. The Worker sends no email: the admin shares the link. Only the hash of its token is stored. It lasts 7 days, works once, and a new invite for the same email replaces the old one. It can never give `tenant_admin`.
_Avoid_: Invitation, invite code (an invite code starts a whole new Account: `platform_invite_codes`)

**Group**:
A named set of people in one Account, for example "Backend". It grants nothing: Powers still come from a Role. Names are unique per Account, ignoring case. Losing the Role in the Account removes the person from its Groups.
_Avoid_: Team (the Team is the whole roster), squad

**Audit trail**:
`access_audit_log`. It holds Team invite and Group changes with the actor's Party, and the Tenant in `after`.

**Party**:
Any actor that the system knows. Its type is a row in `party_master_types`: a Person or an Organization.

**Person**:
A Party of the type `person`. It has a first name and a last name (`party_persons`).

**Organization**:
A Party of the type `organization`. It has one name (`party_organizations`).

**Login**:
A way to sign in (`auth_user`). It belongs to one Party. Its `name` column always has a value; first and last name exist only for a Person.

**Service token**:
The secret `SCAN_API_TOKEN`. Only a server holds it, and every `/scans` route needs it as a bearer token.
_Avoid_: API key, password
