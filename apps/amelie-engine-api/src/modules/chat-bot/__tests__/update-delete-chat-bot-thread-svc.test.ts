import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { DbError, NotFound } from "#/lib/effect-query";
import { deleteChatBotThreadSvc, updateChatBotThreadTitleSvc } from "#/modules/chat-bot/handlers";
import { stubDb } from "./chat-bot-stub-db";

const threadId = "11111111-1111-4111-8111-111111111111";

describe("updateChatBotThreadTitleSvc", () => {
  it("renames a thread the user owns", async () => {
    const db = stubDb([
      {
        id: threadId,
        createdAt: new Date("2026-09-04T00:00:00.000Z"),
        updatedAt: new Date("2026-09-04T00:00:01.000Z"),
        title: "Watchlist",
        trigger: "chat",
        module: "chat",
      },
    ]);

    const result = await Effect.runPromise(
      updateChatBotThreadTitleSvc(db, "user-1", threadId, "Watchlist"),
    );

    expect(result).toEqual({
      id: threadId,
      createdAt: "2026-09-04T00:00:00.000Z",
      updatedAt: "2026-09-04T00:00:01.000Z",
      title: "Watchlist",
      trigger: "chat",
      module: "chat",
    });
  });

  it("fails with NotFound when the thread is missing or not owned", async () => {
    const error = await Effect.runPromise(
      Effect.flip(updateChatBotThreadTitleSvc(stubDb([]), "user-1", threadId, "Nope")),
    );

    expect(error).toBeInstanceOf(NotFound);
  });
});

describe("deleteChatBotThreadSvc", () => {
  it("deletes a thread the user owns", async () => {
    const result = await Effect.runPromise(
      deleteChatBotThreadSvc(stubDb([{ id: threadId }]), "user-1", threadId),
    );

    expect(result).toEqual({ id: threadId });
  });

  it("fails with NotFound when the thread is missing or not owned", async () => {
    const error = await Effect.runPromise(
      Effect.flip(deleteChatBotThreadSvc(stubDb([]), "user-1", threadId)),
    );

    expect(error).toBeInstanceOf(NotFound);
  });

  it("fails with DbError when the delete fails", async () => {
    const error = await Effect.runPromise(
      Effect.flip(deleteChatBotThreadSvc(stubDb(new Error("connection reset")), "user-1", threadId)),
    );

    expect(error).toBeInstanceOf(DbError);
  });
});
