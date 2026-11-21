# EliseLAB Engine API Glossary

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
One Durable Object plus the container it starts, used for exactly one scan (class `FullScanSandbox`).
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
A folder of written instructions the agent follows. We have one, `full`. Every new Scan runs it, a Runner Scan included, whatever the request sent; the Profile sets how much it covers, not the Skill. `lite` was the first Skill and is gone from the code (#141, #178); it stays only as a value, with its display name, in old rows. Nothing starts, records or writes the History for a Scan of it.
_Avoid_: Prompt, plugin

**Profile**:
How much audit a Scan is asked for: `quick`, `standard` or `deep` (the dashboard says Focused, Balanced and Exhaustive). It sets the Scan's Budget cap (`SCAN_PROFILE_CAPS_USD`) and its Verdict weight. No Profile means `quick`. ADR 0006 holds the caps.
_Avoid_: Tier, level, Effort (how hard the agent thinks), Skill

**Step**:
Where a running Scan is: `cloning`, `auditing` or `saving`. It is null when the Scan has not started or has ended. A full Scan is in the `auditing` Step through all four of its Phases: a Phase is a part of the audit, never a Step.
_Avoid_: Phase (a Phase is one of recon, hunt, check or report)

**Trace**:
The ordered list of Trace entries of one Scan, kept for as long as the Scan. It tells a person what kind of work the agent is doing, never what it read or wrote.
_Avoid_: Activity (the dashboard uses that for the per-day Scan count), log, event stream

**Trace entry**:
One line of a Trace: a label such as Reasoning, Reading files, Searching, Running a command or Writing, or the start or end of a Phase. Consecutive entries with the same label merge into one with a count and a time span. It holds no text, path, pattern, command or tool result from the agent. A Trace entry is never a Step, and a Phase is never a Trace entry.
_Avoid_: Event, log line

**Phase**:
One of the four runs of a full Scan, in order: `recon`, `hunt`, `check` and `report`. In the cloud each is a Detached run; on a Runner each is a run of `claude` that the app starts. A Runner Scan has Phases too, on the Phase prompts the engine puts in its job (`phasePrompts`). They share the one Pool, and no Phase has a share of its own. Each has its own time slot (10, 45, 25 and 10 minutes). The one repair run that a Runner starts when the validators fail after `check` is not a Phase: it has a 5-minute slot of its own and spends from the same Pool. Only a full Scan has Phases; a lite Scan is one run, and so is a Runner Scan whose job carries no Phase prompts (an older engine). ADR 0006 holds the rules.
_Avoid_: Step (that is cloning, auditing or saving), stage

**Runner**:
A program on a person's computer (`apps/elise-runner-cli`) that claims a Scan and runs it there: it clones the repo (or unpacks the Archive of an Upload app, which only a Runner that reports it can read), runs `claude` on the person's own login under its own permission rules, and sends back what the agent wrote. There are two: the desktop app (a window and a tray) and the headless Runner (`elise-runner`, a command line for a server or a terminal, on macOS and Linux). Both run Scans through one shared core (`elise-runner-core`), so a Runner Scan behaves the same whichever runs it. To Elise a headless Runner is a Runner like any other: it shows in the Runners list and is picked in the dashboard the same way. A Runner gets its Runner token one of three ways: a Runner login (the headless Runner's `elise-runner login`, approved on the dashboard), a pairing code (`pair <code>`, and the desktop app's Add a Runner), or `ELISE_RUNNER_TOKEN` set from outside, for CI and containers. On one computer the two are two Runners, each holding its own token (separate keychain entries), and neither reads or changes the other's. A Runner Scan takes no credit. It has no server meter: the Runner holds the Pool itself, through the agent's own `--max-budget-usd`. ADR 0006 holds the rules.
_Avoid_: Worker (that is the Cloudflare Worker), agent (that is the program it starts), CLI (a headless Runner is a Runner, not a separate kind of thing)

**Runner login**:
How a headless Runner is connected from the terminal with no code to copy: `elise-runner login` starts a login with the engine (`POST /runners/login/start`), which returns a user code, a link to the dashboard's `/device` page and a device code. A signed-in member opens the link, sees the computer's name, OS, CPU, version and the IP that asked, picks an Account and a Runner name, and approves or denies. The Runner checks (`/runners/login/check`) until it is approved, then collects its own Runner token, once. It never holds a person's session. The user code and the device code are stored as hashes, both work once and both expire after 10 minutes (`RUNNER_LOGIN_TTL_MS`). A check sooner than the interval (5 seconds) is answered `slow_down` and lengthens the interval it must keep, as RFC 8628 says. Starts are limited per IP and in total. A login is in one state: `pending`, `approved`, `denied` or `collected`, and an expired one is read as `expired`. Approving writes an Audit trail entry and the Runners list shows who added the Runner. `pair <code>` and `ELISE_RUNNER_TOKEN` stay for CI and containers. ADR 0007 holds the reason.
_Avoid_: device login (a login of a person from a device is a different thing, and is not built), session (a Runner never gets one)

**Stopped Scan**:
A Scan a person ended on purpose before it finished, from the dashboard: by stopping it, or by removing the Runner that runs it. It is not a failure and not a Partial Scan: it keeps no Report and no findings, weighs 0 in a Verdict and adds nothing to a Branch. A cloud Scan is charged what was metered up to the stop; a Runner Scan takes no credit.
_Avoid_: Cancelled Scan, aborted Scan, killed Scan

**Partial Scan**:
A profile Scan (any Profile) that ran out of money while the Skill could still write its files, so it ended with a Report that starts `PARTIAL: money ran out;` and a findings file, both naming the units it did not cover. Only money sets the flag: a Scan is partial when the Report's first line is that Skill line, a ledger unit holds `money_exhausted`, or `run-metadata.json` says `incomplete_reason: "money_exhausted"`. Any other first line that starts with `PARTIAL:` (the agent could not verify something, say) does not make a Partial Scan, on a Runner or in the cloud. It is charged only what was metered. It is not a failed Scan. It weighs 0 in a Verdict (whatever its Profile), and its findings still count as open. It is not given a Profile check, so it stores no `profile_met` (null), apart from the `partial` flag, which says only that money ran out. A Scan that spends its whole Budget cap with no Report fails instead.
_Avoid_: Incomplete, failed Scan

**Profile check**:
What the engine says a succeeded Runner Scan did, against the Profile it asked for: `met` (it did that Profile's work), `lesser` (it did the work of a smaller Profile, which is named) or `unmet` (it did the work of none). It is a pure function of the files the agent wrote (`coverage-ledger.json`, `run-metadata.json`, `findings.json`), `checkRunnerProfile`, and reads the one table in the `scan-records` constants (`SCAN_RECORDS_PROFILE_CHECK_ROWS`: each row names its requirement, file and field). A Profile requires its rows and those of every smaller Profile, so a result is never raised above what the files show. The files are the agent's own account: the check measures what the agent says it did, and no file proves a sub-agent was fresh. A ledger the agent could not have written honestly (a verifier recorded on a unit with no wave or no owner, an attempt out of order, a critic pass after a wave that never ran) is `unmet`. A Partial Scan (money ran out) is not checked, and a cloud Scan is not checked. The result is stored as `profile_met` on the Scan row, set with the findings of a succeeded Runner Scan (a Scan whose params carry a `runnerId`): `met` stores the profile asked for, `lesser` stores the smaller profile, `unmet` stores `none`, and a Scan that was not checked (a cloud Scan, a Partial Scan, a Scan that did not succeed, an old row) stores null, which reads as today. It is plain text, not a database enum, and the Scan's response carries it as `profileMet`. A unit a Focused run defers on purpose (`quick_profile_final_critic`) never counts against Focused, and counts as proof that its critic pass ran. A verification shortfall is `run_status: "incomplete"` with `incomplete_reason: "verification_unavailable"`, which fails the Profile check (never `money_exhausted`, never a `PARTIAL:` line). Rows that need a fact only the edited Skill records (`critic_passes` and `final_verifiers` in `run-metadata.json`) are not shown by a Scan from an app built before that change, which therefore reads `lesser` or `unmet` for that reason, until the Runner app is rebuilt. Left out of the table, because no file shows them: that each of the Skill's six phases ran, an independent second pass over units covered in a prior run (a Runner Scan has no prior run), and that a sub-agent was a fresh one. "Coverage" is not the word for this check: the dashboard's Coverage control picks the Profile, and the coverage ledger is a list of units.
_Avoid_: Coverage check, coverage

**Full worker**:
The only path a Scan takes, since each runs the `full` Skill: its own Workflow, its own Sandbox class and its own Image, inside the Worker. It has limits of its own. Every Scan on it has a Profile, records its findings with the Scan and writes no History. ADR 0006 holds the decisions.
_Avoid_: Full server, second Worker (it is one Worker with two paths)

**Usage**:
What a Scan spent: tokens, a cost estimate, turns and duration. The Agent reports it when it ends; a Scan that fails after the Agent started keeps it.

**Scan file**:
A file a Scan saved. Its bytes are in R2; its row in `scan_files` (Neon) holds the name, size and R2 key.

**File**:
An entry in the Account's Files list (`GET /files`): one of the written Scan files (`REPORT.md`, `FINDINGS-DETAIL.md`, `NEEDS-VALIDATION.md`) with the Repo, Branch and Scan it came from. The machine-readable Scan files are not listed there.
_Avoid_: Document, upload (no one uploads a File; the zips of an Upload app are Archives)

**Report**:
The `REPORT.md` file the agent writes for people to read.
_Avoid_: Output, result

**Repo**:
One source of code an Account scans, kept once per Account (`scan_repos`) however its address was typed. It is known by Provider, host and path, so a GitLab `acme/app` is never the GitHub `acme/app`: the path is lowercase, without `.git` or a trailing slash, and the host is lowercase (`github.com` for GitHub, none for an Upload app). It can be added without a Scan. Its Scans, Branches and decisions hang off it. An Account has one active Scan per Repo and at most 200 Repos, an Upload app included.
_Avoid_: Project, target

**Provider**:
Where the code of a Scan comes from: `github`, `gitlab`, `gitlab-sh` or `upload`. The user picks it first, and each Provider is its own flow with its own address or file rules, contract schemas and dashboard screens. Core knows only the `SourceProvider` port and one registry, and lint fails when core reads a Provider's folder or one Provider reads another. A request with no `provider` means `github`. On a Runner the clone happens on the user's computer with their own git login, so EliseLAB stores no token for any Provider. `gitlab-sh` takes only hosts the user listed in their own Runner settings: a host that only the job names is refused. ADR 0008 (git providers) holds the rules.
_Avoid_: Source (too loose), host (that is the server inside an address)

**Git login**:
The credentials the git on a Runner's computer already holds for a host (a credential helper, the keychain, or a token the person sets for a headless Runner). A Runner clones with it, so a private repo or a locked GitLab server works when the person's own git can read it. EliseLAB never sees or stores it. A public repo needs none, though a saved login that the host rejects can still fail a public clone.
_Avoid_: Connection, token (that is the Runner token)

**Upload app**:
A named app whose code comes from zips the user uploaded, not from a git host: a Repo with Provider `upload`, the name as its path, no host and one hidden Branch named `upload`. The name is unique inside an Account. All its zips are versions of the same code and share one History, with the Archive's content hash standing in for the commit.
_Avoid_: Project, upload (as a noun for the zip: that is an Archive)

**Archive**:
One stored zip of an Upload app: an ID, a label, its R2 key under the Account, size, content hash and upload time. A Scan of an Upload app reads one Archive, chosen by ID, and a link row records which. An Archive can be scanned many times or never. Limits: 50 MB zipped, 250 MB unpacked, 20,000 files, 20 path levels, 20 per app and 500 MB per Account. One no Scan has read is deleted 30 days after upload. Removing an Archive or an app deletes its files and rows, and past Scans stay in the History with a note that the file is gone. The server serves the zip only to the Runner that claimed that job.
_Avoid_: Upload (the act), bundle, snapshot

**Branch**:
A line of code of a Repo (`scan_repo_branches`). It is known by its exact name, and case counts, so `main` typed and `main` read from GitHub are one Branch. A Repo tracks at most 25. Any real branch becomes a Branch when a Scan of it succeeds and the Repo has a free slot, or when a person adds it. Its findings are the merge of every succeeded full Scan of the Branch, of any profile and age: one finding per fingerprint, with the words of the newest Scan that saw it, first seen at the oldest Scan and last seen at the newest. An old `lite` Scan adds nothing, because its fingerprints are made another way. A Scan never closes a problem, so one the latest Scan did not see stays open and is "not in the latest Scan" (ADR 0004). The latest Scan is the newest one with a Verdict weight: a Partial Scan, a Scan that met no profile and an older full Scan whose findings were never recorded are never the latest Scan. A Scan never reopens a problem either: one that the History closed stays closed, and a person's decision, `fixed` included, stands, even when a later Scan sees the problem again. The Repo's default branch is a pointer (`default_branch`) to the name git last reported, not a row.
_Avoid_: Ref (a ref can also be a tag or a commit)

**One-off Scan**:
A Scan that ends with no Branch: its `ref` is a tag or a commit that is not the latest of exactly one tracked Branch, the clone was on a detached HEAD, or the Repo has no free slot. It records its Findings and can count toward a Verdict, but it adds nothing to any Branch's findings, and it saves the reason (`untracked_reason`). A `ref` is fetched as a branch first (`refs/heads/NAME`), so a tag with the same name as a branch is never read by mistake.

**History**:
What the older `lite` Scans recorded about a Branch's problems (`scan_repo_findings`), one row per fingerprint. The state is `open`, `fixed_by_code` (a Scan checked and it was gone) or `regressed` (it was fixed and came back). It is frozen: no Scan writes it any more and its rows are never changed. It is read for state only: a Branch's finding that has a History row takes its state from it, even when a later Scan saw the problem again. Any other finding is `open`. The Branch's findings, not the History, are what the pages list and count (see Branch). The "not re-checked" flag stored on its rows is no longer read.

**Prior finding**:
An unresolved problem from the History that the older `lite` Scans were handed (`prior-findings.json`, at most 50, worst first) to re-check before they hunted for new ones. Its `priorId` is its fingerprint. No Scan is given any now (#178): the step that read them and the code that judged the answer are gone. It survives in old rows: a Scan's `priors_given`, `priors_carried`, `priors_closed` and `priors_unchecked` columns, which the Verdict still reads, and the two saved files, which an old Scan still serves.

**Carried finding**:
A Prior finding that the agent re-checked and still saw. It was repeated in the Scan's `findings.json` with its `priorId` and kept its fingerprint, so a reworded title did not make it new. A Prior the agent did not answer for stayed open and `unchecked`: a problem was closed only by evidence, never by silence. Only old rows hold one (`origin` `carried`).

**Verdict**:
The answer to "can this commit ship?": `pass`, `fail` or `cannot_tell`. It belongs to one commit and is computed on each request from the Scans of that commit. `pass` means the Scans found nothing over the limit, never that the commit is safe. `cannot_tell` means the Scans cannot be trusted yet (their Verdict weight is below 1, or a Prior finding was left unchecked). Only `pass` ships.
_Avoid_: Acceptance rate, score, safe

**Verdict weight**:
How much one succeeded Scan adds to the Verdict of its commit: `quick` 1, `standard` 1, `deep` 1, and an old `lite` Scan 1 (`VERDICT_SCAN_WEIGHTS`). The weight is read from the Skill first, so a `lite` Scan weighs 1 whatever its Profile. A Scan with a `profile_met` weighs the profile it MET, not the one it asked for (a lesser Scan weighs what the smaller profile weighs), and a Scan that met `none` weighs 0. A Scan with no `profile_met` (a cloud Scan, an old row) weighs the profile it asked for. A Partial Scan weighs 0 (checked before `profile_met`), and so does an older full Scan whose findings were never recorded. With every profile at 1, `profile_met` changes only one thing today: `none` weighs 0. A Scan that met `none` is still read: it is listed in the Verdict's `scans.ids` and its findings count as open, so alone it gives `cannot_tell` with the reason `too_few_scans`, not `not_scanned`. A commit has a Verdict when its Scans weigh 1 or more (`VERDICT_MIN_SCANS`).
_Avoid_: Points, score

**Accepted risk**:
A Finding that a signed-in `tenant_admin` or `workspace_admin` chose to ship with. It has a reason, a name in the Audit trail and an end date of at most 90 days. The Verdict lists it until the end date, and after that it blocks again.
_Avoid_: Waiver, exception

**Finding**:
One security problem in `findings.json`, with a status of `confirmed` or `needs_validation`.
_Avoid_: Bug, issue, vulnerability (until a person checks it)

**decision**:
A triage change to a Finding: its status (`open`, `fixed`, `false_positive` or `accepted_risk`) and its note (`scan_finding_triage`). It is not the Finding's own `confirmed` or `needs_validation` state, which the Scan wrote.
_Avoid_: Verdict (that answers a whole commit), status (a Finding has two)

**Comment**:
Plain text a signed-in member wrote about a Finding (`scan_finding_comments`), at most 4,000 characters, kept with its author's Party. It belongs to the Repo and the Finding's fingerprint, so a rescan shows it again. It stays in the database and dashboard, never in the Report, a Scan file or GitHub. Writing one needs the Power `company:findings:comments:create`; the service token cannot.
_Avoid_: Note (the decision has a note), reply

**Discussion**:
The thread of a Finding in the dashboard: its Comments and the decisions people made, oldest first, in a side sheet of its own that the "Discussion" button on each Finding row opens. Reading it needs the Dashboard Power (`GET /findings/comments`), so a Watcher never sees it.
_Avoid_: Chat, conversation

**Detached run**:
Starting the agent in the background with its output in files, then polling for its exit code.
_Avoid_: Async run

## Safety and cost

**Outbound handler**:
Worker code that sees every network request the container makes and decides to block it or pass it on. It also adds the credential the container never holds: the Anthropic key. Git may read only that Scan's own public repo, with no credential (the GitHub App token of ADR 0005 is retired).
_Avoid_: Proxy, firewall

**Allowlist**:
The short list of hosts the container may reach: `github.com` (only the read steps of git) and `api.anthropic.com`.
_Avoid_: Whitelist

**Private Scan**:
A Scan of a private repo. It runs only on a Runner, which clones with the person's own Git login (ADR 0010); the cloud never reads a private repo, and there are no Installs or GitHub App any more (retired, #277). `scans.is_private` and `scan_repos.is_private` are kept for old rows and nothing writes them.
_Avoid_: Authenticated scan, Install

**Secret**:
A value stored in the Worker, not in git, such as `ANTHROPIC_API_KEY` or `SCAN_API_TOKEN`.
_Avoid_: Env var (an env var is not always secret)

**Budget cap**:
The most dollars the agent may spend in one Scan (`--max-budget-usd`), and the one pool that all its Phases spend from. A new Scan's cap is its Profile's cap (`SCAN_PROFILE_CAPS_USD`, provisional). A request may lower it, never raise it. `MAX_BUDGET_FULL_USD` is the ceiling that guards that table for full Scans. A Runner Scan keeps `RUNNER_MAX_BUDGET_USD` as its own ceiling. ADR 0006 holds the rules.
_Avoid_: Limit, quota

**Pool**:
The Budget cap shared by all the Phases of one Scan: no Phase has a share of its own, and nothing moves between Phases. In the cloud the meter holds it. On a Runner the app holds it: each Phase is started with `--max-budget-usd` set to the cap less what the earlier Phases reported in their own results. A Phase that finds the Pool spent does not start, and a Phase the limit stops ends the Scan with the cap-reached error naming that Phase. ADR 0006 holds the rules.
_Avoid_: Budget (a Budget cap is the whole Pool), share, slice

**Monthly budget**:
An optional guard on the dollars an Account may spend on scans in a UTC calendar month: `tenants.monthly_scan_budget_usd`. On a Plan it applies only once an admin with the Power `company:usage:budget:update` sets it, and it counts in credit dollars (cost times the Plan's markup). A new scan is refused with `MONTHLY_BUDGET_EXCEEDED` when spent plus the cap of running scans plus its own cap would pass it. For a full Scan the refusal names the biggest smaller profile whose cap would fit, or says the budget is too low for any profile and what is left. The default monthly budget (`MONTHLY_BUDGET_USD`) no longer applies to a new Scan: a Plan Account has only the admin's override, and an Account with no Plan and no key of its own is refused before the budget is read.
_Avoid_: Quota

**Budget allowance**:
The most an admin may set as the Monthly budget: `tenants.monthly_scan_budget_allowance_usd`, or `BUDGET_ALLOWANCE_USD` (a sanity maximum) when unset. Only the operator changes it. It does not decide what the platform's key may spend: the credit balance does.
_Avoid_: Ceiling (the ceiling of a Budget cap is in its own entry), limit

**Plan**:
What an Account pays for. Two Plans are offered, both paid through Stripe: Starter (`starter`, $15 a month, 2 members) and Runner (`runner`, $35 a month, 5 members). Older rows stay because subscriptions still point to them: Pro (`pro`, $49 a month, $49 of Included credit) and Bring your own key (`byok`, $19 a month, no credit, 300 Scans a month). A Plan is a row of `platform_master_plans` with a monthly price, an Included credit, a credit markup (1.5), a carry cap, a Key source and a member cap. The Plan decides the key: Pro always uses the platform's key and takes credit, Bring your own key needs the Account's own key and takes none. An Account's Plan is its `tenant_subscriptions` row; no row means no Plan. A full Scan on the platform's key needs a Plan (`NO_ACTIVE_PLAN` otherwise, whatever `BILLING_ENFORCED` says); an Account with no Plan that has its own key, and any Runner Scan, runs without one. A `grant` row is a Plan the operator gave, never charged. Solo and Team are disabled rows kept because subscriptions still point to them. This is the subscription, not the Instance type.
_Avoid_: Tier, subscription (for the Plan itself)

**Plan change**:
Moving an Account with an active Stripe Subscription from one Plan to another through `POST /usage/plan/change`. It is refused when the target Plan holds fewer people than the Account has people plus pending invites (the message names the counts), and refused for an Account whose Plan is an operator `grant`. The call only swaps the price in Stripe: the webhook alone changes the Subscription. A first Checkout for a Plan is refused on the same member cap.
_Avoid_: Upgrade, downgrade, switch

**Included credit**:
The dollars a paid period of a Plan adds to the Account's credit balance (`tenant_credit_ledger`, one signed sum of grants, top-ups, holds and charges). A balance may not be pushed past the Plan's carry cap ($100 on Pro) by a grant. A new scan on the platform's key holds its Budget cap times the markup and is refused with `INSUFFICIENT_CREDIT` when the balance is lower; when it ends it is charged its metered cost times the markup. Scans on the Account's own key take no credit.
_Avoid_: Allowance, quota

**Key source**:
Which Anthropic key paid for a scan, `platform` or `account`, kept in `scans.key_source` and set when the scan is accepted. A scan from before the column is `platform`.
_Avoid_: Key type

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
Everyone who holds a Role in an Account, plus the invites still waiting. A `tenant_admin` or `workspace_admin` manages it (a `workspace_admin` cannot change or remove a member).
_Avoid_: Members list (when you mean the whole Team), Group

**Team invite**:
An email, a Role and a one-time link that lets one person join an Account. The Worker emails the link through a queue (`EMAIL_QUEUE`, then Cloudflare Email Service), and the create answer also holds the token so the admin can share the link by hand. Only the hash of its token is stored. It lasts 7 days, works once, and a new invite for the same email replaces the old one. It can never give `tenant_admin`.
_Avoid_: Invitation, invite code (an invite code starts a whole new Account: `platform_invite_codes`)

**Group**:
A named set of people in one Account, for example "Backend". It grants nothing: Powers still come from a Role. Names are unique per Account, ignoring case. Losing the Role in the Account removes the person from its Groups.
_Avoid_: Team (the Team is the whole roster), squad

**Power**:
An action a Role may take, written as a colon path to a leaf of the access catalogue (`@repo/contracts/elise`), for example `company:team:groups:create`. A Role holds exact Powers: no wildcards, and a parent path grants nothing below it. A route asks for one and the Role's grants decide.
_Avoid_: Permission, scope

**Watcher**:
A login whose Role is `workspace_watcher`: it holds only `company:summary:read`. It sees the Summary page and nothing behind the Dashboard Power, so it cannot read a Scan, a Discussion or a Verdict.
_Avoid_: Viewer, guest

**Audit trail**:
`access_audit_log`. It holds every kind of change an Account makes to itself, each with the actor's Party and the Tenant in `after`: Team invites, Groups, triage decisions (`finding.triage.set`, `finding.risk.accepted`), comment deletes (`finding.comment.deleted`), the monthly budget and the Anthropic key.

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
