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
