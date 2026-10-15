import { describe, expect, it } from "vitest";
import { toCustomerChatInk } from "../to-customer-chat-ink";

describe("toCustomerChatInk", () => {
  it("uses white type on a dark colour", () => {
    expect(toCustomerChatInk("#171717")).toBe("#fff");
    expect(toCustomerChatInk("#b4532a")).toBe("#fff");
  });

  it("uses dark type on a light colour", () => {
    expect(toCustomerChatInk("#f4e8d8")).toBe("#171717");
  });
});
