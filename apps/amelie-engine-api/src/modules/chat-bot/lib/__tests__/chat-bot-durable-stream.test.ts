import { describe, expect, it } from "vitest";
import { stubDb } from "#/modules/chat-bot/__tests__/chat-bot-stub-db";
import { chatBotDurableStreams } from "#/modules/chat-bot/lib";

describe("chatBotDurableStreams", () => {
  it("builds a producer for a run the server names", () => {
    const durableStream = chatBotDurableStreams(stubDb());

    expect(durableStream({ runId: "run-1" }).resumeFrom()).toBeNull();
  });

  it("builds a reader that resumes from the given offset", () => {
    const durableStream = chatBotDurableStreams(stubDb());

    expect(durableStream({ runId: "run-1", offset: "pg:v1:run-1:3" }).resumeFrom()).toBe(
      "pg:v1:run-1:3",
    );
  });

  it("stores chunks under the chat-bot prefix", async () => {
    const durableStream = chatBotDurableStreams(stubDb([], [{ seq: 0 }], []));

    const offsets = await durableStream({ runId: "run-1" }).append([
      { type: "CUSTOM", name: "run.accepted", value: {}, timestamp: 1 },
    ]);

    expect(offsets).toEqual(["pg:v1:run-1:1"]);
  });
});
