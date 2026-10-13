import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { DbError, NotFound } from "#/lib/effect-query";
import { getChatBotThreadSvc, listChatBotThreadsSvc } from "#/modules/chat-bot/handlers";
import { stubDb } from "./chat-bot-stub-db";

const threadId = "11111111-1111-4111-8111-111111111111";

const threadRow = {
  id: threadId,
  createdAt: new Date("2026-09-04T00:00:00.000Z"),
  updatedAt: new Date("2026-09-04T00:00:00.000Z"),
  title: "How many?",
  trigger: "chat",
  module: "chat",
};

describe("listChatBotThreadsSvc", () => {
  it("returns this user's threads with ISO dates", async () => {
    const result = await Effect.runPromise(listChatBotThreadsSvc(stubDb([threadRow]), "user-1"));

    expect(result).toEqual([
      {
        ...threadRow,
        createdAt: "2026-09-04T00:00:00.000Z",
        updatedAt: "2026-09-04T00:00:00.000Z",
      },
    ]);
  });

  it("fails with DbError when the read fails", async () => {
    const error = await Effect.runPromise(
      Effect.flip(listChatBotThreadsSvc(stubDb(new Error("connection reset")), "user-1")),
    );

    expect(error).toBeInstanceOf(DbError);
  });
});

describe("getChatBotThreadSvc", () => {
  it("returns stored messages for a thread the user owns", async () => {
    const db = stubDb(
      [{ id: threadId, title: "How many?", trigger: "chat", module: "chat" }],
      [
        {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          role: "user",
          content: "How many?",
          toolsUsed: [],
          structure: null,
          createdAt: new Date("2026-09-04T00:00:00.000Z"),
        },
        {
          id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          role: "assistant",
          content: "That comes to **5**.",
          toolsUsed: ["addTwoNumbers"],
          structure: {
            addTwoNumbers: { display: null, displayOptions: null, results: [{ a: 2, b: 3, sum: 5 }] },
          },
          createdAt: new Date("2026-09-04T00:00:01.000Z"),
        },
      ],
    );

    const result = await Effect.runPromise(getChatBotThreadSvc(db, "user-1", threadId));

    expect(result).toMatchObject({
      id: threadId,
      title: "How many?",
      messages: [
        { role: "user", content: "How many?", createdAt: "2026-09-04T00:00:00.000Z" },
        { role: "assistant", toolsUsed: ["addTwoNumbers"] },
      ],
    });
  });

  it("fails with NotFound when the thread is missing or not owned", async () => {
    const error = await Effect.runPromise(
      Effect.flip(getChatBotThreadSvc(stubDb([]), "user-1", threadId)),
    );

    expect(error).toBeInstanceOf(NotFound);

    expect(error).toHaveProperty("message", "Chat thread not found");
  });
});
