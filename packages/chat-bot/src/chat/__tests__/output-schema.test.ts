import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ChatBotOutputSchema } from "@repo/contracts/chat-bots";

const ModelOutputJsonSchemaSchema = z.object({
  properties: z.record(z.string(), z.unknown()),
  required: z.array(z.string()),
});

describe("ChatBotOutputSchema", () => {
  it("accepts an answer", () => {
    expect(ChatBotOutputSchema.parse({ answer: "That comes to **5**." })).toEqual({
      answer: "That comes to **5**.",
    });
  });

  it("rejects an empty answer", () => {
    expect(ChatBotOutputSchema.safeParse({ answer: "" }).success).toBe(false);
  });

  it("drops fields the model should no longer send", () => {
    expect(
      ChatBotOutputSchema.parse({ answer: "Hi.", kind: "none", structure: {} }),
    ).toEqual({ answer: "Hi." });
  });

  it("sends the model only an answer field", () => {
    const json = ModelOutputJsonSchemaSchema.parse(z.toJSONSchema(ChatBotOutputSchema));
    expect(Object.keys(json.properties)).toEqual(["answer"]);
    expect(json.required).toEqual(["answer"]);
  });
});
