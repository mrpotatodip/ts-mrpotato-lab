import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { chatBotMessages, chatBotThreads, chatBotThreadSessions } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import {
  extendAnonymousChatBotThreadEffect,
  findChatBotThreadEffect,
  getChatBotThreadForOwnerEffect,
  insertChatBotThreadWithRunEffect,
  insertChatBotUserMessageEffect,
  listChatBotThreadsForOwnerEffect,
  lookupChatBotRunEffect,
} from "#/modules/chat-bot/queries";
import type { ChatBotOwner } from "#/modules/chat-bot/types";
import { createTestDb, insertMember, insertPersonWithLogin, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;
let customer: ChatBotOwner;
let member: ChatBotOwner;
let anonymousThreadId: string;
let memberThreadId: string;

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.either(effect));

const startThread = async (owner: ChatBotOwner, runId: string) =>
  (
    await Effect.runPromise(
      insertChatBotThreadWithRunEffect(db, {
        owner,
        title: "Hi",
        trigger: owner.kind === "user" ? "chat" : "widget",
        module: owner.kind === "user" ? "chat" : "customer",
        runId,
      }),
    )
  ).id;

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
  const login = await insertPersonWithLogin(db, "owner@sorella.test");
  await insertMember(db, sorellaId, login.partyId, "tenant_admin");
  customer = { kind: "anonymous", tenantId: sorellaId, anonymousId: crypto.randomUUID() };
  member = { kind: "user", tenantId: sorellaId, userId: login.userId };
  anonymousThreadId = await startThread(customer, "run-anon");
  memberThreadId = await startThread(member, "run-member");
  await Effect.runPromise(
    insertChatBotUserMessageEffect(db, { threadId: anonymousThreadId, tenantId: sorellaId, content: "Open?" }),
  );
});

describe("anonymous threads", () => {
  it("belong to exactly one Tenant, with the Customer's id and an expiry (spec test 3)", async () => {
    const [row] = await db
      .select()
      .from(chatBotThreadSessions)
      .where(eq(chatBotThreadSessions.threadId, anonymousThreadId));

    expect(row).toMatchObject({ tenantId: sorellaId, userId: null, anonymousId: customer.kind === "anonymous" ? customer.anonymousId : "" });
    expect(row.expiresAt!.getTime()).toBeGreaterThan(new Date().getTime());
  });

  it("are readable with the matching anonymous id (spec test 4)", async () => {
    const thread = await Effect.runPromise(getChatBotThreadForOwnerEffect(db, customer, anonymousThreadId));

    expect(thread.messages.map((m) => m.content)).toEqual(["Open?"]);
  });

  it("refuse another browser's anonymous id", async () => {
    const stranger: ChatBotOwner = { kind: "anonymous", tenantId: sorellaId, anonymousId: crypto.randomUUID() };

    expect((await run(findChatBotThreadEffect(db, stranger, anonymousThreadId)))._tag).toBe("Left");
    expect(await Effect.runPromise(lookupChatBotRunEffect(db, stranger, "run-anon"))).toBeNull();
  });

  it("refuse the right anonymous id under another Tenant", async () => {
    const elsewhere: ChatBotOwner = { ...customer, tenantId: otherCafeId };

    expect((await run(findChatBotThreadEffect(db, elsewhere, anonymousThreadId)))._tag).toBe("Left");
  });

  it("refuse an expired thread", async () => {
    const expired: ChatBotOwner = { kind: "anonymous", tenantId: sorellaId, anonymousId: crypto.randomUUID() };
    const threadId = await startThread(expired, "run-expired");
    await db
      .update(chatBotThreadSessions)
      .set({ expiresAt: new Date("2000-01-01T00:00:00Z") })
      .where(eq(chatBotThreadSessions.threadId, threadId));

    expect((await run(findChatBotThreadEffect(db, expired, threadId)))._tag).toBe("Left");
  });

  it("slide their expiry forward on a message", async () => {
    const soon = new Date(new Date().getTime() + 60_000);
    await db
      .update(chatBotThreadSessions)
      .set({ expiresAt: soon })
      .where(eq(chatBotThreadSessions.threadId, anonymousThreadId));

    await Effect.runPromise(extendAnonymousChatBotThreadEffect(db, anonymousThreadId));
    const [row] = await db
      .select()
      .from(chatBotThreadSessions)
      .where(eq(chatBotThreadSessions.threadId, anonymousThreadId));

    expect(row.expiresAt!.getTime()).toBeGreaterThan(soon.getTime() + 20 * 60_000);
  });
});

describe("signed-in threads", () => {
  it("are scoped to the user and the Tenant they picked", async () => {
    const mine = await Effect.runPromise(listChatBotThreadsForOwnerEffect(db, member, {}));
    const elsewhere = await Effect.runPromise(
      listChatBotThreadsForOwnerEffect(db, { ...member, tenantId: otherCafeId }, {}),
    );

    expect(mine.map((t) => t.id)).toEqual([memberThreadId]);
    expect(elsewhere).toEqual([]);
  });

  it("are not visible to an anonymous Customer of the same Tenant", async () => {
    expect((await run(findChatBotThreadEffect(db, customer, memberThreadId)))._tag).toBe("Left");
  });
});

describe("chat_bot_messages tenant", () => {
  it("must match its thread's Tenant", async () => {
    await expect(
      db.insert(chatBotMessages).values({
        threadId: anonymousThreadId,
        tenantId: otherCafeId,
        role: "user",
        content: "sneaky",
      }),
    ).rejects.toMatchObject({ cause: { constraint: "chat_bot_messages_tenant_of_thread_fk" } });
  });
});

describe("chat_bot_thread_sessions owner shape", () => {
  it("rejects a row with both a login and an anonymous id", async () => {
    const [thread] = await db.insert(chatBotThreads).values({ title: "Both" }).returning();

    await expect(
      db.insert(chatBotThreadSessions).values({
        threadId: thread.id,
        tenantId: sorellaId,
        userId: member.kind === "user" ? member.userId : "",
        anonymousId: "x",
        expiresAt: new Date(),
      }),
    ).rejects.toMatchObject({ cause: { constraint: "chat_bot_thread_sessions_owner_shape" } });
  });
});
