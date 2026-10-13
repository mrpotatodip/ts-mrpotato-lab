import { describe, expect, it } from "vitest";
import type { ChatBotThreadDetail, ChatBotThreadListItem } from "@repo/contracts/chat-bots";
import { withThreadRenamed, withThreadRenamedInList } from "../thread-rename";

// SAFETY: the rename reads only id and title.
const thread = (id: string, title: string) => ({ id, title }) as ChatBotThreadListItem;

describe("withThreadRenamedInList", () => {
  it("renames only the matching thread", () => {
    const threads = [thread("a", "One"), thread("b", "Two")];
    const next = withThreadRenamedInList(threads, "a", "Uno");
    expect(next[0].title).toBe("Uno");
    expect(next[1]).toBe(threads[1]);
  });
});

describe("withThreadRenamed", () => {
  it("sets the title on the open thread", () => {
    // SAFETY: the rename reads only id and title.
    const detail = { id: "a", title: "One" } as ChatBotThreadDetail;
    expect(withThreadRenamed(detail, "Uno").title).toBe("Uno");
  });
});
