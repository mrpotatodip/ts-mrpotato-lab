import { describe, expect, it } from "vitest";
import {
  cardsFromLiveEvents,
  cardsFromStructure,
  readChatBotMessageMetadata,
} from "../to-chat-bot-cards";

describe("cardsFromStructure", () => {
  it("makes one card per saved call, in order", () => {
    expect(
      cardsFromStructure({
        getCardPrice: {
          display: "number",
          displayOptions: { value: "price" },
          results: [{ price: 1 }, { error: "timed out" }],
        },
        addTwoNumbers: { display: null, displayOptions: null, results: [{ a: 2, b: 3, sum: 5 }] },
      }),
    ).toEqual([
      { key: "getCardPrice:0", tool: "getCardPrice", display: "number", displayOptions: { value: "price" }, result: { price: 1 } },
      { key: "getCardPrice:1", tool: "getCardPrice", display: "number", displayOptions: { value: "price" }, result: { error: "timed out" } },
      { key: "addTwoNumbers:0", tool: "addTwoNumbers", display: null, displayOptions: null, result: { a: 2, b: 3, sum: 5 } },
    ]);
  });
});

describe("cardsFromLiveEvents", () => {
  it("keeps this message's calls that have an event, in part order", () => {
    const events = new Map([
      ["call-2", { toolCallId: "call-2", tool: "addTwoNumbers", display: null, displayOptions: null, result: { a: 1, b: 1, sum: 2 } }],
      ["call-1", { toolCallId: "call-1", tool: "addTwoNumbers", display: null, displayOptions: null, result: { a: 2, b: 3, sum: 5 } }],
      ["other", { toolCallId: "other", tool: "addTwoNumbers", display: null, displayOptions: null, result: { a: 0, b: 0, sum: 0 } }],
    ] as const);
    expect(
      cardsFromLiveEvents(["call-1", "call-2", "pending"], events).map((card) => card.key),
    ).toEqual(["call-1", "call-2"]);
  });
});

describe("readChatBotMessageMetadata", () => {
  it("reads saved chat-bot metadata and ignores anything else", () => {
    expect(readChatBotMessageMetadata(undefined)).toBeNull();
    expect(readChatBotMessageMetadata({ other: true })).toBeNull();
    expect(
      readChatBotMessageMetadata({ chatBot: { toolsUsed: [], structure: {} } }),
    ).toEqual({ chatBot: { toolsUsed: [], structure: {} } });
  });

  it("parses each metadata object once", () => {
    const metadata = { chatBot: { toolsUsed: [], structure: {} } };

    expect(readChatBotMessageMetadata(metadata)).toBe(readChatBotMessageMetadata(metadata));
    expect(readChatBotMessageMetadata({ other: true })).toBeNull();
  });
});
