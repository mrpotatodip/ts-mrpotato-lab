import { afterEach, describe, expect, it, vi } from "vitest";

import { getChatBotStreamThreadId, getPublicChatSession, setChatBotStreamThreadId, setPublicChatSession } from "../../stores";
import { readPublicChatThreadId, writePublicChatThreadId } from "../../utils";
import {
  dropPublicChatPlace,
  isPublicChatPlaceRejection,
  publicChatFetchClient,
  publicChatUrl,
  toPublicChatBody,
} from "../public-chat-options";

const post = (content: string) => ({
  method: "POST",
  body: JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", content }] }] }),
});

const parse = (init: RequestInit) =>
  JSON.parse(toPublicChatBody(init, "maple", { country: "CA", location: "toronto" }) ?? "{}");

afterEach(() => {
  setChatBotStreamThreadId(undefined);
  setPublicChatSession(undefined);
  writePublicChatThreadId("maple", null);
  vi.unstubAllGlobals();
});

describe("toPublicChatBody", () => {
  it("sends the country and the location with a Thread's first message", () => {
    expect(parse(post("Hi"))).toMatchObject({ slug: "maple", country: "CA", location: "toronto" });
  });

  it("sends only the country when there is no location", () => {
    const body = JSON.parse(toPublicChatBody(post("Hi"), "maple", { country: "CA" }) ?? "{}");

    expect(body.country).toBe("CA");
    expect(body).not.toHaveProperty("location");
  });

  it("never sends either once the Thread exists", () => {
    setChatBotStreamThreadId("4f1c2d9e-0000-4000-8000-000000000001");

    const body = parse(post("Hi again"));

    expect(body).toHaveProperty("threadId");
    expect(body).not.toHaveProperty("country");
    expect(body).not.toHaveProperty("location");
  });
});

describe("dropPublicChatPlace", () => {
  it("forgets the country and the location so the next message starts cafe-wide", () => {
    setPublicChatSession({ slug: "maple", anonymousId: "a", country: "Atlantis", location: "nowhere" });

    dropPublicChatPlace();

    expect(getPublicChatSession()).toEqual({
      slug: "maple",
      anonymousId: "a",
      country: undefined,
      location: undefined,
    });
  });
});

describe("isPublicChatPlaceRejection", () => {
  it("is true for a not-found place and for a country that does not fit the location", () => {
    expect(isPublicChatPlaceRejection(404)).toBe(true);
    expect(isPublicChatPlaceRejection(400)).toBe(true);
  });

  it("is false for other failures", () => {
    for (const status of [401, 403, 429, 500]) expect(isPublicChatPlaceRejection(status)).toBe(false);
  });
});

describe("publicChatUrl", () => {
  it("names the cafe and the Thread when one is in play", () => {
    setPublicChatSession({ slug: "maple", anonymousId: "a" });
    setChatBotStreamThreadId("4f1c2d9e-0000-4000-8000-000000000001");

    expect(publicChatUrl()).toContain("slug=maple");
    expect(publicChatUrl()).toContain("threadId=4f1c2d9e-0000-4000-8000-000000000001");
  });
});

describe("publicChatFetchClient", () => {
  it("turns a gone Thread hydrate into an empty chat instead of a 404", async () => {
    setPublicChatSession({ slug: "maple", anonymousId: "a" });
    setChatBotStreamThreadId("4f1c2d9e-0000-4000-8000-000000000001");
    writePublicChatThreadId("maple", "4f1c2d9e-0000-4000-8000-000000000001");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: { message: "Chat thread not found" } }), { status: 404, statusText: "Not Found" })),
    );

    const response = await publicChatFetchClient("http://localhost:8788/public/chat-bot?slug=maple", { method: "GET" });

    expect(response.ok).toBe(true);
    expect(await response.json()).toEqual({ messages: [], activeRun: null });
    expect(getChatBotStreamThreadId()).toBeUndefined();
    expect(readPublicChatThreadId("maple")).toBeNull();
    vi.unstubAllGlobals();
  });
});
