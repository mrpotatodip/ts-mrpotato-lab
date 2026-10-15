import { describe, expect, it } from "vitest";

import { ApiError } from "#/lib/api-client";
import { loadPublicChatAppearance } from "../fetch-public-chat-appearance";

describe("loadPublicChatAppearance", () => {
  it("returns the Tenant's look and never a Tenant id", async () => {
    const body = await loadPublicChatAppearance("sorella", async () => ({
      data: { customerChatLabel: "Ask Sorella", customerChatAccent: "#b4532a" },
    }));

    expect(body).toEqual({ customerChatLabel: "Ask Sorella", customerChatAccent: "#b4532a" });
    expect(body).not.toHaveProperty("id");
  });

  it("returns the default look for an unknown slug", async () => {
    await expect(
      loadPublicChatAppearance("missing", async () => {
        throw new ApiError(404, null);
      }),
    ).resolves.toEqual({ customerChatLabel: "Chat with us", customerChatAccent: null });
  });

  it("returns the default look when the request fails", async () => {
    await expect(
      loadPublicChatAppearance("sorella", async () => {
        throw new ApiError(500, null);
      }),
    ).resolves.toEqual({ customerChatLabel: "Chat with us", customerChatAccent: null });
  });
});
