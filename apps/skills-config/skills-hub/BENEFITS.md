# Benefits of skills-config

## Context

You use the same agent skills in many projects. Without a tool, you copy skill folders into each project, and each copy goes out of date. `skills-config` keeps your skills in one place, gives them names that you choose, and links them into your projects.

This document tells you **why** to use it. It also shows the test evidence for each benefit.

- For how to use it, see README.md.
- For warnings, known issues and limits, see LOGS.md.

## Words used in this document

| Word | Meaning |
|---|---|
| skill | A folder with a `SKILL.md` file. The agent reads it as instructions. |
| hub | The folder that holds the config file, the lock file and `.skills-store`. |
| project | A folder where you work with Claude Code. |
| link | A shortcut in `.claude/skills` or `.agents/skills` that points to a skill in `.skills-store`. |
| skills-store | `.skills-store/` in the hub. It holds the real copy of each skill, under the original name. |
| config file | `skills.config.json`. You write it. |
| lock file | `skills-lock.json`. The `skills` tool writes it. |

Each benefit has a status:

- **Tested**: it was run and it worked.
- **Partly**: it works, but one part is not finished or not tested.
- **Not tested**: it should work, but no one checked it.

## How the files work together

| File | Who writes it | Job |
|---|---|---|
| lock file | the `skills` tool | Lists the installed skills and their sources. `npx skills update` uses it to find changes. |
| config file | you | Mainly a name map: sets the name of each skill (`rules`, `overrides`). Also lists the skills to download (`skills`) and the folders that get links (`targets`). |
| `.skills-store` | `create` (after `restore` or `npx skills`) | Holds the real skill folders under the original name. Agent folders get links with the final name. |

The `skills` tool never changes the config file. Your choices stay safe when you run `npx skills update`.

# Benefits

### 1. A name that shows who wrote the skill — Tested

A rule gives each skill from one author the same prefix.

```json
{ "source": "mattpocock/skills", "prefix": "mattpocock-" }
```

Example: `tdd` becomes `/mattpocock-tdd`. The `/` menu then shows the skills of one author together. You also know whose instructions you start. The prefix shows who wrote the skill. It does not prove that the skill is safe.

### 2. Skills from different authors stay apart — Partly

Two authors can publish a skill with the same name, for example `tdd`. With prefixes, you get `/mattpocock-tdd` and `/someone-tdd`.

- The prefixed names do not clash. `npx @mrpotatolab/skills-config create` prints a warning if two final names are the same. Tested.
- The original names can still clash. See "Original names still work".
- Two skills with the same name in one lock file are not tested.

### 3. Less doubt next to built-in commands — Partly

Claude Code has built-in commands, for example `/review`, `/init` and `/loop`. The prefixed name `/mattpocock-code-review` is always clear. The original name also works, so it can still overlap with a built-in command. Use the prefixed name when you must be sure.

### 4. A short name for a long skill — Tested

An override gives one skill the name that you choose.

```json
"overrides": { "improve-codebase-architecture": "arch" }
```

Example: you type `/arch`. This helps most with skills that Claude never starts by itself. You must type the name each time.

### 5. Clear names for similar skills — Tested

One author can publish skills with close names, for example `grilling`, `grill-me` and `grill-with-docs`. An override gives each skill a name that is easy to tell apart. Example: `"grilling": "grill"` makes `/grill`.

### 6. Your own version next to the original — Not tested

You can keep `/mattpocock-tdd` and add `/mine-tdd` with your own changes. Then you can compare them. There is no set way yet to add skills that you wrote yourself.

### 7. Each project gets only the skills that it needs — Tested

Every skill in the lock file gets a link. So the skills that a project gets are the skills that its lock file holds.

- With the config in the project, each project has its own lock file and so its own set of skills. Tested in a project made with `npx skills add`.
- A team that shares one config file gets the same names and no hidden skills. Tested: an old config with an `include` list printed a warning, and all 38 installed skills got a link.
- With a central hub, all projects get every skill in the hub.

