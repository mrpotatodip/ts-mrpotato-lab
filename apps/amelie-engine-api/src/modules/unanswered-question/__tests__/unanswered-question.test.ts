import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { chatBotMessages } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { NotFoundError } from "#/lib/errors";
import { runEffect } from "#/lib/effect-query";
import { insertChatBotThreadWithRunEffect } from "#/modules/chat-bot/queries";
import type { ChatBotOwner } from "#/modules/chat-bot/types";
import { dismissUnansweredQuestionSvc, listUnansweredQuestionsSvc } from "#/modules/unanswered-question";
import { createTestDb, insertMember, insertPersonWithLogin, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let sorellaId: string;
let otherCafeId: string;

const startThread = async (tenantId: string, owner?: ChatBotOwner) =>
  (
    await Effect.runPromise(
      insertChatBotThreadWithRunEffect(db, {
        owner: owner ?? { kind: "anonymous", tenantId, anonymousId: crypto.randomUUID() },
        title: "Hi",
        trigger: owner?.kind === "user" ? "chat" : "widget",
        module: owner?.kind === "user" ? "chat" : "customer",
        runId: crypto.randomUUID(),
      }),
    )
  ).id;

const missingStructure = (topic: string) => ({
  reportMissingInformation: { display: null, results: [{ topic }], displayOptions: null },
});

// -----
// One Customer exchange: the question, then a
// reply that may report a Missing topic.
// -----
const addExchange = async (
  tenantId: string,
  threadId: string,
  question: string,
  topic: string | null,
  ageDays = 0,
) => {
  const at = sql`now() - make_interval(days => ${ageDays})`;
  await db.insert(chatBotMessages).values({ threadId, tenantId, role: "user", content: question, createdAt: at });
  const [reply] = await db
    .insert(chatBotMessages)
    .values({
      threadId,
      tenantId,
      role: "assistant",
      content: "Sorry, we don't have that.",
      toolsUsed: topic ? ["reportMissingInformation"] : ["listFaqs"],
      structure: topic ? missingStructure(topic) : null,
      createdAt: sql`now() - make_interval(days => ${ageDays}) + interval '1 second'`,
    })
    .returning();
  return reply.id;
};

beforeAll(async () => {
  db = await createTestDb();
  sorellaId = await insertTenant(db, "Sorella Cafe", "sorella");
  otherCafeId = await insertTenant(db, "Other Cafe", "other-cafe");
});

describe("unanswered questions", () => {
  it("lists only this Tenant's replies that reported a Missing topic, newest first, with the question", async () => {
    const mine = await startThread(sorellaId);
    const theirs = await startThread(otherCafeId);
    await addExchange(sorellaId, mine, "Is there parking?", "parking", 2);
    await addExchange(sorellaId, mine, "Do you sell gift cards?", null, 1);
    await addExchange(sorellaId, mine, "Do you have a patio?", "patio", 0);
    await addExchange(otherCafeId, theirs, "Do you cater?", "catering", 0);

    const list = await runEffect(listUnansweredQuestionsSvc(db, sorellaId));

    expect(list.questions.map((q) => [q.question, q.topics])).toEqual([
      ["Do you have a patio?", ["patio"]],
      ["Is there parking?", ["parking"]],
    ]);
  });

  it("does not show a signed-in staff thread", async () => {
    const { userId, partyId } = await insertPersonWithLogin(db, "owner@sorella.test");
    await insertMember(db, sorellaId, partyId, "owner");
    const staff = await startThread(sorellaId, { kind: "user", tenantId: sorellaId, userId });
    await addExchange(sorellaId, staff, "Staff asks about parking", "staff-parking");

    const list = await runEffect(listUnansweredQuestionsSvc(db, sorellaId));

    expect(list.questions.some((q) => q.topics.includes("staff-parking"))).toBe(false);
  });

  it("counts the week, and dismissing a row removes it and lowers the count", async () => {
    const thread = await startThread(sorellaId);
    const messageId = await addExchange(sorellaId, thread, "Is there a high chair?", "high chair");
    const before = await runEffect(listUnansweredQuestionsSvc(db, sorellaId));

    await runEffect(dismissUnansweredQuestionSvc(db, sorellaId, messageId));
    const after = await runEffect(listUnansweredQuestionsSvc(db, sorellaId));

    expect(after.questions.some((q) => q.messageId === messageId)).toBe(false);
    expect(after.summary.weekUnanswered).toBe(before.summary.weekUnanswered - 1);
    expect(after.summary.weekQuestions).toBe(before.summary.weekQuestions);
  });

  it("leaves out rows older than the 7-day week from the count, not from the list", async () => {
    const thread = await startThread(sorellaId);
    const before = await runEffect(listUnansweredQuestionsSvc(db, sorellaId));
    await addExchange(sorellaId, thread, "Old question", "old topic", 10);

    const after = await runEffect(listUnansweredQuestionsSvc(db, sorellaId));

    expect(after.summary).toEqual(before.summary);
    expect(after.questions.some((q) => q.topics.includes("old topic"))).toBe(true);
  });

  it("dismisses twice without an error, but never another Tenant's row or a plain reply", async () => {
    const mine = await startThread(sorellaId);
    const theirs = await startThread(otherCafeId);
    const messageId = await addExchange(sorellaId, mine, "Is there Wi-Fi?", "wifi");
    const plainId = await addExchange(sorellaId, mine, "Hours?", null);
    const otherId = await addExchange(otherCafeId, theirs, "Do you cater?", "catering 2");

    await runEffect(dismissUnansweredQuestionSvc(db, sorellaId, messageId));
    await runEffect(dismissUnansweredQuestionSvc(db, sorellaId, messageId));

    await expect(runEffect(dismissUnansweredQuestionSvc(db, sorellaId, otherId))).rejects.toBeInstanceOf(NotFoundError);
    await expect(runEffect(dismissUnansweredQuestionSvc(db, sorellaId, plainId))).rejects.toBeInstanceOf(NotFoundError);
    const theirList = await runEffect(listUnansweredQuestionsSvc(db, otherCafeId));
    expect(theirList.questions.some((q) => q.messageId === otherId)).toBe(true);
  });
});
