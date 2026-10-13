import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { UIMessage } from "@tanstack/ai-client";
import { CHAT_BOT_TOOL_DISPLAY_EVENT } from "@repo/contracts/chat-bots";

import { recordChatBotToolDisplay } from "../../stores";
import { useChatBotMessageCards } from "../use-chat-bot-tool-cards";

// -----
// Delegated turn: the add call lives in the
// subagent's message inside the parent's part.
// -----
const message: UIMessage = {
  id: "m1",
  role: "assistant",
  parts: [
    {
      type: "subagent",
      subagent: {
        id: "sub-1",
        name: "calculator",
        description: "Adds numbers.",
        status: "finished",
        messages: [
          {
            id: "m-child",
            role: "assistant",
            parts: [
              {
                type: "tool-call",
                id: "call-add",
                name: "addTwoNumbers",
                arguments: '{"a":2,"b":3}',
                state: "input-complete",
              },
            ],
          },
        ],
      },
    },
  ],
};

describe("useChatBotMessageCards", () => {
  it("finds cards for tool calls a subagent made", () => {
    const { result } = renderHook(() => useChatBotMessageCards(message));
    expect(result.current).toEqual([]);

    act(() => {
      recordChatBotToolDisplay(CHAT_BOT_TOOL_DISPLAY_EVENT, {
        toolCallId: "call-add",
        tool: "addTwoNumbers",
        display: null,
        displayOptions: null,
        result: { a: 2, b: 3, sum: 5 },
      }, {});
    });

    expect(result.current).toEqual([
      expect.objectContaining({ key: "call-add", tool: "addTwoNumbers" }),
    ]);
  });
});
