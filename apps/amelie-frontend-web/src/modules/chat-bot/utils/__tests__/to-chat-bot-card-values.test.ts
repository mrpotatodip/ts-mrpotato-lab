import { describe, expect, it } from "vitest";
import { formatChatBotValue, toChatBotRows } from "../to-chat-bot-card-values";

// -----
// A menu card with several Countries and none in play
// has a null price: the table shows a dash, not "null".
// -----
describe("a menu card without a price", () => {
  it("keeps the row and shows a dash for the price", () => {
    const rows = toChatBotRows([{ name: "Latte", price: null, currency: null }]);

    expect(rows).toHaveLength(1);
    expect(formatChatBotValue(rows[0].name)).toBe("Latte");
    expect(formatChatBotValue(rows[0].price)).toBe("—");
  });
});
