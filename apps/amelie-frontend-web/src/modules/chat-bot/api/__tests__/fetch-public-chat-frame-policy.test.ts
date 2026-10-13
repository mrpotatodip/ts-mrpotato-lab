import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ApiError } from "#/lib/api-client";
import { loadPublicChatFrameOrigins } from "../fetch-public-chat-frame-policy";
import { publicChatFrameHeaders } from "../public-chat-frame-headers";

describe("loadPublicChatFrameOrigins", () => {
  it("returns Allowed origins and never a Tenant id", async () => {
    const body = await loadPublicChatFrameOrigins("sorella", async () => ({
      data: { allowedOrigins: ["https://sorellacafe.com"] },
    }));

    expect(body).toEqual(["https://sorellacafe.com"]);
  });

  it("returns null for an unknown slug", async () => {
    await expect(
      loadPublicChatFrameOrigins("missing", async () => {
        throw new ApiError(404, null);
      }),
    ).resolves.toBeNull();
  });
});

describe("publicChatFrameHeaders", () => {
  it("sets frame-ancestors from Allowed origins", async () => {
    await expect(
      publicChatFrameHeaders("sorella", async () => ["https://sorellacafe.com/menu"]),
    ).resolves.toEqual({
      "Content-Security-Policy": "frame-ancestors https://sorellacafe.com",
    });
  });

  it("sets none for an empty list", async () => {
    await expect(publicChatFrameHeaders("empty", async () => [])).resolves.toEqual({
      "Content-Security-Policy": "frame-ancestors 'none'",
    });
  });

  it("sets none for an unknown slug", async () => {
    await expect(publicChatFrameHeaders("missing", async () => null)).resolves.toEqual({
      "Content-Security-Policy": "frame-ancestors 'none'",
    });
  });
});

describe("/chat/$slug document headers", () => {
  it("sets CSP from publicChatFrameHeaders", () => {
    const route = readFileSync("src/routes/chat/$slug.tsx", "utf8");
    expect(route).toContain("headers: ({ params }) => publicChatFrameHeaders(params.slug)");
  });
});
