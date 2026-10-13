import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "#/lib/errors";
import { zValidator } from "#/lib/zod-validator";

const app = new Hono();

app.patch(
  "/threads/:id",
  zValidator("param", z.object({ id: z.string().uuid() })),
  zValidator("json", z.object({ title: z.string().trim().min(1) })),
  (c) => c.json({ data: { ...c.req.valid("param"), ...c.req.valid("json") }, error: null }),
);

app.onError((err, c) =>
  err instanceof AppError
    ? c.json({ data: null, error: { code: err.code, message: err.message } }, 400)
    : c.json({ data: null, error: { code: "INTERNAL_ERROR", message: "x" } }, 500),
);

function patch(id: string, body: { title: string }) {
  return app.request(`/threads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ID = "6f1c2b8e-2f43-4a39-9f0a-2c1d3e4f5a6b";

describe("zValidator", () => {
  it("passes valid input through as typed data", async () => {
    const res = await patch(ID, { title: "Prices" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: ID, title: "Prices" }, error: null });
  });

  it("returns a bad param in the envelope, not as a ZodError", async () => {
    const res = await patch("not-a-uuid", { title: "Prices" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      data: null,
      error: { code: "VALIDATION_ERROR", message: expect.stringContaining("id:") },
    });
  });

  it("returns a bad body in the envelope", async () => {
    const res = await patch(ID, { title: "  " });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      data: null,
      error: { code: "VALIDATION_ERROR", message: expect.stringContaining("title:") },
    });
  });
});
