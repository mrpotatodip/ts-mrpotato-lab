import { describe, expect, it } from "vitest";
import { ChatBotWirePayloadSchema } from "../../schemas";
import { lastUserContent, toChatMessages } from "../to-chat-messages";

describe("toChatMessages", () => {
  it("keeps simple role/content turns", () => {
    expect(
      toChatMessages(
        ChatBotWirePayloadSchema.parse({
          messages: [{ role: "user", content: "How many cards?" }],
        }),
      ),
    ).toEqual([{ role: "user", content: "How many cards?" }]);
  });

  it("joins text parts and structured answers", () => {
    expect(
      toChatMessages(
        ChatBotWirePayloadSchema.parse({
          messages: [
            {
              role: "user",
              parts: [{ type: "text", content: "Summarise" }],
            },
            {
              role: "assistant",
              parts: [
                { type: "tool-call", name: "addTwoNumbers" },
                {
                  type: "structured-output",
                  data: { answer: "You have 3." },
                  raw: '{"answer":"You have 3."}',
                },
              ],
            },
          ],
        }),
      ),
    ).toEqual([
      { role: "user", content: "Summarise" },
      { role: "assistant", content: "You have 3." },
    ]);
  });

  it("strips JSON from a text part down to the answer", () => {
    expect(
      toChatMessages(
        ChatBotWirePayloadSchema.parse({
          messages: [
            {
              role: "assistant",
              parts: [
                {
                  type: "text",
                  content:
                    '{"answer":"You have 3.","kind":"none","structure":{"addTwoNumbers":null,"addThreeNumbers":null}}',
                },
              ],
            },
          ],
        }),
      ),
    ).toEqual([{ role: "assistant", content: "You have 3." }]);
  });

  it("parses tool rows and extra fields, then drops them from the transcript", () => {
    expect(
      toChatMessages(
        ChatBotWirePayloadSchema.parse({
          threadId: "thread-client-local-id",
          messages: [
            { role: "user", content: "How many?" },
            {
              role: "assistant",
              parts: [
                { type: "tool-call", name: "addTwoNumbers" },
                {
                  type: "structured-output",
                  data: { answer: "You have 3." },
                },
              ],
            },
            {
              role: "tool",
              content: "ignored dump",
              toolCallId: "call-1",
            },
            { role: "user", content: "Unread?" },
          ],
        }),
      ),
    ).toEqual([
      { role: "user", content: "How many?" },
      { role: "assistant", content: "You have 3." },
      { role: "user", content: "Unread?" },
    ]);
  });

  it("returns the latest user question after tool rows", () => {
    expect(
      lastUserContent(
        ChatBotWirePayloadSchema.parse({
          messages: [
            { role: "user", content: "How many?" },
            { role: "tool", content: "dump" },
            { role: "user", content: "Unread?" },
          ],
        }),
      ),
    ).toBe("Unread?");
  });
});
