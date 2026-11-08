---
name: security-audit-lite
description: Fast, low-cost, single-agent source security review of a repository. Use for a quick first-pass audit that writes REPORT.md and findings.json. No sub-agents, no code execution, no coverage ledger. Use security-audit instead for a full, verified audit.
---

# Security Audit Lite

A bounded, read-only, single-agent review. It finds likely vulnerabilities from source and states plainly what it did not check. It is a first pass, not proof of safety.

## Rules

- Work alone. Do not launch sub-agents.
- Read source only. Do not build, run, install, or test the target. Do not use the network.
- Never modify the target. Write only to the output directory you were given.
- Keep reads small: triage with `rg` first, then read only the files a hit points to. Read at most about 40 files in full.
- Skip `node_modules`, `vendor`, `dist`, `build`, lockfiles, minified or generated files, fixtures, and test files, except to check whether a test file contains a real secret.

## Steps

Follow them in this order.

### 0. Prior findings (only if the prompt names a `prior-findings.json`)

The file lists findings that earlier scans of this repository left unresolved, each with a `priorId`. Check each one first, against the current source: read the cited file and trace the same path.

- Still there: keep it in `findings.json` as a full item with `"priorId"` set to its `priorId`. Update `location` and `evidence` to what the code shows now.
- Gone (the code changed, or the path is no longer reachable): add `{ "priorId": "...", "result": "not_found" }` to `recheck.json`.
- You cannot tell: add `{ "priorId": "...", "result": "cannot_tell" }` instead.

Never report a prior again as a new item under another title. Keep this to a few reads each, then spend the rest of your reads on steps 1 to 4 for new problems.

### 1. Orient (about 5 minutes of reading)

Read the README, the manifest (`package.json`, `pyproject.toml`, `go.mod`, ...), and the directory tree. Write down in one line each: what the project is, its entry points (routes, handlers, CLIs, queues, webhooks), and where untrusted input enters.

### 2. Triage with `rg`

Run each search once. Record hits, not conclusions.

| Class | Look for |
|---|---|
| Injection | string-built SQL; `exec`, `spawn`, `system`, `eval`, `Function(`, template rendering of user input; `innerHTML`, `dangerouslySetInnerHTML` |
| Authn/authz | route or handler definitions with no auth check nearby; ID taken from request params used to fetch a record without an owner or tenant check; role checks done client-side only |
| Secrets | keys, tokens, passwords, private keys, `.env` files committed, credentials in config or CI files |
| SSRF / path traversal | server-side `fetch` or HTTP calls with a user-controlled URL; `readFile`, `open`, `sendFile`, archive extraction with a user-controlled path |
| Crypto / sessions | MD5 or SHA1 for passwords, hardcoded JWT secrets, `alg: none`, missing cookie flags, `Math.random` for tokens, disabled TLS verification |
| Deserialization | `pickle`, `yaml.load`, `unserialize`, `ObjectInputStream`, `JSON.parse` feeding dynamic dispatch |
| Config / CI / deps | wildcard CORS with credentials, debug mode in production config, GitHub Actions using `pull_request_target` or untrusted input in `run:`, unpinned or known-bad dependencies, Dockerfiles running as root with exposed secrets |

Skip a class that clearly does not apply (no server, no database, and so on) and say so in the coverage section.

### 3. Verify each hit by reading the code

For every hit that looks real, read the surrounding function and trace the input from where it enters to where it is used. Keep a finding only if you can state all of:

- who the lower-trust actor is (for example an unauthenticated user, or a user in tenant A);
- what input or action they control;
- which control should stop them, and why it does not;
- the concrete result (data exposed, code run, account taken over, record changed).

Drop anything that is only a missing best practice, self-impact, a test file, or something you are guessing about deployment. If a decisive fact lives outside the repository (a proxy, a cloud policy, an environment setting), record it as `needs_validation` with the exact missing fact. Give it no severity.

### 4. Rate severity

Only `confirmed` findings get a severity.

- **critical**: an unauthenticated actor gets code execution, full data access, or takes over arbitrary accounts.
- **high**: an actor fully defeats an explicit control with real consequences (authentication bypass, cross-tenant read or write, stored script execution against other users, authenticated code execution).
- **medium**: a real boundary violation with limited blast radius or uncommon preconditions.
- **low**: disclosure of non-secret internals, or a flaw needing sustained effort for little gain.
- **informational**: confirmed but minimal impact.

If you cannot state the concrete damage, rate it lower than it feels.

### 5. Write the outputs

Write the files to the output directory.

**`findings.json`** is a JSON array. Each item has exactly these fields:

```json
{
  "id": "F-001",
  "status": "confirmed",
  "severity": "high",
  "title": "short title",
  "class": "injection | authz | secrets | ssrf | path-traversal | crypto | deserialization | config | supply-chain | other",
  "location": [{ "file": "src/routes/user.ts", "line": 42 }],
  "actor": "who exploits it",
  "impact": "concrete result",
  "evidence": "the relevant code, quoted briefly, and the traced path",
  "fix": "the smallest source change that enforces the control",
  "needs": null
}
```

- `status` is `confirmed` or `needs_validation`.
- `severity` is `null` unless `status` is `confirmed`.
- `needs` is `null` for confirmed findings. For `needs_validation` it is the exact missing fact.
- Number ids `F-001`, `F-002`, ... in order of severity, most severe first. Order within a severity by file path.
- `priorId` is present only on an item that re-reports a prior finding (step 0). New items leave it out.
- Write `[]` if there are no findings. Do not invent findings.

**`recheck.json`** is written only when there was a `prior-findings.json`. It is a JSON array of `{ "priorId": "...", "result": "not_found" | "cannot_tell" }`, one entry for each prior that is not in `findings.json`. Write `[]` if every prior is still there.

**`REPORT.md`** has exactly these sections in this order:

1. `# Security review: <repo name>`
2. `## Summary`: a count of findings per severity and per `needs_validation`, plus one sentence on the overall picture.
3. `## Findings`: one subsection per finding, ordered like `findings.json`, with the fields above in prose.
4. `## Needs validation`: findings that depend on facts outside the repository.
5. `## Coverage`: the classes you searched, the classes you skipped and why, the number of files read, and the directories you excluded.
6. `## Limits`: state that this was a single-agent, read-only, source-only first pass, and that an empty or short list of findings is not proof the code is safe.

The prose and the JSON must agree. Write the JSON first and derive the report from it.

### 6. Finish

Run `node ~/.claude/skills/security-audit-lite/validate-output.cjs <output directory>`, and add the path of `prior-findings.json` as a second argument when there was one. It prints `ok` or one line per problem. Fix every problem it lists, run it again until it prints `ok`, and check that `REPORT.md` exists. Then stop. Do not start a second pass.
