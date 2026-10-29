# Logs: messages, warnings and issues

## Context

This document lists each message that `skills-config` prints, what it means and what to do. It also lists the known issues and the issues that were found and fixed.

Read the README first. It explains the hub, the config file and the commands.

## Words used in this document

| Word | Meaning |
|---|---|
| hub | The folder that holds the config file, the lock file and `.skills-store`. |
| project | A folder where you work with Claude Code. |
| link | A shortcut in `.claude/skills` or `.agents/skills` that points to a skill in `.skills-store`. |
| skills-store | `.skills-store/` in the hub. It holds the real copy of each skill, under the original name. |
| config file | `skills.config.json`, in the hub. |
| lock file | `skills-lock.json`, in the hub. The `skills` tool writes it. |
| final name | The name of the link: the override, or the prefix plus the original name. |

Each issue has a status:

- **Open**: not fixed.
- **Fixed in 0.x.y**: fixed in that version.
- **Fixed before release**: found in testing and fixed before the first release.

---

# Part 1: Messages

## Messages from `init`

| Message | Meaning | What to do |
|---|---|---|
| `added skill: <source> <name>` | `init` found a skill in the lock file that was not in the `skills` list. It added the skill. | Nothing. |
| `added rule: <source> -> <prefix>` | `init` found a source with no rule. It added a prefix rule. | Nothing. Change the prefix by hand if you want a different one. |
| `warning: no automatic prefix for source "<source>"; add a rule by hand` | The source is not written as `author/repo`, for example it is a web address. `init` cannot make a prefix from it. | Add a rule by hand: `{ "source": "<source>", "prefix": "<your-prefix>-" }`. |
| `wrote <path>/skills.config.json (<n> skills, <n> rules)` | `init` saved the config file. The numbers count the entries in the `skills` list and in `rules`. | Check that the path is the hub you expect. If not, see "Wrong hub" in Part 2. |

## Messages from `restore`

| Message | Meaning | What to do |
|---|---|---|
| `config has no "skills" list; run: skills-config init` | The config file has no skills to download. | Run `init`, or add skills to the `skills` list by hand. |
| `all skills are already installed` | Each skill in the `skills` list is in the lock file and in `.skills-store` (or still in `.agents/skills` if `create` has not run). | Nothing. |
| `npx -y --package=skills skills add <source> -s <name> ... -y` | `restore` shows the command that it runs for one source. | Nothing. The `skills` tool output follows. |
| `warning: could not install from <source>` | The `skills` tool failed for that source. | Read the output above the warning. Check the internet connection, the source name and the skill names. |
| `next: run skills-config create in each project` | The download is done. The projects have no new links yet. | Run `create` in each project. |

## Messages from `create`

| Message | Meaning | What to do |
|---|---|---|
| `/<final-name>  <-  <name> (<source>)  in <targets>` | `create` moved the real folder to `.skills-store/<name>` and made the link with the final name in each folder in the list. | Open a new Claude Code session to see it. |
| `no skills installed in <hub> yet; run: skills-config restore` | The hub has no lock file. Or the tool used a different hub than you expect. | Run `restore`. If the path is wrong, see "Wrong hub" in Part 2. The command stops with exit code 1. |
| `warning: "include" is no longer used; every skill gets a link. Delete it from the config` | The config file has an `include` field from an older version. `create` ignores it and links every skill in the lock file. | Delete `include` from the config file. To give a project fewer skills, install fewer skills. |
| `warning: config names "<name>" but it is not in skills-lock.json` | A name in `overrides` is not in the lock file. It is a typo, or the author renamed the skill, or the skill is not installed yet. | Correct the name, or run `restore`, or delete the old override. |
| `warning: skip <name>: final name "<final-name>" is already used by <other>` | Two skills got the same final name. The first skill keeps the link. | Give one of them a different name in `overrides`. |
| `skip <name>: not installed (run: skills-config restore)` | The skill is in the lock file but its folder is not in `.skills-store` or in `.agents/skills`. | Run `restore`. |
| `warning: skip <target>/<final-name>: something else already exists there` | The project has its own folder or link with that name. `create` does not change it. | Rename your own folder or link, or give the skill a different name in `overrides`. |
| `removed stale link: <target>/<name>` | A link pointed into the hub, but it no longer matches a skill in the lock file or its final name. Examples: you removed the skill, you changed its name, or `npx skills` made a link with the original name. `create` deleted it. | Nothing, if this is what you wanted. If a skill is missing, check that it is in the lock file and installed, then run `create` again. |

