# @mrpotatolab/skills-config

Give your agent skills the names that you choose, and link them into your projects.

## Context

You use agent skills (for example from `mattpocock/skills`) in many projects. The `skills` tool (`npx skills`) downloads them, but it keeps the author's names. Skills from different authors can have the same name, and long names are hard to type.

`skills-config` fixes this:

- It gives each skill a **name that you choose**. A prefix shows the author (`/mattpocock-tdd`), and an override gives one skill a short name (`/grill`).
- It puts **links** with those names in your project. Claude Code reads the links.
- It can keep **one real copy** of each skill in a **hub** folder for all your projects.
- It lets you **share your setup** as one small config file.

The config file is mainly a **name map**: it maps each skill to the name that you want. `skills-config` does not download skills itself. It uses the `skills` tool for that.

## Words used in this document

| Word | Meaning |
|---|---|
| skill | A folder with a `SKILL.md` file. The agent reads it as instructions. |
| hub | The folder that holds the config file, the lock file and `.skills-store`. |
| project | A folder where you work with Claude Code. |
| link | A shortcut in `.claude/skills` or `.agents/skills` that points to a skill in `.skills-store`. |
| skills-store | `.skills-store/` in the hub. It holds the real copy of each skill, under the original name. |
| config file | `skills.config.json`, in the hub. You write it. |
| lock file | `skills-lock.json`, in the hub. The `skills` tool writes it. Do not edit it. |
| source | The place a skill comes from, written as `author/repo`, for example `mattpocock/skills`. |
| prefix | Text put in front of a skill name, for example `mattpocock-`. |
| final name | The name of the link: the override, or the prefix plus the original name. |

## Requirements

- Node.js 21 or later.
- Internet access, to download skills from GitHub.
- macOS or Linux. Windows is not tested. Links can need extra settings on Windows.
- Claude Code. Other agents are not tested.

## Quick start

Do these steps once, in a new empty folder that will be your hub.

1. Make the hub folder and go into it.

   ```sh
   mkdir ~/.skills-hub
   cd ~/.skills-hub
   ```

2. Write a starter config file.

   ```sh
   npx @mrpotatolab/skills-config init
   ```

   You see: `wrote /Users/<you>/.skills-hub/skills.config.json (0 skills, 0 rules)`.

3. Open `skills.config.json`. Add the skills that you want to the `skills` list.

   ```json
   "skills": [
     { "source": "mattpocock/skills", "name": "tdd" },
     { "source": "mattpocock/skills", "name": "grilling" }
   ]
   ```

4. Run `init` again. It adds a prefix rule for each new author.

   ```sh
   npx @mrpotatolab/skills-config init
   ```

   You see: `added rule: mattpocock/skills -> mattpocock-`.

5. Download the skills.

   ```sh
   npx @mrpotatolab/skills-config restore
   ```

   You see the `skills` tool install each skill, then `next: run skills-config create in each project`.

6. Go to a project. Make the links.

   ```sh
   cd ~/Dev/my-app
   npx @mrpotatolab/skills-config create
   ```

   You see one line for each link:

   ```
   /mattpocock-tdd  <-  tdd (mattpocock/skills)  in .claude/skills, .agents/skills
   /mattpocock-grilling  <-  grilling (mattpocock/skills)  in .claude/skills, .agents/skills
   ```

7. Open a new Claude Code session in the project. Type `/`. You see `/mattpocock-tdd` and `/mattpocock-grilling`.

8. Add the link folders to the `.gitignore` of the project. The links point to a path on your computer.

   ```
   .claude/skills
   .agents/skills
   ```

## Two ways to use it

You can use one of two setups. Both use the same commands.

| | Central hub | Config in the project |
|---|---|---|
| Where `skills.config.json` lives | In one hub folder, for example `~/.skills-hub` | In the project root, next to `skills-lock.json` |
| Where the real skill files live | In the hub, in `.skills-store`, one copy for all projects | In the project, in `.skills-store` |
| Which skills a project gets | Every skill in the hub | Every skill in the project's own lock file |
| Updates | Run once, in the hub | Run in each project |
| Links | Point outside the project. They work only on your computer | Point inside the project. They work for teammates if you commit `.skills-store` and the link folders |
| What to commit to git | Nothing from the project | `skills.config.json`, `skills-lock.json`, `.skills-store`, `.agents/skills` and `.claude/skills` |

