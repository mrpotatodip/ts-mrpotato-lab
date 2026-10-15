import { describe, expect, it } from "vitest";
import { Effect, Either } from "effect";
import type { ChatBotOwner, ChatBotStore } from "../types";

// -----
// What the contract needs from a host to run:
// a store, and ids the store can really keep.
//   scopes   two scopes (tenants, orgs, ...) the
//            store holds rows for
//   users    two users that may own threads in
//            either scope
//   start    a trigger and module a thread may
//            start with
//   refused  a trigger and module the store must
//            refuse, or null if it takes any
// -----
export type ChatBotStoreHarness = {
  store: ChatBotStore;
  scopes: { a: string; b: string };
  users: { one: string; two: string };
  start: { trigger: string; module: string };
  refused: { trigger: string; module: string } | null;
};

// -----
// A store orders by when a row was stored. Space the
// writes out so a coarse clock cannot tie them.
// -----
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

const run = <A, E extends { readonly _tag: string }>(effect: Effect.Effect<A, E>) =>
  Effect.runPromise(Effect.either(effect));
const ok = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

const tagOf = <A, E extends { readonly _tag: string }>(result: Either.Either<A, E>): string | null =>
  Either.isLeft(result) ? result.left._tag : null;

// -----
// The rules every ChatBotStore must keep, whatever
// it is built on. A host runs this against its own
// store, once, and the engine's guarantees hold:
// a thread is visible to its owner alone, a run id
// is taken once, a delete takes everything with it.
// -----
export function describeChatBotStoreContract(
  name: string,
  makeHarness: () => Promise<ChatBotStoreHarness>,
): void {
  describe(`ChatBotStore contract: ${name}`, () => {
    const setup = async () => {
      const harness = await makeHarness();
      const { store, scopes, users, start } = harness;
      const userOne: ChatBotOwner = { kind: "user", scopeId: scopes.a, userId: users.one };
      const userTwo: ChatBotOwner = { kind: "user", scopeId: scopes.a, userId: users.two };
      const userOneElsewhere: ChatBotOwner = { kind: "user", scopeId: scopes.b, userId: users.one };
      const guest: ChatBotOwner = { kind: "anonymous", scopeId: scopes.a, anonymousId: crypto.randomUUID() };
      const startThread = async (owner: ChatBotOwner, title = "Hello") => {
        const runId = crypto.randomUUID();
        const thread = await ok(
          store.insertThreadWithRun({ owner, title, runId, ...start }),
        );
        return { threadId: thread.id, runId };
      };
      return { ...harness, userOne, userTwo, userOneElsewhere, guest, startThread };
    };

    it("starts a thread with its first run, and only the owner sees either", async () => {
      const { store, userOne, userTwo, userOneElsewhere, guest, startThread } = await setup();
      const { threadId, runId } = await startThread(userOne);

      expect(await ok(store.lookupRun(userOne, runId))).toEqual({ id: runId, threadId });
      expect(await ok(store.findThread(userOne, threadId))).toMatchObject({ id: threadId, title: "Hello" });
      for (const stranger of [userTwo, userOneElsewhere, guest]) {
        expect(await ok(store.lookupRun(stranger, runId))).toBeNull();
        expect(tagOf(await run(store.findThread(stranger, threadId)))).toBe("NotFound");
      }
    });

    it("keeps a run id taken once: Conflict, and no second thread", async () => {
      const { store, userOne, start, startThread } = await setup();
      const { runId, threadId } = await startThread(userOne);

      const again = await run(
        store.insertThreadWithRun({ owner: userOne, title: "Again", runId, ...start }),
      );
      const onThread = await run(store.insertRun({ runId, threadId }));

      expect(tagOf(again)).toBe("Conflict");
      expect(tagOf(onThread)).toBe("Conflict");
      expect((await ok(store.listThreads(userOne, {}))).filter((t) => t.title === "Again")).toEqual([]);
    });

    it("adds a run to an existing thread, and refuses an unknown one", async () => {
      const { store, userOne, startThread } = await setup();
      const { threadId } = await startThread(userOne);
      const second = crypto.randomUUID();

      await ok(store.insertRun({ runId: second, threadId }));

      expect(await ok(store.lookupRun(userOne, second))).toEqual({ id: second, threadId });
      const missing = await run(
        store.insertRun({ runId: crypto.randomUUID(), threadId: crypto.randomUUID() }),
      );
      expect(tagOf(missing)).toBe("NotFound");
    });

    it("lists the last N messages, oldest first, as role and content", async () => {
      const { store, userOne, scopes, startThread } = await setup();
      const { threadId } = await startThread(userOne);

      await ok(store.insertUserMessage({ threadId, scopeId: scopes.a, content: "one" }));
      await tick();
      await ok(
        store.insertAssistantMessage({
          threadId,
          scopeId: scopes.a,
          content: "two",
          toolsUsed: [],
          structure: {},
        }),
      );
      await tick();
      await ok(store.insertUserMessage({ threadId, scopeId: scopes.a, content: "three" }));

      expect(await ok(store.listMessagesForModel(threadId, 10))).toEqual([
        { role: "user", content: "one" },
        { role: "assistant", content: "two" },
        { role: "user", content: "three" },
      ]);
      expect(await ok(store.listMessagesForModel(threadId, 2))).toEqual([
        { role: "assistant", content: "two" },
        { role: "user", content: "three" },
      ]);
    });

    it("reads a thread back with its messages, cards and ISO dates", async () => {
      const { store, userOne, userTwo, scopes, startThread } = await setup();
      const { threadId } = await startThread(userOne);
      const structure = { lookup: { display: null, displayOptions: null, results: [{ ok: true }] } };

      await ok(store.insertUserMessage({ threadId, scopeId: scopes.a, content: "Hi" }));
      await tick();
      await ok(
        store.insertAssistantMessage({
          threadId,
          scopeId: scopes.a,
          content: "Hello",
          toolsUsed: ["lookup"],
          structure,
        }),
      );

      const detail = await ok(store.getThread(userOne, threadId));
      expect(detail).toMatchObject({ id: threadId, title: "Hello" });
      expect(detail.messages.map((m) => [m.role, m.content])).toEqual([
        ["user", "Hi"],
        ["assistant", "Hello"],
      ]);
      expect(detail.messages[1]).toMatchObject({ toolsUsed: ["lookup"], structure });
      expect(Number.isNaN(Date.parse(detail.messages[0]?.createdAt ?? ""))).toBe(false);
      expect(tagOf(await run(store.getThread(userTwo, threadId)))).toBe("NotFound");
    });

    it("lists only the owner's threads, newest activity first, and filters them", async () => {
      const { store, userOne, userTwo, scopes, startThread } = await setup();
      const first = await startThread(userOne, "first");
      await tick();
      const second = await startThread(userOne, "second");
      await startThread(userTwo, "not mine");
      await tick();

      await ok(
        store.insertAssistantMessage({
          threadId: first.threadId,
          scopeId: scopes.a,
          content: "bump",
          toolsUsed: [],
          structure: {},
        }),
      );

      const mine = await ok(store.listThreads(userOne, {}));
      const ids = mine.map((t) => t.id);
      expect(ids).toContain(first.threadId);
      expect(ids).toContain(second.threadId);
      expect(mine.map((t) => t.title)).not.toContain("not mine");
      expect(ids.indexOf(first.threadId)).toBeLessThan(ids.indexOf(second.threadId));
      expect(await ok(store.listThreads(userOne, { trigger: "no_such_trigger" }))).toEqual([]);
    });

    it("renames a thread for its owner only", async () => {
      const { store, userOne, userTwo, startThread } = await setup();
      const { threadId } = await startThread(userOne);

      const renamed = await ok(store.renameThread(userOne, threadId, "New name"));

      expect(renamed).toMatchObject({ id: threadId, title: "New name" });
      expect(tagOf(await run(store.renameThread(userTwo, threadId, "Mine now")))).toBe("NotFound");
      expect((await ok(store.findThread(userOne, threadId))).title).toBe("New name");
    });

    it("deletes a thread for its owner only, and takes its runs with it", async () => {
      const { store, userOne, userTwo, startThread } = await setup();
      const { threadId, runId } = await startThread(userOne);

      expect(tagOf(await run(store.deleteThread(userTwo, threadId)))).toBe("NotFound");
      expect(await ok(store.deleteThread(userOne, threadId))).toEqual({ id: threadId });

      expect(tagOf(await run(store.findThread(userOne, threadId)))).toBe("NotFound");
      expect(await ok(store.lookupRun(userOne, runId))).toBeNull();
      expect(tagOf(await run(store.deleteThread(userOne, threadId)))).toBe("NotFound");
    });

    it("reports the running run until it is closed", async () => {
      const { store, userOne, startThread } = await setup();
      const { threadId, runId } = await startThread(userOne);

      expect(await ok(store.findActiveRun(threadId))).toEqual({ id: runId });

      await ok(
        store.recordRunUsage(runId, { model: "m", inputTokens: 1, cachedTokens: 0, outputTokens: 2 }),
      );
      await ok(store.closeRun(runId, "completed"));

      expect(await ok(store.findActiveRun(threadId))).toBeNull();
    });

    it("keeps an anonymous thread readable by its own id only, and survives an extend", async () => {
      const { store, guest, scopes, startThread } = await setup();
      const { threadId } = await startThread(guest);
      const otherGuest: ChatBotOwner = { ...guest, anonymousId: crypto.randomUUID() };
      const elsewhere: ChatBotOwner = { ...guest, scopeId: scopes.b };

      await ok(store.extendAnonymousThread(threadId));

      expect(await ok(store.findThread(guest, threadId))).toMatchObject({ id: threadId });
      expect(tagOf(await run(store.findThread(otherGuest, threadId)))).toBe("NotFound");
      expect(tagOf(await run(store.findThread(elsewhere, threadId)))).toBe("NotFound");
    });

    it("accepts the trigger and module a thread starts with, and refuses unknown ones", async () => {
      const { store, start, refused } = await setup();

      await ok(store.assertThreadStart(start));

      const verdict = refused ? tagOf(await run(store.assertThreadStart(refused))) : "Invalid";
      expect(verdict).toBe("Invalid");
    });
  });
}
