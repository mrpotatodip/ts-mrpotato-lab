import { describe, it, expect } from "vitest";
import type { ChatMiddlewareConfig, ModelMessage } from "@tanstack/ai";
import {
  toChatBotSpecialistConfig,
  toChatBotSpecialistPrompt,
} from "../run/specialist-middleware";

function config(messages: Array<ModelMessage>, systemPrompts = ["persona"]): ChatMiddlewareConfig {
  return { messages, systemPrompts, tools: [] };
}

const user: ModelMessage = { role: "user", content: "add 1 and 2" };
const handoff: ModelMessage = { role: "assistant", content: "1 + 2 = 3." };

describe("toChatBotSpecialistConfig", () => {
  it("moves the handoff reply into the instructions", () => {
    const result = toChatBotSpecialistConfig(config([user, handoff]));
    expect(result?.providerMessages).toEqual([user]);
    expect(result?.systemPrompts).toEqual(["persona", toChatBotSpecialistPrompt("1 + 2 = 3.")]);
  });

  it("adds the prompt once across iterations", () => {
    const prompts = ["persona", toChatBotSpecialistPrompt("1 + 2 = 3.")];
    const result = toChatBotSpecialistConfig(config([user, handoff], prompts));
    expect(result?.systemPrompts).toEqual(prompts);
  });

  it("drops an empty handoff without a prompt", () => {
    const empty: ModelMessage = { role: "assistant", content: "Subagent finished." };
    const result = toChatBotSpecialistConfig(config([user, empty]));
    expect(result?.providerMessages).toEqual([user]);
    expect(result?.systemPrompts).toEqual(["persona"]);
  });

  it("leaves a turn with no handoff alone", () => {
    expect(toChatBotSpecialistConfig(config([user]))).toBeUndefined();
  });

  it("leaves earlier assistant replies in the history", () => {
    const earlier: ModelMessage = { role: "assistant", content: "Hi." };
    expect(toChatBotSpecialistConfig(config([earlier, user]))).toBeUndefined();
  });

  it("ignores an assistant tool call after the user", () => {
    const call: ModelMessage = {
      role: "assistant",
      content: "",
      toolCalls: [
        { id: "c1", type: "function", function: { name: "addTwoNumbers", arguments: "{}" } },
      ],
    };
    expect(toChatBotSpecialistConfig(config([user, call]))).toBeUndefined();
  });
});
