import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";
import { createDrizzleChatBotStore } from "../drizzle";
import { createChatBotTables } from "../drizzle/tables";
import { describeChatBotStoreContract } from "../testing";

const ddl = readFileSync(new URL("../../sql/chat-bot-api.sql", import.meta.url), "utf8");

// -----
// The shipped SQL on a real (in-process)
// Postgres, and the store on top of it.
// -----
describeChatBotStoreContract("Drizzle store on PGlite", async () => {
  const pg = new PGlite();
  await pg.exec(ddl);
  return {
    store: createDrizzleChatBotStore({
      db: drizzle(pg),
      triggers: ["chat", "widget"],
      modules: ["chat", "customer"],
    }),
    scopes: { a: "scope-a", b: "scope-b" },
    users: { one: "user-one", two: "user-two" },
    start: { trigger: "chat", module: "chat" },
    refused: { trigger: "nope", module: "chat" },
  };
});

describe("a prefix keeps the engine's tables apart from the host's", () => {
  it("creates its own tables and works through them", async () => {
    const pg = new PGlite();
    await pg.exec(ddl.replaceAll("chat_bot_", "notes_"));
    const tables = createChatBotTables("notes");
    const store = createDrizzleChatBotStore({ db: drizzle(pg), tables });

    const { Effect } = await import("effect");
    const thread = await Effect.runPromise(
      store.insertThreadWithRun({
        owner: { kind: "user", scopeId: "s", userId: "u" },
        title: "Hi",
        trigger: "chat",
        module: "chat",
        runId: "run-1",
        attrs: { place: "kitchen" },
      }),
    );

    const rows = await pg.query<{ attrs: unknown }>("SELECT attrs FROM notes_thread_sessions");
    expect(thread.id).toBeTruthy();
    expect(rows.rows[0]?.attrs).toEqual({ place: "kitchen" });
  });
});
