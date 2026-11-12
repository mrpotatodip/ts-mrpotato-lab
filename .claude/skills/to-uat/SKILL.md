---
name: to-uat
description: "Merge the open work branches into one throwaway UAT branch and check them together before their PRs pass CI."
disable-model-invocation: true
---

The **UAT branch** is a throwaway branch that holds several work branches merged together, so one check and one hand test cover all of them while each PR waits on CI. It is never a PR source and never deployed.

## Rules

- Each work branch keeps its own PR, cut from `main`.
- Merge work branches into the UAT branch; the flow runs one way.
- Rebuild from `main` every time with `git checkout -B uat main`; discard the old one.
- Fix every bug on the work branch that owns it, then merge that branch in again.
- Name it `uat`; `scripts/lint-branch-name.mjs` exempts it, as it does `main`.
- Make `uat` a plain branch in the main checkout, with no worktree of its own.
- The UAT branch stays local. Deploys come from merged `main`, after asking the user (`deploy-clean.mjs` rule in `CLAUDE.md`).

## Steps

1. **List the work branches.** Take the branches the user names; when none are named, ask which of the worktrees in `git worktree list` to include. Done when each branch is named with its ticket.
2. **Commit each work branch.** Run `git -C <worktree> status --short`; commit any change on its own branch (the pre-commit hook runs the checks). Done when every worktree is clean.
3. **Rebuild the branch.** In the main checkout, run `git status --short`; a dirty tree stops here, so ask the user to commit or set it aside. Then `git checkout -B uat main`. Done when `uat` points at `main` and is checked out.
4. **Merge.** In the main checkout, `git merge --no-ff -m "Merge <branch>" <branch>` for each work branch. On a conflict, stop and show the user the files and both tickets. Done when every branch is merged.
5. **Check.** Run `pnpm install --frozen-lockfile`, then `pnpm check:apps`. Done when it prints `check ok (N projects)`; on a failure, name the work branch that owns it and fix it there (step 2 onward).
6. **Hand test.** Ask the user what to test. The dashboard and checks hit the deployed Worker (memory: always use the deployed engine); use `pnpm dev` from the main checkout only when the user asks for it. Done when the user reports the result.
7. **Report.** One line per branch with its commit, plus the check result and any conflict.

## When the PRs land

Check out another branch in the main checkout, delete `uat` with `git branch -D uat`, and start the next round at step 1.
