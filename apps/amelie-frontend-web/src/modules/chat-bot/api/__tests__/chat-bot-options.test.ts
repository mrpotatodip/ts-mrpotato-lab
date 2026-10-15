import { afterEach, describe, expect, it } from "vitest";

import { setChatBotStreamThreadId, setStaffChatPlace } from "../../stores";
import { toStaffChatBody } from "../chat-bot-options";

const post = (content: string) => ({
  method: "POST",
  body: JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", content }] }] }),
});

const parse = (init: RequestInit) =>
  JSON.parse(toStaffChatBody(init, { country: "ca-id", location: "toronto-id" }) ?? "{}");

afterEach(() => {
  setChatBotStreamThreadId(undefined);
  setStaffChatPlace({});
});

describe("toStaffChatBody", () => {
  it("sends the dashboard country and location with a Thread's first message", () => {
    expect(parse(post("Hours?"))).toMatchObject({ country: "ca-id", location: "toronto-id" });
  });

  it("sends only the country when there is no location", () => {
    const body = JSON.parse(toStaffChatBody(post("Hours?"), { country: "ca-id" }) ?? "{}");

    expect(body.country).toBe("ca-id");
    expect(body).not.toHaveProperty("location");
  });

  it("never sends either once the Thread exists", () => {
    setChatBotStreamThreadId("4f1c2d9e-0000-4000-8000-000000000001");

    const body = parse(post("And Saturday?"));

    expect(body).toHaveProperty("threadId");
    expect(body).not.toHaveProperty("country");
    expect(body).not.toHaveProperty("location");
  });
});