Use the **central hub** when you work alone and want one copy of each skill for all projects.

Use **config in the project** when each project needs its own skills, or when teammates must get the same names.

### Set up config in the project

Do these steps in the project root. The project can already have a `skills-lock.json` from `npx skills add`.

1. Write the config file next to the lock file.

   ```sh
   npx @mrpotatolab/skills-config init
   ```

   You see: `wrote /path/to/my-app/skills.config.json (<n> skills, <n> rules)`.

2. If the project has no skills yet, download them.

   ```sh
   npx @mrpotatolab/skills-config restore
   ```

3. Make the links.

   ```sh
   npx @mrpotatolab/skills-config create
   ```

   `create` moves the real folders into `.skills-store/` and puts renamed links in `.claude/skills` and `.agents/skills`.

4. Commit `skills.config.json`, `skills-lock.json`, `.skills-store`, `.agents/skills` and `.claude/skills`. The links are relative to the project, so they work on other computers.

5. After each `npx skills add` or `npx skills update`, run `create` again. Those commands write original-name folders into `.agents/skills` again.

## How the tool finds the hub

Each command needs the hub. The tool looks in this order and uses the first match:

1. The `--hub <folder>` option. Example: `npx @mrpotatolab/skills-config --hub ~/my-hub create`.
2. The `SKILLS_HUB` environment variable. Example: `export SKILLS_HUB=~/my-hub`.
3. The current folder, if it has a `skills.config.json`. For `init` only, a `skills-lock.json` is also enough.
4. `~/.skills-hub`.

Rule 3 is narrow on purpose. Many projects have a `skills-lock.json` from `npx skills`. `create` must not treat such a project as a hub.

Tip: if you keep your hub in `~/.skills-hub`, you never need `--hub`. In the "config in the project" setup, run the commands in the project root, and you also never need `--hub`.

## The config file

`skills.config.json` lives in the hub. You edit it by hand. `init` adds to it but never removes anything. The `skills` tool never changes it.

```json
{
  "skills": [
    { "source": "mattpocock/skills", "name": "tdd" },
    { "source": "mattpocock/skills", "name": "grilling" }
  ],
  "rules": [
    { "source": "mattpocock/skills", "prefix": "mattpocock-" }
  ],
  "overrides": { "grilling": "grill" },
  "targets": [".claude/skills", ".agents/skills"]
}
```

| Field | What it does | Example |
|---|---|---|
| `rules` | **Name map for each source.** Each skill from that source gets the prefix. | `mattpocock-` makes `tdd` into `/mattpocock-tdd`. |
| `overrides` | **Name map for one skill.** It wins over the prefix. Use the original skill name as the key. | `"grilling": "grill"` makes `/grill`. |
| `targets` | The folders in each project that get links. | `.claude/skills` is the folder that Claude Code reads. |
| `skills` | The skills to download with `restore`. Each entry has a source and a skill name. It has no version. | `{ "source": "mattpocock/skills", "name": "tdd" }` |

Every skill in the lock file gets a link. To give a project fewer skills, install fewer skills: remove them from the lock file and the `skills` list.

Older configs can have an `include` field. It is no longer used. `create` prints a warning. Delete the field.

### Why the config file has a `skills` list

The `skills` list lets you share your setup as **one file**. A teammate gets your `skills.config.json`, runs `restore`, and gets the same skills.

