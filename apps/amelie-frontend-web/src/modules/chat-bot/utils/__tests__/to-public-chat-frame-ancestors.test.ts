import { describe, expect, it } from "vitest";
import { publicChatContentSecurityPolicy, toPublicChatFrameAncestors } from "../to-public-chat-frame-ancestors";

describe("toPublicChatFrameAncestors", () => {
  it("lists origins from Allowed origins, ignoring path", () => {
    expect(toPublicChatFrameAncestors(["https://sorellacafe.com/menu"])).toBe(
      "frame-ancestors https://sorellacafe.com",
    );
  });

  it("uses none when the list is empty or junk", () => {
    expect(toPublicChatFrameAncestors([])).toBe("frame-ancestors 'none'");
    expect(toPublicChatFrameAncestors(["not a url"])).toBe("frame-ancestors 'none'");
  });
});

describe("publicChatContentSecurityPolicy", () => {
  it("uses none for an unknown slug", async () => {
    expect(await publicChatContentSecurityPolicy("missing", async () => null)).toBe("frame-ancestors 'none'");
  });

  it("uses none when the lookup fails", async () => {
    expect(await publicChatContentSecurityPolicy("sorella", async () => {
      throw new Error("offline");
    })).toBe("frame-ancestors 'none'");
  });

  it("uses the Tenant's Allowed origins when the lookup succeeds", async () => {
    expect(
      await publicChatContentSecurityPolicy("sorella", async () => ["https://sorellacafe.com"]),
    ).toBe("frame-ancestors https://sorellacafe.com");
  });
});
