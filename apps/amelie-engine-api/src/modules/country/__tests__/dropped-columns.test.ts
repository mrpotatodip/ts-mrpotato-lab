import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ENGINE_SRC = fileURLToPath(new URL("../../../", import.meta.url).href);
const DB_SRC = fileURLToPath(new URL("../../../../../../packages/db-amelie/src/", import.meta.url).href);
const SELF = "dropped-columns.test.ts";
const REPLAYS_OLD_SCHEMA = /(migration|backfill)\.test\.ts$/;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(`${path}/`);
    return entry.name.endsWith(".ts") && entry.name !== SELF && !REPLAYS_OLD_SCHEMA.test(entry.name) ? [path] : [];
  });

// -----
// Migration 0026 dropped these columns. Any use of
// them in code (Drizzle or raw SQL) is a bug. Tests
// that replay old migrations on purpose are skipped.
// -----
const DROPPED = [
  /\btenants\.(country|currency)\b/,
  /\btenantMenuItems\.(price|variants)\b/,
  /\btenant_menu_items\.(price|variants)\b/,
  /\bt\.(country|currency)\b.*\btenants\b/,
];

describe("columns dropped by migration 0026", () => {
  it("are not referenced by any engine or db-amelie source file", () => {
    const hits = [...sourceFiles(ENGINE_SRC), ...sourceFiles(DB_SRC)].flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, index) => (DROPPED.some((pattern) => pattern.test(line)) ? [`${file}:${index + 1}: ${line.trim()}`] : [])),
    );
    expect(hits).toEqual([]);
  });
});