- **Why there is no version:** the lock file has a hash for each skill. The hash changes each time you run `npx skills update`. A copy of the hashes in the config file would go out of date, and the two files would disagree. So the list has only the source and the name. `restore` always gets the newest version, and the `skills` tool writes fresh hashes into the lock file.
- **How it stays current:** `init` copies each new skill from the lock file into the list. Run `init` after you add a skill with `npx skills add`.
- **Central hub:** the list is important. You share only the config file. `restore` builds the lock file and the skill folders from it.
- **Config in the project:** the list is mostly a copy of the lock file. You commit `skills-lock.json` and `.skills-store`, so teammates already have the skills. The list still helps when you copy only `skills.config.json` to a new project. It also lets `restore` bring back a deleted store. `npx skills experimental_install` does the same from the lock file.
- **Keep the two lists the same:** if you remove a skill, remove it from the `skills` list and from the lock file (`npx skills remove <name>`). If you do not, `restore` tries to download it each time. Example: a skill that the author removed gives `warning: could not install from <source>` on each `restore`.

## Commands

All commands start with `npx @mrpotatolab/skills-config`. You can put `--hub <folder>` before the command name.

### `init`

- **What it does:**
  - Makes the hub folder if it does not exist.
  - Writes a starter config file if there is none.
  - Reads the lock file. Adds each skill that is not yet in the `skills` list.
  - Adds a prefix rule for each source that has no rule. The prefix is the author name plus a dash.
- **What it does not do:** It does not download skills. It does not make links. It does not change `overrides` or `targets`. It never removes a rule or a skill.
- **Where to run it:** In the hub folder, or anywhere with `--hub`.

### `restore`

- **What it does:**
  - Reads the `skills` list in the config file.
  - Finds each skill that is missing from `.skills-store` (and from `.agents/skills` if `create` has not run yet).
  - Runs `npx skills add <source> -s <name> ... -y` once for each source. The `skills` tool downloads the skills into `.agents/skills` and writes the lock file.
- **What it does not do:** It does not make links. It does not move folders into `.skills-store`. It does not give the same version as another person. It always gets the newest version. It does not delete skills that you removed from the list.
- **Where to run it:** In the hub folder, or anywhere with `--hub`.

### `create [project]`

- **What it does:**
  - Moves each real skill folder from `.agents/skills/<original-name>` into `.skills-store/<original-name>`.
  - Makes a link with the final name for each skill in the lock file, in each folder in `targets`.
  - Uses the name from `overrides`, or the prefix plus the original name.
  - Removes old links that point into `.skills-store` or `.agents/skills` but that no longer match a skill or a name.
  - Prints a warning for each problem. See LOGS.md.
- **What it does not do:** It does not download skills. It does not change the config file. It never overwrites or deletes a folder or link that does not point into the hub.
- **Where to run it:** In the project folder. Or give the project folder as an argument: `create ~/Dev/my-app`.

## Common tasks

### Start a new project

1. Go to the project folder.
2. Run `npx @mrpotatolab/skills-config create`.
3. Add `.claude/skills` and `.agents/skills` to the `.gitignore` of the project (central hub only).
4. Open a new Claude Code session.

### Add a skill

1. Add the skill to the `skills` list. Example: `{ "source": "mattpocock/skills", "name": "pr" }`.
2. Run `npx @mrpotatolab/skills-config init`. It adds a prefix rule if the author is new.
3. Run `npx @mrpotatolab/skills-config restore`.
4. Run `npx @mrpotatolab/skills-config create` in each project.

Another way: in the hub folder, run `npx skills add mattpocock/skills -s pr`. Then run `init`. `init` copies the skill from the lock file into the `skills` list.

### Share your setup with a teammate

1. Send your `skills.config.json`. Do not send the lock file or the `.agents` folder.
2. Your teammate puts the file in their hub folder, for example `~/.skills-hub`.
3. Your teammate runs `npx @mrpotatolab/skills-config restore`.
4. Your teammate runs `npx @mrpotatolab/skills-config create` in each project.

Your teammate gets the newest version of each skill, with the same names as yours. The version can be newer than yours.

### Update skills

1. Go to the hub folder.
2. Run `npx skills update`. It downloads again each skill that its author changed.
3. Read what changed. A changed skill changes how the agent works. If the hub is a git repo, run `git diff`.
4. Run `npx @mrpotatolab/skills-config create` in each project. This makes sure that the links are in place.
5. Open a new Claude Code session.

