#!/usr/bin/env node
// skills-config init              write/extend skills.config.json (skills list + prefix rules) from skills-lock.json
// skills-config restore           download the skills in config "skills" that are missing (writes skills-lock.json)
// skills-config create [project]  link skills into project (default: current folder)
// Hub folder (holds skills.config.json, skills-lock.json, .skills-store):
//   --hub <folder>, else $SKILLS_HUB, else the current folder if it has skills.config.json
//   (or, for init only, skills-lock.json), else ~/.skills-hub
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const hubFlag = args.indexOf("--hub");
const hubArg = hubFlag > -1 ? args.splice(hubFlag, 2)[1] : undefined;
const [cmd, arg] = args;
// a plain project with only skills-lock.json (from `npx skills`) must not be mistaken for a hub by create
const isHub = (dir) =>
  fs.existsSync(path.join(dir, "skills.config.json")) ||
  (cmd === "init" && fs.existsSync(path.join(dir, "skills-lock.json")));
const hub = path.resolve(
  hubArg ?? process.env.SKILLS_HUB ?? (isHub(process.cwd()) ? process.cwd() : path.join(os.homedir(), ".skills-hub")),
);
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const lockPath = path.join(hub, "skills-lock.json");
const configPath = path.join(hub, "skills.config.json");

