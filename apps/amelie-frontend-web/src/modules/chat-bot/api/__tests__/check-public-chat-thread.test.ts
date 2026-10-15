import { afterEach, describe, expect, it } from "vitest";

import { livePublicChatThreadId } from "../check-public-chat-thread";
import { readPublicChatThreadId, writePublicChatThreadId } from "../../utils";

const slug = "sorella";
const stored = "4f1c2d9e-0000-4000-8000-000000000001";

afterEach(() => {
  writePublicChatThreadId(slug, null);
});

describe("livePublicChatThreadId", () => {
  it("returns null when nothing is stored", async () => {
    await expect(livePublicChatThreadId(slug, "anon")).resolves.toBeNull();
  });

  it("keeps a Thread the check still finds", async () => {
    writePublicChatThreadId(slug, stored);

    await expect(
      livePublicChatThreadId(slug, "anon", async () => ({ live: true })),
    ).resolves.toBe(stored);
    expect(readPublicChatThreadId(slug)).toBe(stored);
  });

  it("forgets a Thread that is gone", async () => {
    writePublicChatThreadId(slug, stored);

    await expect(
      livePublicChatThreadId(slug, "anon", async () => ({ live: false })),
    ).resolves.toBeNull();
    expect(readPublicChatThreadId(slug)).toBeNull();
  });

  it("starts fresh when the check itself fails", async () => {
    writePublicChatThreadId(slug, stored);

    await expect(
      livePublicChatThreadId(slug, "anon", async () => {
        throw new Error("check failed");
      }),
    ).resolves.toBeNull();
    expect(readPublicChatThreadId(slug)).toBeNull();
  });
});
