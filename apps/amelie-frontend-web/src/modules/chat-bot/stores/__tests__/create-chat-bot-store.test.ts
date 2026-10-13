import { describe, expect, it, vi } from "vitest";

import { createChatBotStore } from "../create-chat-bot-store";

describe("createChatBotStore", () => {
  it("reads its first value lazily, once", () => {
    const init = vi.fn<() => number>(() => 1);
    const store = createChatBotStore(init);
    expect(init).not.toHaveBeenCalled();

    expect(store.get()).toBe(1);
    expect(store.get()).toBe(1);
    expect(init).toHaveBeenCalledTimes(1);
  });

  it("notifies subscribers on a change, not on the same value", () => {
    const store = createChatBotStore(() => "a");
    const listener = vi.fn<() => void>();
    store.subscribe(listener);

    store.set("a");
    store.set("b");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get()).toBe("b");
  });

  it("stops notifying after unsubscribe", () => {
    const store = createChatBotStore(() => 0);
    const listener = vi.fn<() => void>();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.set(1);

    expect(listener).not.toHaveBeenCalled();
  });
});