### 8. One setup for more than one agent — Not tested

`targets` lists the folders that get links.

```json
"targets": [".claude/skills", ".agents/skills"]
```

`npx @mrpotatolab/skills-config create` makes the links in each folder. After `create`, those folders hold only the final names. The real folders are in `.skills-store`. Only Claude Code was checked. Codex and other agents are not tested.

### 9. A starter config file — Tested

`npx @mrpotatolab/skills-config init` reads the lock file. It adds each skill to the `skills` list. It adds a prefix rule for each author that has no rule. Example: the lock file has a skill from `ibelick/ui-skills`. After `init`, the config file has the rule `ibelick-`. Your other entries do not change.

- In a folder with a lock file of 39 skills, `init` added all 39 skills and 3 prefix rules.
- For a source that is a web address, `init` prints a warning and adds no rule.

### 10. Warnings and safe behavior — Tested

`npx @mrpotatolab/skills-config create` prints a warning when:

- two skills get the same final name (the first skill keeps the link),
- the config file names a skill that is not in the lock file,
- a project already has its own folder or link at the final name.

`create` never overwrites or deletes a folder or link that does not point into the hub. It removes only its own old links.

### 11. Share your setup with one file — Tested

The `skills` list holds only an author and a skill name for each skill. It holds no versions.

```json
"skills": [{ "source": "mattpocock/skills", "name": "pr" }]
```

You send a teammate your `skills.config.json`. Your teammate runs `npx @mrpotatolab/skills-config restore`. The tool comes from npm, so nothing else is needed.

- The config file holds no versions, so it does not go out of date when you run `npx skills update`.
- Your teammate gets the newest version of each skill. It can be newer than yours.

### 12. Links that teammates can use — Partly

With the config in the project, the real skill files are in the project (`.skills-store`). The links in `.claude/skills` and `.agents/skills` are relative, for example `../../.skills-store/tdd`. You can commit them with the project.

- Tested: the links are relative and work in the project.
- Not tested: a clone of the project on a second computer.

### 13. No install — Tested

You run the tool with `npx @mrpotatolab/skills-config`. You do not install anything. The package is small: one script, README.md, LOGS.md, BENEFITS.md and `package.json`.

## Original names still work

Skills often use the names of other skills. Example: `wayfinder` tells Claude to call "grilling". `ask-matt` tells you to type `/diagnosing-bugs`. A prefix could break this. In the tests, it did not.

- Claude Code accepts two names for a skill: the link name, and the `name:` line in `SKILL.md`. In one test, `/acme-delta` and `/delta` loaded the same skill. `/sigma` matched neither name and gave "Unknown command".
- With real skills: `wayfinder` loaded `grilling` and `domain-modeling` under their prefixed names. A sub-agent called the Skill tool with "research", and it worked. `/diagnosing-bugs` and `/grill-with-docs` loaded the prefixed skills.
- These tests used `claude -p` (one-shot mode), not the interactive menu.

## Test evidence

All tests ran on macOS with Claude Code and Node.js 22.

| What was tested | Result |
|---|---|
| The published package, run with `npx` in a clean home folder | `init`, `restore` and `create` worked. The default hub was `~/.skills-hub`. |
| `restore` from a config file only, with no lock file and no skills | All skills installed. A second run printed `all skills are already installed`. |
| `npx skills update` after a forced change (one hash edited) | The skill was downloaded again. The links still worked. |
| Config in the project, next to a lock file from `npx skills add` | `init` wrote the config file there. `create` moved real folders to `.skills-store` and left only final names in `.agents/skills` and `.claude/skills`. |
| `create` in a project with only a lock file | It did not treat the project as a hub, and it changed nothing. |
| Warnings in benefit 10 | Each warning appeared. Nothing was overwritten. |
| Claude Code reads the names | A new session listed `grill` and `mattpocock-tdd`. User-only skills loaded when typed. |
| Skills that call each other by original name | Worked. See "Original names still work". |
