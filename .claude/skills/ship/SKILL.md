---
name: ship
description: Ship the current branch — commit staged changes, push, and open a GitHub PR in one pass, using this repo's `{app}: {change}` commit/PR title convention and checking for an already-open PR before creating a new one. Use when the user wants to commit and push their changes, open/create a pull request, or ship a branch.
---

# Ship

Invoking this skill is itself the user's authorization to commit, push, and open the PR without pausing for confirmation between steps — the base git safety rules (no `-A`/`.` staging, no force-push, no `--no-verify`, HEREDOC commit messages, co-author trailer) still apply throughout.

## 1. Survey

Run `git status`, `git diff` (staged + unstaged), and `git log --oneline -10` in parallel. Confirm the current branch and whether it already tracks a remote.

Completion: you can state which files are staged, unstaged, and untracked, and whether the branch has an upstream.

## 2. Stage

Stage only the files relevant to this change, by name.

Completion: `git status` shows exactly the intended files staged, nothing more.

## 3. Commit

This repo's title convention (from `git log`): `{app-or-apps}: {change}` — apps slash-joined when more than one is touched (e.g. `elise-frontend-web/elise-engine-api: ...`), lowercase, no trailing period, focused on why over what. Draft the message from the staged diff.

If nothing is staged and the branch has no unpushed commits, skip to step 5 — there's nothing to commit or push, only a possible existing PR to report.

Completion: commit created.

## 4. Push

Push the branch; if it has no upstream yet, push with `-u origin <branch>`.

Completion: local branch is up to date with its remote counterpart.

## 5. PR

Check first whether an open PR already exists for this branch: `gh pr list --head <branch> --state open`. If one exists, stop here and report its URL — do not open a duplicate. Otherwise create one with `gh pr create`, title in the same `{app}: {change}` convention as commits.

Completion: exactly one open PR exists for the branch, and its URL has been reported to the user.