### Rename a skill

1. Add the skill to `overrides`. Use the original skill name as the key.

   ```json
   "overrides": { "improve-codebase-architecture": "arch" }
   ```

2. Run `npx @mrpotatolab/skills-config create` in each project. The old link is removed and the new one is made.

### Remove a skill

1. In the hub folder, run `npx skills remove <skill-name>`. (Not tested.)
2. Delete the skill from the `skills` list and from `overrides`.
3. Run `npx @mrpotatolab/skills-config create` in each project. You see `removed stale link: .claude/skills/<name>`.

With a central hub, this removes the skill from every project. To keep a skill out of only one project, use "config in the project" for that project.

## How names work

- A prefix comes from `rules`. Example: `tdd` from `mattpocock/skills` becomes `/mattpocock-tdd`.
- An override wins over the prefix. Example: `"grilling": "grill"` makes `/grill`.
- A source with no rule and a skill with no override keep the original name.
- The real skill folder in `.skills-store` keeps its original name. Do not rename it. The `skills` tool and `restore` find it by that name.
- **The original name still works.** Claude Code accepts the link name and the `name:` line in `SKILL.md`. So `/tdd` and `/mattpocock-tdd` both start the skill. Skills that call other skills by their original names still work. This was tested with `claude -p` (one-shot mode), not with the interactive menu.
- If two authors use the same original name, use the prefixed name to choose the right skill.

## What `create` never does

- It never overwrites a real folder.
- It never overwrites or deletes a link that points outside the hub.
- It never deletes your own skills.

If something blocks a link, `create` skips that link and prints a warning.

## Dos and don'ts

### Do

- Run `npx @mrpotatolab/skills-config create` again after each `npx skills add`, `npx skills experimental_install` and `npx skills update`.
- Look in `.claude/skills/` of the project for the link. Claude can use a skill only when a link is there.
- Open a new Claude Code session after you change links. A running session does not read the links again.
- Use the original skill name as the key in `overrides`, not the prefixed name.
- Read each warning that `create` prints. The warnings show typos, renamed skills and name clashes. See LOGS.md.
- Read what changed after `npx skills update`. A skill is an instruction for the agent.
- Keep the hub (or the project, in the "config in the project" setup) in git. Then you can see each change and undo it.
- Keep skills that only you use in `~/.claude/skills`, not in a shared lock file. Every skill in the lock file gets a link for everyone.

### Do not

- Do not rename or edit the skill folders in `.skills-store/`. After `create`, `.agents/skills` holds only links with the final name. The `skills` tool writes original-name folders into `.agents/skills` again on each add or update. Run `create` after that.
- Do not use the lock file as proof that Claude can use a skill. The lock file only lists what is installed. Claude needs a link.
- Do not expect `init` to download or link skills. Use `restore` to download and `create` to link.
- Do not commit links that point to a central hub. They point to a path on your computer.
- Do not edit a hash in the lock file.
- Do not open Claude Code in a central hub folder to use skills. The hub has no links for itself.
- Do not make extra links into the hub by hand. `create` removes links into the hub that it did not make.
- Do not assume that agents other than Claude Code show your names. They are not tested.

## Limits

- Only Claude Code is tested. `.agents/skills` links are made for other agents, but they are not tested.
- Every skill in the lock file gets a link. With a central hub, all projects get the same skills. Use "config in the project" when a project needs a different set.
- Each linked skill uses a small part of the agent's context. Install only the skills that you use.
- Nothing tells you when an author changes a skill. Run `npx skills update` yourself.
- `npx skills update` applies a change at once. It shows no preview.
- With a central hub, links point to a path on your computer. Do not commit them. With "config in the project", the links are relative and you can commit them.
- If you move the hub or a project, the links can break. Run `create` again.
- Claude Code also reads the `.claude/skills` folder of parent folders. A project inside another repo can show more skills than you expect.

For all messages, warnings and known issues, see `LOGS.md`.
