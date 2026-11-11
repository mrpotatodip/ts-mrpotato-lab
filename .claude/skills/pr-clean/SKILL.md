---
name: pr-clean
description: "Merge the PR that /pr opened, then clean up: delete the remote branch, remove the worktree, delete the local branch, discard the leftover edit in the main checkout."
disable-model-invocation: true
---

Run from the main checkout, never from inside the worktree. The PR is the one for the branch the user names, or the branch of the newest worktree under `.claude/worktrees/`.

## 1. Merge

`gh pr checks <n> --watch`, then `gh pr merge <n> --squash --delete-branch`. This repo allows squash merges only and has auto-merge off, so the skill waits for the required check itself. `--delete-branch` removes the remote branch after the merge, and its failure to delete the local branch is expected while the worktree holds it.

Done when `gh pr view <n> --json state -q .state` prints `MERGED`. If a check fails, or the PR is still `OPEN` after the watch, report which check and stop: steps 2 to 4 wait for the merge.

## 2. Remove the worktree

`git worktree remove .claude/worktrees/<name>`. Git refuses a worktree with uncommitted edits; report them and stop.

Done when `git worktree list` no longer shows it.

## 3. Delete the local branch

Step 4 comes first when the main checkout holds an edit to a file the PR touched: the pull refuses to overwrite it.

Another session may work in the main checkout. Run `git branch --show-current` and `git status --short` there first, and branch on the answer:

- It prints `main` and the status is clean, or lists only files the PR touched: `git pull --ff-only`.
- It prints another branch: leave that branch checked out. Run `git fetch` only, and report that the local `main` is behind `origin/main`.

Then `git branch -D <branch>`. A squash merge leaves the branch commits outside `main`, so `-d` always refuses; the `MERGED` state from step 1 is the safety check.

Done when `git branch --list <branch>` prints nothing, and the main checkout is unchanged in branch and edits, except for the pull in the first case.

## 4. Discard the leftover edit

The main checkout may hold the PR's change as an uncommitted edit (a dev server regenerates `routeTree.gen.ts` there). Run `git diff HEAD --stat` and `git status --short` first.

- The edit equals the merged file, and the main checkout is on `main`: `git fetch`, then `git diff origin/main -- <file>` prints nothing. Run `git checkout origin/main -- <file>`, then `git merge --ff-only origin/main`. A running dev server rewrites a restored `routeTree.gen.ts` at once, so a plain restore then pull can fail.
- The edit differs from `main`: list the files and ask the user before `git restore --staged --worktree <file>`.

Done when `git status --short` lists no file the PR touched.

## Report

One line per step: done, skipped, or stopped and why.
