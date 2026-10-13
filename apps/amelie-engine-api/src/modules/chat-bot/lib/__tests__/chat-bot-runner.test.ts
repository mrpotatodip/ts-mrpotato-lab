import { describe, expect, it } from "vitest";
import type { ChatBotEnv } from "#/modules/chat-bot/types";
import { createChatBotRunner } from "#/modules/chat-bot/lib";

const env: ChatBotEnv = {
  OPENAI_API_KEY: "sk-fake",
  TYPESAFE_API_KEY: "",
};

describe("createChatBotRunner", () => {
  it("runs the real chat-bot loop and builds an adapter per model", () => {
    const runner = createChatBotRunner(env);

    expect(runner.run).toBeTypeOf("function");
    expect(runner.adapterFor("gpt-4o-mini")).toBeDefined();
  });

  it("routes with Jev only when a TypeSafe key is set", () => {
    expect(createChatBotRunner(env).route).toBeUndefined();
    expect(createChatBotRunner({ ...env, TYPESAFE_API_KEY: "ts-key" }).route).toBeTypeOf("function");
  });
});