if (cmd === "init") {
  fs.mkdirSync(hub, { recursive: true });
  const lock = fs.existsSync(lockPath) ? read(lockPath).skills : {};
  const config = fs.existsSync(configPath)
    ? read(configPath)
    : { skills: [], rules: [], overrides: {}, targets: [".claude/skills", ".agents/skills"] };
  // "skills" = what to download (author + name, no hashes), so this one file can be shared
  config.skills ??= [];
  for (const [name, { source }] of Object.entries(lock)) {
    if (config.skills.some((s) => s.source === source && s.name === name)) continue;
    config.skills.push({ source, name });
    console.log(`added skill: ${source} ${name}`);
  }
  const sources = new Set([...Object.values(lock), ...config.skills].map((s) => s.source));
  for (const source of sources) {
    if (config.rules.some((r) => r.source === source)) continue;
    // only "owner/repo" sources get an automatic prefix; web addresses etc. must be added by hand
    const owner = /^[\w.-]+\/[\w.-]+$/.test(source)
      ? source.split("/")[0].toLowerCase().replace(/[^a-z0-9]+/g, "")
      : "";
    if (!owner) {
      console.log(`warning: no automatic prefix for source "${source}"; add a rule by hand`);
      continue;
    }
    config.rules.push({ source, prefix: `${owner}-` });
    console.log(`added rule: ${source} -> ${owner}-`);
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  console.log(`wrote ${configPath} (${config.skills.length} skills, ${config.rules.length} rules)`);
} else if (cmd === "restore") {
  // download the skills listed in config "skills" that are missing; the skills tool writes the lock file
  const { skills = [] } = read(configPath);
  const lock = fs.existsSync(lockPath) ? read(lockPath).skills : {};
  const missing = skills.filter(
    (s) =>
      !(s.name in lock) ||
      !(
        fs.existsSync(path.join(hub, ".skills-store", s.name)) ||
        fs.lstatSync(path.join(hub, ".agents/skills", s.name), { throwIfNoEntry: false })?.isDirectory()
      ),
  );
  if (!skills.length) console.log('config has no "skills" list; run: skills-config init');
  else if (!missing.length) console.log("all skills are already installed");
  const bySource = Map.groupBy(missing, (s) => s.source);
  for (const [source, list] of bySource) {
    // name the package explicitly: an outer `npx` leaks npm_config_package into this call
    const npxArgs = ["-y", "--package=skills", "skills", "add", source, ...list.flatMap((s) => ["-s", s.name]), "-y"];
    console.log(`npx ${npxArgs.join(" ")}`);
    const r = spawnSync("npx", npxArgs, { cwd: hub, stdio: "inherit" });
    if (r.status !== 0) console.log(`warning: could not install from ${source}`);
  }
  if (missing.length) console.log("next: run skills-config create in each project");
} else if (cmd === "create") {
  const project = path.resolve(arg ?? process.cwd());
  if (!fs.existsSync(lockPath)) {
    console.log(`no skills installed in ${hub} yet; run: skills-config restore`);
    process.exit(1);
  }
  const lock = read(lockPath).skills;
  const { rules = [], overrides = {}, targets = [".claude/skills"], include } = read(configPath);
  const hubReal = fs.realpathSync(hub);
  const agents = path.join(hubReal, ".agents/skills");
  const store = path.join(hubReal, ".skills-store");
  const isLink = (p) => fs.lstatSync(p, { throwIfNoEntry: false })?.isSymbolicLink();
  const linkDest = (p) => path.resolve(fs.realpathSync(path.dirname(p)), fs.readlinkSync(p));
  // a link is "ours" when it points at the store, or at leftover copies under .agents/skills
  const ours = (p) => {
    if (!isLink(p)) return false;
    const dest = linkDest(p);
    return dest.startsWith(store + path.sep) || dest.startsWith(agents + path.sep);
  };
  // npx skills writes original-name folders into .agents/skills; keep those files in .skills-store
  const ensureStored = (name) => {
    const stored = path.join(store, name);
    const fromAgents = path.join(agents, name);
    const fromAgentsStat = fs.lstatSync(fromAgents, { throwIfNoEntry: false });
    if (fromAgentsStat && !fromAgentsStat.isSymbolicLink()) {
      fs.mkdirSync(store, { recursive: true });
      if (fs.existsSync(stored)) fs.rmSync(stored, { recursive: true, force: true });
      fs.renameSync(fromAgents, stored);
    }
    return fs.existsSync(stored) ? stored : null;
  };

  // every skill in the lock gets a link; the config only decides names and target folders
  if (include) console.log('warning: "include" is no longer used; every skill gets a link. Delete it from the config');

  // warn about overrides that match no skill in the lock (typo, or author renamed it)
  for (const n of Object.keys(overrides)) {
    if (!(n in lock)) console.log(`warning: config names "${n}" but it is not in skills-lock.json`);
  }

  const used = new Map(); // final name -> skill that owns it
  for (const [name, { source }] of Object.entries(lock)) {
    const prefix = rules.find((r) => r.source === source)?.prefix ?? "";
    const linkName = overrides[name] ?? prefix + name;
    if (used.has(linkName)) {
      console.log(`warning: skip ${name}: final name "${linkName}" is already used by ${used.get(linkName)}`);
      continue;
    }
    used.set(linkName, name);
    const target = ensureStored(name);
    if (!target) {
      console.log(`skip ${name}: not installed (run: skills-config restore)`);
      continue;
    }
    const linked = [];
    for (const t of targets) {
      const out = path.join(project, t);
      fs.mkdirSync(out, { recursive: true });
      // drop the CLI's own link under the original name (only if it points into the hub)
      if (name !== linkName && ours(path.join(out, name))) fs.unlinkSync(path.join(out, name));
      const dest = path.join(out, linkName);
      if (fs.lstatSync(dest, { throwIfNoEntry: false })) {
        // never overwrite a real folder, or a link that does not point into the hub
        if (!ours(dest)) {
          console.log(`warning: skip ${t}/${linkName}: something else already exists there`);
          continue;
        }
        fs.unlinkSync(dest);
      }
      fs.symlinkSync(path.relative(fs.realpathSync(out), target), dest);
      linked.push(t);
    }
    if (linked.length) console.log(`/${linkName}  <-  ${name} (${source})  in ${linked.join(", ")}`);
  }

  // remove hub links that the config no longer asks for (left behind by include/override changes)
  for (const t of targets) {
    const out = path.join(project, t);
    for (const e of fs.readdirSync(out)) {
      if (!used.has(e) && ours(path.join(out, e))) {
        fs.unlinkSync(path.join(out, e));
        console.log(`removed stale link: ${t}/${e}`);
      }
    }
  }
} else {
  console.log("usage: skills-config [--hub <folder>] init | restore | create [projectDir]");
  console.log(`hub: ${hub}`);
  process.exit(1);
}
