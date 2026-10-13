import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { chatBotMessages } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFoundError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { insertChatBotThreadWithRunEffect } from "#/modules/chat-bot/queries";
import type { ChatBotOwner } from "#/modules/chat-bot/types";
import { getCustomerThreadSvc, listCustomerThreadsSvc } from "#/modules/customer-thread";
import { createTestDb, insertMember, insertPersonWithLogin, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;

const startThread = async (tenantId: string, owner?: ChatBotOwner) =>
  (
    await Effect.runPromise(
      insertChatBotThreadWithRunEffect(db, {
        owner: owner ?? { kind: "anonymous", tenantId, anonymousId: crypto.randomUUID() },
        title: "Question",
        trigger: owner?.kind === "user" ? "chat" : "widget",
        module: owner?.kind === "user" ? "chat" : "customer",
        runId: crypto.randomUUID(),
      }),
    )
  ).id;

// -----
// A Customer exchange; offset keeps messages in a
// known order, whatever the clock says.
// -----
const addExchange = async (
  tenantId: string,
  threadId: string,
  question: string,
  topic: string | null,
  minutesAgo: number,
) => {
  await db.insert(chatBotMessages).values({
    threadId,
    tenantId,
    role: "user",
    content: question,
    createdAt: sql`now() - make_interval(mins => ${minutesAgo})`,
  });
  await db.insert(chatBotMessages).values({
    threadId,
    tenantId,
    role: "assistant",
    content: "Answer.",
    toolsUsed: topic ? ["reportMissingInformation"] : [],
    structure: topic
      ? { reportMissingInformation: { display: null, displayOptions: null, results: [{ topic }] } }
      : null,
    createdAt: sql`now() - make_interval(mins => ${minutesAgo}) + interval '1 second'`,
  });
};

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
});

describe("Customer threads", () => {
  it("lists only this Tenant's Customer threads, newest activity first, with counts", async () => {
    const older = await startThread(sorellaId);
    const newer = await startThread(sorellaId);
    const theirs = await startThread(otherCafeId);
    await addExchange(sorellaId, older, "Is there parking?", "parking", 30);
    await addExchange(sorellaId, newer, "Are you open?", null, 5);
    await addExchange(otherCafeId, theirs, "Do you cater?", "catering", 1);

    const list = await runEffect(listCustomerThreadsSvc(db, sorellaId));

    expect(list.map((t) => t.id)).toEqual([newer, older]);
    expect(list.map((t) => [t.messageCount, t.unansweredCount])).toEqual([
      [2, 0],
      [2, 1],
    ]);
    expect(JSON.stringify(list)).not.toContain("anonymous");
  });

  it("does not list a signed-in staff thread", async () => {
    const { userId, partyId } = await insertPersonWithLogin(db, "owner@sorella.test");
    await insertMember(db, sorellaId, partyId, "owner");
    const staff = await startThread(sorellaId, { kind: "user", tenantId: sorellaId, userId });
    await addExchange(sorellaId, staff, "Staff question", null, 2);

    const list = await runEffect(listCustomerThreadsSvc(db, sorellaId));

    expect(list.some((t) => t.id === staff)).toBe(false);
  });

  it("opens a thread with its Messages in order, and the Missing topic on the reply", async () => {
    const thread = await startThread(sorellaId);
    await addExchange(sorellaId, thread, "Do you have a patio?", "patio", 3);

    const detail = await runEffect(getCustomerThreadSvc(db, sorellaId, thread));

    expect(detail.messages.map((m) => [m.role, m.content, m.missingTopics])).toEqual([
      ["user", "Do you have a patio?", []],
      ["assistant", "Answer.", ["patio"]],
    ]);
  });

  it("gives 404 for another Tenant's thread, a staff thread, and an unknown id", async () => {
    const theirs = await startThread(otherCafeId);
    await addExchange(otherCafeId, theirs, "Hi", null, 1);
    const { userId } = await insertPersonWithLogin(db, "staff2@sorella.test");
    const staff = await startThread(sorellaId, { kind: "user", tenantId: sorellaId, userId });

    await expect(runEffect(getCustomerThreadSvc(db, sorellaId, theirs))).rejects.toBeInstanceOf(NotFoundError);
    await expect(runEffect(getCustomerThreadSvc(db, sorellaId, staff))).rejects.toBeInstanceOf(NotFoundError);
    await expect(runEffect(getCustomerThreadSvc(db, sorellaId, crypto.randomUUID()))).rejects.toBeInstanceOf(NotFoundError);
  });
});
