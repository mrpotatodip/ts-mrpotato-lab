import { describe, expect, it } from "vitest";
import {
  checkChatBotDurableStreamOffset,
  decodeChatBotDurableStreamOffset,
  encodeChatBotDurableStreamOffset,
  readChatBotDurableStreamResumeOffset,
} from "../stream-offset";

describe("durable stream offsets", () => {
  it("round-trips a run id and sequence", () => {
    const offset = encodeChatBotDurableStreamOffset("run-1", 3);
    expect(offset).toBe("pg:v1:run-1:3");
    expect(decodeChatBotDurableStreamOffset(offset)).toEqual({ runId: "run-1", seq: 3 });
  });

  it("round-trips a run id that holds a colon", () => {
    const offset = encodeChatBotDurableStreamOffset("a:b", 2);
    expect(decodeChatBotDurableStreamOffset(offset)).toEqual({ runId: "a:b", seq: 2 });
  });

  it.each(["garbage", "pg:v1:run-1", "pg:v1:run-1:0", "pg:v1:run-1:x", "pg:v1:%E0%A4%A:1"])(
    "decodes %s as null",
    (offset) => {
      expect(decodeChatBotDurableStreamOffset(offset)).toBeNull();
    },
  );

  it("prefers Last-Event-ID over the offset query", () => {
    const request = new Request("https://chat.local/?offset=-1&runId=run-1", {
      headers: { "Last-Event-ID": "pg:v1:run-1:2" },
    });
    expect(readChatBotDurableStreamResumeOffset(request)).toBe("pg:v1:run-1:2");
  });

  it("reads offset=-1 from a join when no Last-Event-ID is set", () => {
    const request = new Request("https://chat.local/?offset=-1&runId=run-1");
    expect(readChatBotDurableStreamResumeOffset(request)).toBe("-1");
  });

  it("is a producer when the request has no resume cursor", () => {
    const request = new Request("https://chat.local/?runId=run-1", { method: "POST" });
    expect(readChatBotDurableStreamResumeOffset(request)).toBeNull();
  });

  describe("checkChatBotDurableStreamOffset", () => {
    it("starts from seq 0 for -1", () => {
      expect(checkChatBotDurableStreamOffset("-1", "run-1")).toEqual({ seq: 0 });
    });

    it("keeps an offset into the authorised run", () => {
      expect(checkChatBotDurableStreamOffset("pg:v1:run-1:4", "run-1")).toEqual({ seq: 4 });
    });

    it("returns an error for an offset into another run", () => {
      expect(checkChatBotDurableStreamOffset("pg:v1:victim-run:1", "run-1")).toEqual({
        error: "offset belongs to another run",
      });
    });

    it("returns an error for a bad offset", () => {
      expect(checkChatBotDurableStreamOffset("garbage", "run-1")).toEqual({
        error: "invalid offset",
      });
    });
  });
});
