# Issue tracker

This lab copy (`ts-elise-lab`) has no GitHub remote yet. Infer the repo from `git remote -v` once one exists.

Until then, write tickets as local markdown under the relevant `apps/<project>/.scratch/<feature>/`. Specs (PRDs) already live there as `PRD.md`.

When a remote exists, use the `gh` CLI:

- **Create an issue**: `gh issue create --title "..." --body "..."`
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open`
- **Comment**: `gh issue comment <number> --body "..."`
- **Labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

**PRs as a request surface: no.** Only issues go through triage; PRs are treated as ordinary code changes.

## When a skill says "publish to the issue tracker"

If there is no GitHub remote, write the ticket under `apps/<project>/.scratch/<feature>/` and note that it still needs to be filed on GitHub.

## When a skill says "fetch the relevant ticket"

Read the local scratch file, or `gh issue view <number> --comments` if the remote exists.
