import { describe, it, expect } from "vitest";
import { Cause, Effect, Exit } from "effect";
import { Conflict, DbError, Invalid, NotFound } from "#/lib/effect-query";
import {
  assertChatBotThreadLookupsEffect,
  findChatBotThreadEffect,
  insertChatBotRunEffect,
  insertChatBotThreadWithRunEffect,
  listChatBotMessagesForModelEffect,
  lookupChatBotRunEffect,
} from "#/modules/chat-bot/queries";
import { stubDb } from "./chat-bot-stub-db";

const failureOf = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

describe("chat-bot query effects", () => {
  it("findChatBotThreadEffect fails with NotFound when no row comes back", async () => {
    const error = await failureOf(findChatBotThreadEffect(stubDb([]), "user-1", "thread-1"));

    expect(error).toBeInstanceOf(NotFound);
  });

  it("findChatBotThreadEffect fails with DbError and keeps the driver error", async () => {
    const driverError = new Error("connection reset");

    const error = await failureOf(findChatBotThreadEffect(stubDb(driverError), "user-1", "thread-1"));

    expect(error).toBeInstanceOf(DbError);
    expect(error).toHaveProperty("cause", driverError);
  });

  it("assertChatBotThreadLookupsEffect fails with Invalid for a disabled module", async () => {
    const error = await failureOf(
      assertChatBotThreadLookupsEffect(stubDb([{ id: "chat" }], []), "chat", "nope"),
    );

    expect(error).toBeInstanceOf(Invalid);

    expect(error).toHaveProperty("message", "Unknown chat module: nope");
  });

  it("lookupChatBotRunEffect returns null rather than failing for an unknown run", async () => {
    const run = await Effect.runPromise(lookupChatBotRunEffect(stubDb([]), "user-1", "run-1"));

    expect(run).toBeNull();
  });

  it("insertChatBotRunEffect fails with Conflict when the run id is taken", async () => {
    const duplicate = new Error("insert failed", {
      cause: Object.assign(new Error("duplicate key"), { code: "23505" }),
    });

    const error = await failureOf(
      insertChatBotRunEffect(stubDb(duplicate), {
        runId: "run-1",
        threadId: "thread-1",
        agentId: "agent-1",
      }),
    );

    expect(error).toBeInstanceOf(Conflict);
  });

  it("insertChatBotRunEffect fails with NotFound when the thread was deleted meanwhile", async () => {
    const missingThread = Object.assign(new Error("fk violation"), { code: "23503" });

    const error = await failureOf(
      insertChatBotRunEffect(stubDb(missingThread), {
        runId: "run-1",
        threadId: "thread-1",
        agentId: "agent-1",
      }),
    );

    expect(error).toBeInstanceOf(NotFound);
  });

  it("insertChatBotRunEffect fails with DbError for any other driver error", async () => {
    const error = await failureOf(
      insertChatBotRunEffect(stubDb(new Error("connection reset")), {
        runId: "run-1",
        threadId: "thread-1",
        agentId: "agent-1",
      }),
    );

    expect(error).toBeInstanceOf(DbError);
  });

  it("assertChatBotThreadLookupsEffect fails with Invalid for an unknown trigger", async () => {
    const error = await failureOf(
      assertChatBotThreadLookupsEffect(stubDb([], [{ id: "chat" }]), "nope", "chat"),
    );

    expect(error).toBeInstanceOf(Invalid);

    expect(error).toHaveProperty("message", "Unknown chat trigger: nope");
  });

  it("assertChatBotThreadLookupsEffect fails with DbError when the read fails", async () => {
    const error = await failureOf(
      assertChatBotThreadLookupsEffect(stubDb(new Error("connection reset")), "chat", "chat"),
    );

    expect(error).toBeInstanceOf(DbError);
  });

  it("listChatBotMessagesForModelEffect dies when a row has drifted from the schema", async () => {
    const exit = await Effect.runPromiseExit(
      listChatBotMessagesForModelEffect(stubDb([{ role: "robot", content: 7 }]), "thread-1", 20),
    );

    expect(Exit.isFailure(exit) && Cause.isDie(exit.cause)).toBe(true);
  });

  describe("insertChatBotThreadWithRunEffect", () => {
    const params = {
      userId: "user-1",
      title: "Hi",
      trigger: "chat",
      module: "chat",
      runId: "run-1",
      agentId: "agent-1",
    };

    it("returns the new thread", async () => {
      const thread = await Effect.runPromise(
        insertChatBotThreadWithRunEffect(stubDb({ id: "thread-1" }), params),
      );

      expect(thread).toEqual({ id: "thread-1" });
    });

    it("fails with Conflict when the run id is taken", async () => {
      const duplicate = Object.assign(new Error("duplicate key"), { code: "23505" });

      const error = await failureOf(insertChatBotThreadWithRunEffect(stubDb(duplicate), params));

      expect(error).toBeInstanceOf(Conflict);
    });

    it("fails with Invalid when a trigger or module row was removed meanwhile", async () => {
      const missingLookup = Object.assign(new Error("fk violation"), { code: "23503" });

      const error = await failureOf(insertChatBotThreadWithRunEffect(stubDb(missingLookup), params));

      expect(error).toBeInstanceOf(Invalid);
    });
  });
});
