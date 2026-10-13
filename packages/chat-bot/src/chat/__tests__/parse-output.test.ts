import { describe, expect, it } from "vitest";
import { isChatBotJsonText, parseChatBotJson } from "../parse-output";

const complete = JSON.stringify({ answer: "That comes to **5**." });

describe("isChatBotJsonText", () => {
  it("detects a chat-bot JSON object", () => {
    expect(isChatBotJsonText(complete)).toBe(true);
  });

  it("detects incomplete JSON while it streams", () => {
    expect(isChatBotJsonText('{"answer":"That co')).toBe(true);
  });

  it("detects an opening markdown fence before the object arrives", () => {
    expect(isChatBotJsonText("```json\n{")).toBe(true);
  });

  it("leaves ordinary sentences alone", () => {
    expect(isChatBotJsonText("What is 2 plus 3?")).toBe(false);
  });
});

describe("parseChatBotJson", () => {
  it("returns the typed object for a complete payload", () => {
    expect(parseChatBotJson(complete)).toEqual({
      answer: "That comes to **5**.",
      output: { answer: "That comes to **5**." },
    });
  });

  it("parses a fenced payload", () => {
    expect(parseChatBotJson("```json\n" + complete + "\n```").answer).toBe(
      "That comes to **5**.",
    );
  });

  it("returns nothing for ordinary chat text", () => {
    expect(parseChatBotJson("What is 2 plus 3?")).toEqual({
      answer: null,
      output: null,
    });
  });
});