## Other messages

| Message | Meaning | What to do |
|---|---|---|
| `usage: skills-config [--hub <folder>] init \| restore \| create [projectDir]` followed by `hub: <path>` | You gave no command, or an unknown command. The second line shows the hub that the tool found. The command stops with exit code 1. | Use `init`, `restore` or `create`. |
| `Restored <name>` (from `npx skills experimental_install`) | The `skills` tool installed a skill from the lock file. | Nothing. |
| `All project skills are up to date` (from `npx skills update`) | No author changed a skill. | Nothing. |
| A table with `Safe`, `0 alerts`, `Low Risk` (from `npx skills add`) | The `skills` tool checked the skills before it installed them. | Read it. Do not install a skill that the check marks as unsafe. |
| `sh: skills: command not found` | An old version of `restore` ran inside another `npx`. Fixed before release. | Use version 0.1.0 or later. |
| `Map.groupBy is not a function` | Node.js is older than version 21. | Install Node.js 21 or later. |

---

# Part 2: Known issues (open)

### Wrong hub

- **Symptom:** `init` writes to a folder that you did not expect, or `create` says that no skills are installed.
- **Cause:** The tool finds the hub in this order: `--hub`, then `SKILLS_HUB`, then the current folder (only if it has `skills.config.json`; for `init`, also `skills-lock.json`), then `~/.skills-hub`.
- **What to do:** Read the path in the message. Use `--hub <folder>` to choose the hub. Run `npx @mrpotatolab/skills-config` with no command to see which hub the tool finds.

### npx runs an old version

- **Symptom:** A fix does not seem to work after a new release.
- **Cause:** npx keeps downloaded versions in a cache.
- **What to do:** Run with an exact version, for example `npx @mrpotatolab/skills-config@0.2.3 init`.

### A local `npm link` hides the published package

- **Symptom:** npx runs your local copy, not the published package.
- **Cause:** A global `npm link` of a package with the same name or the same command name.
- **What to do:** Run `npm ls -g` to find it. Run `npm unlink -g <name>`.

### Config in the project: original names come back after an install

- **Symptom:** After `npx skills add` or `npx skills update`, `.agents/skills` has original-name folders again (for example `tdd`) next to your names (for example `mattpocock-tdd`).
- **Cause:** The `skills` tool writes real folders into `.agents/skills` under the original name.
- **What to do:** Run `npx @mrpotatolab/skills-config create` again. It moves those folders into `.skills-store` and leaves only the final names in `.agents/skills` and `.claude/skills`.

### Other open issues

