import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { Invalid } from "#/lib/effect-query";
import { readChatBotStreamOffsetForRunEffect } from "#/modules/chat-bot/lib";

const read = (request: Request) =>
  Effect.runPromise(Effect.either(readChatBotStreamOffsetForRunEffect(request, "run-1")));

describe("readChatBotStreamOffsetForRunEffect", () => {
  it("starts from the first chunk when the request has no offset", async () => {
    const result = await read(new Request("https://chat.local/?runId=run-1"));
    expect(result).toEqual(expect.objectContaining({ _tag: "Right", right: "-1" }));
  });

  it("keeps an offset into the authorised run", async () => {
    const result = await read(
      new Request("https://chat.local/?runId=run-1", {
        headers: { "Last-Event-ID": "pg:v1:run-1:4" },
      }),
    );
    expect(result).toEqual(expect.objectContaining({ _tag: "Right", right: "pg:v1:run-1:4" }));
  });

  it("fails with Invalid for a Last-Event-ID that points into another run", async () => {
    const result = await read(
      new Request("https://chat.local/?runId=run-1", {
        headers: { "Last-Event-ID": "pg:v1:victim-run:1" },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        _tag: "Left",
        left: new Invalid({ message: "Chat stream offset belongs to another run" }),
      }),
    );
  });

  it("fails with Invalid for a bad Last-Event-ID", async () => {
    const result = await read(
      new Request("https://chat.local/?runId=run-1", {
        headers: { "Last-Event-ID": "garbage" },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        _tag: "Left",
        left: new Invalid({ message: "Invalid chat stream offset" }),
      }),
    );
  });
});
