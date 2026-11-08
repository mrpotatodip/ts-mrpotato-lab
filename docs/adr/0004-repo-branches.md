# Branches: one History for each line of code

How a Repo tracks more than one branch in `apps/elise-engine-api`. Terms: `apps/elise-engine-api/GLOSSARY.md` (Repo, Branch, One-off Scan, History). This changes two rules of ADR 0002: a Repo no longer has one History, and a Scan of a `ref` can now move one.

## What a Branch is

- **A Branch is its exact name.** `scan_repo_branches` has one row per (Repo, name), and case counts, because git treats `Main` and `main` as two branches. `refs/heads/main` and ` main ` are cleaned to `main` before any match. `HEAD` is a pointer, not a branch, so it has no name.
- **The default is a pointer, not a row.** `scan_repos.default_branch` holds the name that git reported when a Scan with no `ref` cloned the Repo. Typing `main` and discovering `main` are therefore the same Branch by construction. A nameless "default" row would have split the History as soon as someone registered `main` by name, and would have fed a History with the code of another line when GitHub switched the default from `main` to `develop`.
- **A switch is a new Branch.** When the default changes, the new name gets its own Branch with an empty History (if there is a free slot) and the old Branch keeps its History. A rename starts fresh too. This costs continuity, and it never closes a problem against the wrong code. With no free slot, the Scan runs as a one-off Scan.
- **At most 25 per Repo, for now.** The default counts when it is a Branch. Slots are never freed: there is no remove and no disable. A person who does not care about a Branch ignores it. The limit is `REPO_BRANCH_LIMIT`. It guards against runaway growth, not cost: a Scan only checks the Prior findings of the one Branch it reads, so a Branch nobody scans costs nothing. A Repo row is locked while branches are counted, so two requests cannot both pass it.

## How a Scan finds its Branch

- **The clone settles what a ref is.** For a `ref`, the clone fetches `refs/heads/NAME` first and falls back to the name as typed. If the first works the ref is a branch. If not, it is a tag or a commit. A plain `main` would make git read a tag called `main` first (checked with real git: `fetch origin main` returned the tag, `fetch origin refs/heads/main` the branch), so the branch is tried first and wins. The clone writes which one worked (`repo.kind`) and, for a plain clone, the branch git is on (`repo.branch`). No GitHub API call, and no list of tracked Branches is needed to fetch.
- **A successful Scan of a real branch tracks it.** The clone reports a branch name (git's own answer for a plain clone, the `ref` when it was fetched as a branch) or none for a tag, a commit or a detached HEAD. Recording then finds the Branch by name or creates it, if the Repo has a free slot. A name is tracked only after a Scan of it worked, so a typo or a tag cannot use a slot, and a failed Scan tracks nothing. A Scan with no `ref` also moves the Repo's default pointer to the name git reported.
- **A one-off Scan says why.** A Scan that ends with no Branch saves `untracked_reason` on its row: a tag or a commit, a detached HEAD, or no free slot. The dashboard shows it, so a person is never left with 0 Findings and no explanation.
- **Each Scan of a Branch is a normal Branch Scan.** A second Scan to complete a Verdict scans the Branch by name and reads the newest commit. If someone pushed in between, the two Scans read different commits and the Verdict for the newer one is "1 of 2 Scans".
- **A Scan of a commit that is a Branch's latest commit is a Branch Scan.** A full commit id reads no branch name, but when it is the latest commit of exactly one tracked Branch (the commit of that Branch's newest succeeded lite Scan, the `latestCommit` the repo page shows), the Scan read the code that Branch's History is about. It gets that Branch's Prior findings when it launches, and it is recorded on that Branch when it ends, so it moves the History and has a diff. An older commit stays a one-off Scan. A commit that is the latest of two Branches also stays one-off, because one History would have to be chosen, and its reason names both. Either way the Verdict still counts the Scan, because the Verdict is per commit.

## Adding a Repo, and Branches

- `POST /repos` takes a URL and optional branch names. It adds nothing on GitHub's side and checks nothing there: a wrong name is a Branch that fails its Scans, and a wrong URL is a Scan that fails to clone. The same Repo in any spelling is the Repo already there, so adding twice is safe. The Repo and its Branches are saved in one transaction, so a refusal leaves nothing behind. An Account has at most 200 Repos.
- `POST /repos/:repoId/branches` adds one Branch. A name already tracked changes nothing.
- A Repo can exist with no Branch. It shows `defaultBranch: null` until a Scan reads the default.
- **A tag or a commit never becomes a Branch.** A tag is never fetched as a Branch, so a tag name that was added by hand only fails its Scans. A full commit id (40 hex digits) and `HEAD` are refused when a Branch is added. Elise does not ask GitHub whether a name is a branch or a tag.
- **At the limit, the error names the tracked Branches** (409: "A repo can track at most 25 branches; it tracks a, b, c").
- **Scans made before a Branch was tracked stay one-off.** They were not given Prior findings and did not re-check anything, so putting their Findings into a History would start it on unchecked evidence, from a commit that may no longer be the tip. Their Findings stay in the Scan report and still count toward a Verdict. The History starts at the first Scan after tracking. No row is rewritten.

## What the reads show

- **The Repo list shows the default Branch's open counts.** A problem that sits on `main` and `release` would be counted twice if the Branches were added together. The Repo detail shows the counts of each Branch, with `latestCommit`: the commit of its newest succeeded lite Scan, which is the commit to ask a Verdict about.
- **The Verdict does not change.** It is per commit. It reads the Scans of that commit whatever their Branch.
- **A scan diff compares with the previous Scan of the same Branch.** A one-off Scan has no diff.

## Not built

- Removing or disabling a Branch. With a limit of 25 and no way to free a slot, a Repo that reaches it gets one-off Scans for new branches until we add one.
- Checking names against GitHub.
- A branch field in the dashboard form, and a dropdown of branches.
- Starting a new Branch from the open problems of the default Branch. It starts empty.
- Per-Account limits.