| Issue | Effect | What to do now |
|---|---|---|
| Every project gets every hub skill (central hub) | A work project and a personal project get the same skills. | Use "config in the project", or a different hub for each group of projects with `--hub`. |
| No notice of updates | You do not know when an author changes a skill. | Run `npx skills update` from time to time. |
| No preview of an update | `npx skills update` changes the skills at once. | Keep the hub in git. Read `git diff` after each update. |
| Only Claude Code is tested | Other agents can use other folders or ignore the links. | Add their folder to `targets` and test it. |
| Links point to a path on your computer (central hub) | A teammate who clones a project gets broken links. | Add `.claude/skills` and `.agents/skills` to `.gitignore`. Or use "config in the project", where the links are relative. |
| Links break when a folder moves | Moving the hub breaks the links in all projects. | Run `create` again in each project. |
| Parent folders add skills | Claude Code also reads `.claude/skills` in parent folders. | Keep projects outside other repos, or ignore the extra skills. |
| `restore` does not delete skills | A skill that you removed from the `skills` list stays in the hub. | Run `npx skills remove <name>` in the hub. |
| `init` never removes anything | Old rules and skills stay in the config file. | Delete them by hand. |
| Same skill name from two authors | The lock file uses the skill name as the key. Two skills with the same name were not tested. | Avoid it, or use separate hubs. |
| Original names still work | `/tdd` and `/mattpocock-tdd` both start the skill. Two authors with the same original name can clash. | Use the prefixed name. |
| Hand-made links into the hub disappear | A link that you made by hand into the hub, with a name that `create` did not choose, is removed by `create`. | Use `overrides` to choose a name. |
| An installed skill cannot be hidden | Every skill in the lock file gets a link. There is no way to leave out one installed skill. | Remove the skill (`npx skills remove <name>`), or use "config in the project" or a separate hub. |
| Skills that teammates add get a link for everyone | A skill that a teammate adds to the shared lock file gets a link for everyone. More skills use more context. | Keep skills for one person in `~/.claude/skills`, not in the shared lock file. |
| A link disappeared once after an install | One link was missing after `npx skills experimental_install`. The cause was not found. | Run `create` again after each install or update. |
| Windows is not tested | Links can need extra settings. | Test on Windows before you rely on it. |

---

# Part 3: Issues found and fixed

| # | Issue | Effect | Fix | Status |
|---|---|---|---|---|
| 1 | Two skills got the same final name. | The second link replaced the first with no message. | `create` keeps the first link and prints a warning. | Fixed before release |
| 2 | A name in `include` or `overrides` was not in the lock file. | The name was ignored with no message. | `create` prints a warning. | Fixed before release |
| 3 | A real folder had the same name as a link. | `create` stopped with an error in the middle of the run. | `create` skips the link and prints a warning. | Fixed before release |
| 4 | A link with the original name pointed outside the hub. | `create` deleted a link that the user made. | `create` deletes only links that point into the hub. | Fixed before release |
| 5 | A skill was removed from `include`. | The old link stayed. | `create` removes old links that point into the hub. | Fixed before release |
| 6 | A source was a web address. | `init` made the bad prefix `https-`. | `init` makes prefixes only for `author/repo` sources and prints a warning for others. | Fixed before release |
| 7 | `restore` ran inside `npx`. | The inner `npx skills add` failed with `skills: command not found`. The outer npx passed its package setting to the inner call. | `restore` names the package: `npx --package=skills skills add ...`. | Fixed before release |
| 8 | `create` ran before `restore`. | The command crashed because there was no lock file. | `create` prints `run: skills-config restore` and stops. | Fixed before release |
| 9 | npx ran a local `npm link` copy. | `init` wrote to the development folder, not to the current folder. | The tool no longer uses the folder of the script as the hub. The old link was removed. | Fixed in 0.2.0 |
| 10 | `init` in a folder with only a lock file. | `init` ignored that folder and used `~/.skills-hub`. | `init` uses the current folder if it has `skills-lock.json` or `skills.config.json`. Other commands need `skills.config.json`. | Fixed in 0.2.0 |
| 11 | Skills that call other skills by their original names. | A prefix could break these calls. | Tested: Claude Code accepts the original name too. No change was needed. | Not a bug |
| 12 | A new config had `"include": []`. | `[]` meant "link nothing", so a new config linked no skills. A shared `include` list also forced one person's choice on the whole team. | Replaced by issue 13. | Fixed in 0.2.0 |
| 13 | `include` made the config do two jobs: names and visibility. | A shared `include` list forced one person's choice on the whole team, and it could hide skills that a teammate installed. | `include` was removed. Every skill in the lock file gets a link. The config file is now mainly a name map (`rules` and `overrides`). An old `include` field prints a warning and is ignored. | Fixed in 0.2.0 |
| 14 | Config in the project listed each skill twice in `.agents/skills`. | Original-name folders from `npx skills` sat next to renamed links. | `create` moves the real folders to `.skills-store/` and leaves only renamed links in the target folders. | Fixed in 0.2.2 |
