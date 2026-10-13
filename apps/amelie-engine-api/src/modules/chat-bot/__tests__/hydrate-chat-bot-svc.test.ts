import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { NotFound } from "#/lib/effect-query";
import { hydrateChatBotSvc } from "#/modules/chat-bot/handlers";
import { stubDb } from "./chat-bot-stub-db";

const threadId = "11111111-1111-4111-8111-111111111111";
const threadRef = { id: threadId, title: "How many?", trigger: "chat", module: "chat" };

describe("hydrateChatBotSvc", () => {
  it("returns stored turns and the live run id when one is still running", async () => {
    const db = stubDb(
      [threadRef],
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
      [{ id: "run-1" }],
    );

    const result = await Effect.runPromise(hydrateChatBotSvc(db, "user-1", threadId));

    expect(result.activeRun).toEqual({ runId: "run-1" });
    expect(result.messages[0]?.parts[0]).toMatchObject({
      type: "text",
      content: "How many?",
    });
    expect(result.messages[1]).toMatchObject({
      role: "assistant",
      parts: [{ type: "text", content: "That comes to **5**." }],
      metadata: {
        chatBot: {
          toolsUsed: ["addTwoNumbers"],
          structure: {
            addTwoNumbers: { display: null, displayOptions: null, results: [{ a: 2, b: 3, sum: 5 }] },
          },
        },
      },
    });
  });

  it("returns a null active run when the thread is idle", async () => {
    const result = await Effect.runPromise(
      hydrateChatBotSvc(stubDb([threadRef], [], []), "user-1", threadId),
    );

    expect(result).toEqual({ messages: [], activeRun: null });
  });

  it("fails with NotFound before reading runs when the thread is not the user's", async () => {
    const error = await Effect.runPromise(
      Effect.flip(hydrateChatBotSvc(stubDb([]), "user-1", threadId)),
    );

    expect(error).toBeInstanceOf(NotFound);
  });
});
