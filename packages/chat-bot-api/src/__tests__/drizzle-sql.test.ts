import { readFileSync } from "node:fs";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { chatBotTables } from "../drizzle/tables";

const sql = readFileSync(new URL("../../sql/chat-bot-api.sql", import.meta.url), "utf8");

// -----
// The hand-written SQL must keep up with the
// Drizzle tables: names, types, nullability.
// -----
describe.each([
  ["chat_bot_threads", chatBotTables.threads],
  ["chat_bot_thread_sessions", chatBotTables.threadSessions],
  ["chat_bot_runs", chatBotTables.runs],
  ["chat_bot_messages", chatBotTables.messages],
] satisfies Array<[string, PgTable]>)("sql/chat-bot-api.sql for %s", (name, table) => {
  const config = getTableConfig(table);

  it("creates the table", () => {
    expect(config.name).toBe(name);
    expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "${name}"`);
  });

  it.each(config.columns.map((column) => [column.name, column]))(
    "declares %s with its type and nullability",
    (_name, column) => {
      const declaration = `"${column.name}" ${column.getSQLType()}`;
      const line = sql.split("\n").find((text) => text.trim().startsWith(declaration));
      expect(line).toBeDefined();
      expect(line?.includes("NOT NULL")).toBe(column.notNull);
    },
  );

  it("declares its foreign keys, checks and indexes by name", () => {
    const names = [
      ...config.foreignKeys.map((key) => key.getName()),
      ...config.checks.map((check) => check.name),
      ...config.indexes.map((index) => index.config.name),
    ];
    for (const constraint of names) expect(sql).toContain(`"${constraint}"`);
  });
});
