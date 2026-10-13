import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPublicChatFramePolicy } from "../fetch-public-chat-frame-policy";
import { publicChatFrameHeaders } from "../public-chat-frame-headers";

afterEach(() => {
  vi.unstubAllGlobals();
});

type FramePolicyJson = {
  data: { allowedOrigins: string[] } | null;
  error: { code: string } | null;
};

const jsonResponse = (status: number, body: FramePolicyJson) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("fetchPublicChatFramePolicy", () => {
  it("returns Allowed origins and never a Tenant id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(200, { data: { allowedOrigins: ["https://sorellacafe.com"] }, error: null })),
    );

    await expect(fetchPublicChatFramePolicy("sorella")).resolves.toEqual(["https://sorellacafe.com"]);
  });

  it("returns null for an unknown slug", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(404, { data: null, error: { code: "NOT_FOUND" } })));

    await expect(fetchPublicChatFramePolicy("missing")).resolves.toBeNull();
  });
});

describe("publicChatFrameHeaders", () => {
  it("sets frame-ancestors from Allowed origins", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(200, { data: { allowedOrigins: ["https://sorellacafe.com/menu"] }, error: null })),
    );

    await expect(publicChatFrameHeaders("sorella")).resolves.toEqual({
      "Content-Security-Policy": "frame-ancestors https://sorellacafe.com",
    });
  });

  it("sets none for an empty list", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, { data: { allowedOrigins: [] }, error: null })));

    await expect(publicChatFrameHeaders("empty")).resolves.toEqual({
      "Content-Security-Policy": "frame-ancestors 'none'",
    });
  });

  it("sets none for an unknown slug", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(404, { data: null, error: { code: "NOT_FOUND" } })));

    await expect(publicChatFrameHeaders("missing")).resolves.toEqual({
      "Content-Security-Policy": "frame-ancestors 'none'",
    });
  });
});
