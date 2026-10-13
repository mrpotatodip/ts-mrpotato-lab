import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { EventType, type StreamChunk } from "@tanstack/ai";
import { PublicChatStreamBodySchema } from "@repo/contracts/amelie";
import { reportMissingInformation } from "#/modules/chat-bot/agent-tools";
import { chatBotCustomerAgent } from "#/modules/chat-bot/agents";
import { collectChatBotTurn } from "#/modules/chat-bot/lib";
import type { ChatBotCollectedTurn } from "#/modules/chat-bot/types";
import { publicChatBotRestAPI } from "#/modules/chat-bot";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";

describe("reportMissingInformation", () => {
  it("normalises the topic", () => {
    expect(reportMissingInformation({ topic: "  Parking " })).toEqual({ topic: "parking" });
  });
});

const finishedTurnChunks: ReadonlyArray<StreamChunk> = [
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m", delta: "Yes." },
  {
    type: EventType.RUN_FINISHED,
    threadId: "t",
    runId: "r",
    model: "gpt-6-luna",
    usage: [{ inputTokens: 2000, cachedInputTokens: 1900, outputTokens: 40 }],
  },
  {
    type: EventType.RUN_FINISHED,
    threadId: "t",
    runId: "r-child",
    usage: { promptTokens: 300, completionTokens: 10, totalTokens: 310 },
  },
];

async function* finishedTurn(): AsyncGenerator<StreamChunk> {
  yield* finishedTurnChunks;
}

describe("collectChatBotTurn usage", () => {
  it("adds up every finished run's tokens in either usage shape", async () => {
    const saved: ChatBotCollectedTurn[] = [];
    await Array.fromAsync(
      collectChatBotTurn(finishedTurn(), [], async (t) => {
        saved.push(t);
      }),
    );

    expect(saved).toMatchObject([
      {
        answer: "Yes.",
        usage: { model: "gpt-6-luna", inputTokens: 2300, cachedTokens: 1900, outputTokens: 50 },
      },
    ]);
  });
});

describe("PublicChatStreamBodySchema", () => {
  it("ignores a tenantId sent by the browser", () => {
    const body = PublicChatStreamBodySchema.parse({
      slug: "sorella",
      content: "Open?",
      tenantId: "someone-elses-tenant",
    });

    expect(body).toEqual({ slug: "sorella", content: "Open?" });
  });
});

describe("chatBotCustomerAgent", () => {
  it("looks facts up itself or through the read-only specialists, and reports what it can't answer", () => {
    expect(chatBotCustomerAgent.tools.map((t) => t.definition.name)).toEqual([
      "getOpeningSchedule",
      "findMenuItems",
      "listMenu",
      "showMenuItems",
      "listFaqs",
      "getBusinessProfile",
      "reportMissingInformation",
      "setThreadLocation",
      "setThreadCountry",
    ]);
    expect(chatBotCustomerAgent.subagents.map((sub) => sub.name)).toEqual(["schedule", "menu", "faq"]);
    expect(chatBotCustomerAgent.prompts.join("\n")).not.toContain("BUSINESS INFORMATION");
  });
});

describe("public chat routes", () => {
  const app = new Hono<AppEnv>();
  app.route("/public/chat-bot", publicChatBotRestAPI);
  app.onError((err, c) => {
    if (err instanceof AppError) {
      // SAFETY: AppError subclasses only use 4xx/5xx
      // codes, never a no-content status.
      return c.json({ error: err.code }, err.statusCode as ContentfulStatusCode);
    }
    return c.json({ error: "INTERNAL_ERROR" }, 500);
  });

  const post = (headers: Record<string, string>) =>
    app.request("/public/chat-bot", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ slug: "sorella", content: "Open?" }),
    });

  it("refuses a stream without an anonymous id as a 400, not a 500", async () => {
    const res = await post({});

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "VALIDATION_ERROR" });
  });

  it("refuses a malformed anonymous id", async () => {
    const res = await post({ "x-anonymous-id": "not-a-uuid" });

    expect(res.status).toBe(400);
  });
});
