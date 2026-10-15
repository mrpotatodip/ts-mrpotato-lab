import { describe, expect, it } from "vitest";
import { openaiRunner } from "../model";
import worker from "../worker";

describe("choosing the model and the key", () => {
  it("builds an adapter for whichever model the agent names", () => {
    const runner = openaiRunner("sk-test");

    expect(runner.adapterFor("gpt-4o-mini")).toBeDefined();
    expect(runner.adapterFor("gpt-4.1")).toBeDefined();
  });

  it("builds the worker's app from the environment, without calling the model", async () => {
    const response = await worker.fetch(
      new Request("https://notes.local/chat/threads", {
        headers: { "x-workspace": "acme", "x-member": "ada" },
      }),
      { OPENAI_API_KEY: "sk-test", NOTES_MODEL: "gpt-4.1" },
      { waitUntil: () => undefined, passThroughOnException: () => undefined, props: {} },
    );

    expect(response.status).toBe(200);
  });
});
