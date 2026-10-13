import { describe, expect, it } from "vitest";

import { ChatBotSubagent, chatBotSubagentComponents } from "../chat-bot-subagent";

describe("chatBotSubagentComponents", () => {
  it("has a component for any agent name, including ones added later", () => {
    expect(chatBotSubagentComponents.schedule).toBe(ChatBotSubagent);
    expect(chatBotSubagentComponents["pricing-agent-from-db"]).toBe(ChatBotSubagent);
  });

  it("renders nothing in the bubble", () => {
    expect(ChatBotSubagent()).toBeNull();
  });
});
