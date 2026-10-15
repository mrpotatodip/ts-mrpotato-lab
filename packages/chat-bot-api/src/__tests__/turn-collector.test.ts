import { describe, expect, it } from "vitest";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { collectChatBotTurn, type ChatBotCollectedTurn } from "../index";

const finishedTurnChunks: ReadonlyArray<StreamChunk> = [
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m", delta: "Yes." },
  {
    type: EventType.RUN_FINISHED,
    threadId: "t",
    runId: "r",
    model: "gpt-6-luna",
    usage: [{ inputTokens: 2000, cachedInputTokens: 1900, outputTokens: 40 }],
  },
  {
    type: EventType.RUN_FINISHED,
    threadId: "t",
    runId: "r-child",
    usage: { promptTokens: 300, completionTokens: 10, totalTokens: 310 },
  },
];

async function* finishedTurn(): AsyncGenerator<StreamChunk> {
  yield* finishedTurnChunks;
}

describe("collectChatBotTurn usage", () => {
  it("adds up every finished run's tokens in either usage shape", async () => {
    const saved: ChatBotCollectedTurn[] = [];
    await Array.fromAsync(
      collectChatBotTurn(finishedTurn(), [], async (t) => {
        saved.push(t);
      }),
    );

    expect(saved).toMatchObject([
      {
        answer: "Yes.",
        usage: { model: "gpt-6-luna", inputTokens: 2300, cachedTokens: 1900, outputTokens: 50 },
      },
    ]);
  });
});
