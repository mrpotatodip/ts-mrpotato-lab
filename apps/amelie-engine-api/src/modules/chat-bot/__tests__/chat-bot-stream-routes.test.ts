import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import chatBot from "#/modules/chat-bot";

// -----
// Bad run ids are refused by the validators,
// before any handler opens a database.
// -----
const app = new Hono<AppEnv>();
app.route("/chat-bot", chatBot);
app.onError((err, c) =>
  err instanceof AppError
    ? c.json({ data: null, error: { code: err.code, message: err.message } }, 400)
    : c.json({ data: null, error: { code: "INTERNAL_ERROR", message: err.message } }, 500),
);

const LONG_RUN_ID = "r".repeat(129);

async function errorCode(response: Response): Promise<string | undefined> {
  const body: { error?: { code?: string } } = await response.json();
  return body.error?.code;
}

function post(path: string, headers: Record<string, string> = {}) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ content: "Hi" }),
  });
}

describe("chat-bot stream routes", () => {
  it("refuses an empty ?runId on POST, which would become an empty run id", async () => {
    const response = await post("/chat-bot?runId=");
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("VALIDATION_ERROR");
  });

  it("refuses an over-long X-Run-Id on POST", async () => {
    const response = await post("/chat-bot", { "X-Run-Id": LONG_RUN_ID });
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("VALIDATION_ERROR");
  });

  it("refuses an empty ?runId on GET", async () => {
    const response = await app.request("/chat-bot?runId=");
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("VALIDATION_ERROR");
  });

  it("refuses an over-long X-Run-Id on GET", async () => {
    const response = await app.request("/chat-bot", { headers: { "X-Run-Id": LONG_RUN_ID } });
    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("VALIDATION_ERROR");
  });
});
