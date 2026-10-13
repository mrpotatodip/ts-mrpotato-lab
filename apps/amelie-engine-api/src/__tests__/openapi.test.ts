import { describe, expect, it } from "vitest";
import app from "#/index";

// -----
// /openapi.json reads no binding but ENVIRONMENT.
// -----
const request = (environment: string | undefined) =>
  app.fetch(
    new Request("http://localhost/openapi.json"),
    // SAFETY: the spec route reads only ENVIRONMENT.
    { ENVIRONMENT: environment } as never,
  );

type Operation = {
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Array<Record<string, string[]>>;
  parameters?: Array<{ in: string; name: string }>;
};
type Spec = { openapi: string; paths: Record<string, Record<string, Operation>> };

const readSpec = async (): Promise<Spec> => (await request("development")).json();

const operations = (spec: Spec) =>
  Object.entries(spec.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({ route: `${method.toUpperCase()} ${path}`, operation })),
  );

describe("GET /openapi.json", () => {
  it("lists every route of the API", async () => {
    const spec = await readSpec();

    expect(spec.openapi).toBe("3.1.0");
    expect(operations(spec).map(({ route }) => route).toSorted()).toEqual([
      "DELETE /chat-bot/threads/{id}",
      "DELETE /faqs/categories/{categoryId}",
      "DELETE /faqs/{faqId}",
      "DELETE /menu/categories/{categoryId}",
      "DELETE /menu/items/{itemId}",
      "DELETE /schedule/overrides/{date}",
      "GET /admin",
      "GET /admin/invite-codes",
      "GET /business-profile",
      "GET /chat-bot",
      "GET /chat-bot/threads",
      "GET /chat-bot/threads/{id}",
      "GET /countries",
      "GET /customer-threads",
      "GET /customer-threads/{threadId}",
      "GET /faqs",
      "GET /health",
      "GET /imports",
      "GET /imports/{importId}",
      "GET /locations",
      "GET /me",
      "GET /menu",
      "GET /public/chat-bot",
      "GET /public/chat-bot/frame-policy",
      "GET /schedule",
      "GET /tenants",
      "GET /tenants/{tenantId}",
      "GET /unanswered-questions",
      "PATCH /chat-bot/threads/{id}",
      "PATCH /countries/{countryId}",
      "PATCH /imports/{importId}/drafts/{draftId}",
      "PATCH /locations/{locationId}",
      "PATCH /tenants/{tenantId}/region",
      "POST /admin/invite-codes",
      "POST /admin/invite-codes/{id}/revoke",
      "POST /chat-bot",
      "POST /countries",
      "POST /countries/{countryId}/archive",
      "POST /faqs",
      "POST /faqs/categories",
      "POST /imports",
      "POST /imports/{importId}/approve-all",
      "POST /imports/{importId}/publish",
      "POST /locations",
      "POST /locations/{locationId}/archive",
      "POST /menu/categories",
      "POST /menu/items",
      "POST /public/chat-bot",
      "POST /public/sign-up",
      "POST /unanswered-questions/{messageId}/dismiss",
      "PUT /business-profile",
      "PUT /faqs/categories/{categoryId}",
      "PUT /faqs/{faqId}",
      "PUT /menu/categories/order",
      "PUT /menu/categories/{categoryId}",
      "PUT /menu/categories/{categoryId}/items/order",
      "PUT /menu/items/{itemId}",
      "PUT /menu/items/{itemId}/countries/{countryId}",
      "PUT /menu/items/{itemId}/locations",
      "PUT /schedule/hours/{dayOfWeek}",
      "PUT /schedule/overrides/{date}",
    ]);
  });

  it("gives every route a context, the steps and an example", async () => {
    const spec = await readSpec();

    const incomplete = operations(spec)
      .filter(({ operation }) => {
        const text = operation.description ?? "";
        return (
          !operation.summary ||
          !["**Context.**", "**What happens.**", "**Example.**"].every((part) => text.includes(part))
        );
      })
      .map(({ route }) => route);

    expect(incomplete).toEqual([]);
  });

  it("documents the sign-in and the tenantId of a staff route", async () => {
    const spec = await readSpec();
    const threads = spec.paths["/chat-bot/threads"]?.get;

    expect(threads?.security).toEqual([{ bearerAuth: [] }]);
    expect(threads?.parameters?.filter((p) => p.name === "tenantId")).toHaveLength(1);
  });

  it("documents the headers of a Customer route", async () => {
    const spec = await readSpec();
    const send = spec.paths["/public/chat-bot"]?.post;

    expect(send?.security).toBeUndefined();
    expect(send?.parameters?.map((p) => p.name)).toContain("x-anonymous-id");
  });

  it.each(["production", undefined])("is a 404 when ENVIRONMENT is %s", async (environment) => {
    const res = await request(environment);

    expect(res.status).toBe(404);
  });
});

const docs = (environment: string | undefined) =>
  // SAFETY: the docs route reads only ENVIRONMENT.
  app.fetch(new Request("http://localhost/docs"), { ENVIRONMENT: environment } as never);

describe("GET /docs", () => {
  it("serves the docs page in development", async () => {
    const res = await docs("development");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("/openapi.json");
  });

  it.each(["production", undefined])("is a 404 when ENVIRONMENT is %s", async (environment) => {
    const res = await docs(environment);

    expect(res.status).toBe(404);
  });
});
