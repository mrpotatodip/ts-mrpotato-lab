#!/usr/bin/env node
// Stops dev servers on the lab's ports, but only processes started from this repo.
import { spawnSync } from "node:child_process";

const root = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout.trim();
const ports = process.argv.slice(2).length ? process.argv.slice(2) : ["3100", "8787", "8788", "5174"];

for (const port of ports) {
  const pids = spawnSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" }).stdout.split("\n").filter(Boolean);
  for (const pid of pids) {
    const command = spawnSync("ps", ["-o", "command=", "-p", pid], { encoding: "utf8" }).stdout;
    if (!command.includes(root)) {
      console.log(`port ${port}: pid ${pid} is not from this repo, left alone`);
      continue;
    }
    process.kill(Number(pid), "SIGTERM");
    console.log(`port ${port}: stopped pid ${pid}`);
  }
}
