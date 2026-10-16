import { beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { Effect, Either } from "effect";
import { sql, type SQL } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { chatBotMessages, tenantBusinessProfiles, tenantLocations } from "@repo/db-amelie";
import { PUBLIC_CHAT_MESSAGE_MAX_LENGTH, PublicChatStreamBodySchema } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { AppError } from "#/lib/errors";
import type { AppEnv } from "#/types/variables";
import type { PublicTenant } from "#/modules/tenant";
import { publicChatBotRestAPI } from "#/modules/chat-bot";
import { checkPublicChatOriginEffect, guardPublicChatTurnSvc } from "#/modules/chat-bot/handlers";
import { isPublicChatOriginAllowed } from "#/modules/chat-bot/lib";
import {
  countTenantCustomerMessagesTodayEffect,
  insertChatBotThreadWithRunEffect,
} from "#/modules/chat-bot/queries";
import type {
  ChatBotAnonymousOwner,
  ChatBotOwner,
  PublicChatLimiters,
} from "#/modules/chat-bot/types";
import {
  CHAT_BOT_PUBLIC_TENANT_DAILY_MESSAGE_LIMIT,
  CHAT_BOT_PUBLIC_THREAD_MESSAGE_LIMIT,
} from "#/modules/chat-bot/constants";
import { createTestDb, insertLocation, insertMember, insertPersonWithLogin, insertTenant } from "#/__tests__/amelie-test-db";

const TIMEZONE = "America/New_York";

let db: DbConnectType;
let tenant: PublicTenant;

const allowAll: PublicChatLimiters = {
  message: async () => true,
  newThread: async () => true,
};

const customer = (): ChatBotAnonymousOwner => ({
  kind: "anonymous",
  tenantId: tenant.id,
  anonymousId: crypto.randomUUID(),
});

const startThread = async (owner: ChatBotOwner) =>
  (
    await Effect.runPromise(
      insertChatBotThreadWithRunEffect(db, {
        owner,
        title: "Hi",
        trigger: owner.kind === "user" ? "chat" : "widget",
        module: owner.kind === "user" ? "chat" : "customer",
        runId: crypto.randomUUID(),
      }),
    )
  ).id;

const addMessages = async (
  threadId: string,
  count: number,
  role: "user" | "assistant" = "user",
  createdAt?: SQL,
) => {
  if (count === 0) return;
  await db.insert(chatBotMessages).values(
    Array.from({ length: count }, () => ({
      threadId,
      tenantId: tenant.id,
      role,
      content: "Open?",
      createdAt: createdAt ?? sql`now()`,
    })),
  );
};

const guard = (owner: ChatBotAnonymousOwner, threadId?: string, limiters = allowAll) =>
  Effect.runPromise(
    Effect.either(guardPublicChatTurnSvc({ db, tenant, owner, threadId, ip: "203.0.113.7", limiters })),
  );

const codeOf = (result: Either.Either<void, { _tag: string; code?: string }>) =>
  Either.isLeft(result) ? result.left.code ?? result.left._tag : "ok";

beforeAll(async () => {
  db = await createTestDb();
  const id = await insertTenant(db, "Sorella Cafe", "sorella");
  tenant = {
    id,
    name: "Sorella Cafe",
    timezone: TIMEZONE,
    allowedOrigins: ["https://sorellacafe.com"],
    customerChatLabel: "Chat with us",
    customerChatAccent: null,
  };
  await db
    .insert(tenantBusinessProfiles)
    .values({ tenantId: id, email: "hello@sorella.test" });
  await db.update(tenantLocations).set({ phone: "845-871-2010" }).where(eq(tenantLocations.tenantId, id));
});

describe("allowed origins", () => {
  it("matches a listed website by origin, ignoring path and slash", () => {
    expect(isPublicChatOriginAllowed("https://sorellacafe.com", ["https://sorellacafe.com/"])).toBe(true);
    expect(isPublicChatOriginAllowed("https://evil.example", ["https://sorellacafe.com"])).toBe(false);
  });

  it("refuses a request with no Origin, or the opaque 'null' one", () => {
    expect(isPublicChatOriginAllowed(undefined, ["https://sorellacafe.com"])).toBe(false);
    expect(isPublicChatOriginAllowed("null", ["https://sorellacafe.com"])).toBe(false);
  });

  it("lets the Tenant's sites and Amelie's own pages in, and nobody else", async () => {
    const check = (origin: string) =>
      Effect.runPromise(
        Effect.either(checkPublicChatOriginEffect(tenant, origin, ["http://localhost:3000"])),
      );

    expect(Either.isRight(await check("https://sorellacafe.com"))).toBe(true);
    expect(Either.isRight(await check("http://localhost:3000"))).toBe(true);
    expect(codeOf(await check("https://other-cafe.example"))).toBe("Forbidden");
  });
});

describe("per-minute limits", () => {
  it("refuses a Customer over their message rate", async () => {
    const limiters = { ...allowAll, message: async () => false };

    expect(codeOf(await guard(customer(), undefined, limiters))).toBe("RATE_LIMITED");
  });

  it("refuses a new thread from an IP over its rate", async () => {
    const limiters = { ...allowAll, newThread: async () => false };

    expect(codeOf(await guard(customer(), undefined, limiters))).toBe("RATE_LIMITED");
  });

  it("doesn't spend the new-thread limit on an existing thread", async () => {
    const owner = customer();
    const threadId = await startThread(owner);
    const limiters = { ...allowAll, newThread: async () => false };

    expect(codeOf(await guard(owner, threadId, limiters))).toBe("ok");
  });

  it("lets the message through when the limiter itself fails", async () => {
    const limiters = {
      ...allowAll,
      message: async () => {
        throw new Error("limiter down");
      },
    };

    expect(codeOf(await guard(customer(), undefined, limiters))).toBe("ok");
  });
});

describe("messages per thread", () => {
  it(`allows message ${CHAT_BOT_PUBLIC_THREAD_MESSAGE_LIMIT}, refuses the next`, async () => {
    const owner = customer();
    const threadId = await startThread(owner);
    await addMessages(threadId, CHAT_BOT_PUBLIC_THREAD_MESSAGE_LIMIT - 1);
    await addMessages(threadId, 5, "assistant");

    expect(codeOf(await guard(owner, threadId))).toBe("ok");

    await addMessages(threadId, 1);

    expect(codeOf(await guard(owner, threadId))).toBe("THREAD_LIMIT");
  });

  it("doesn't count a thread the Customer doesn't hold", async () => {
    const owner = customer();
    const threadId = await startThread(owner);
    await addMessages(threadId, CHAT_BOT_PUBLIC_THREAD_MESSAGE_LIMIT);

    expect(codeOf(await guard(customer(), threadId))).toBe("ok");
  });
});

describe("messages per Tenant per day", () => {
  it("counts only today in the Tenant's timezone, and only Customers", async () => {
    const owner = customer();
    const threadId = await startThread(owner);
    const login = await insertPersonWithLogin(db, "owner@sorella.test");
    await insertMember(db, tenant.id, login.partyId, "tenant_admin");
    const staffThreadId = await startThread({ kind: "user", tenantId: tenant.id, userId: login.userId });
    const yesterday = sql`date_trunc('day', now() at time zone ${TIMEZONE}) at time zone ${TIMEZONE} - interval '1 minute'`;

    await addMessages(threadId, CHAT_BOT_PUBLIC_TENANT_DAILY_MESSAGE_LIMIT, "user", yesterday);
    await addMessages(staffThreadId, CHAT_BOT_PUBLIC_TENANT_DAILY_MESSAGE_LIMIT);

    expect(codeOf(await guard(customer()))).toBe("ok");
  });

  it(`refuses at ${CHAT_BOT_PUBLIC_TENANT_DAILY_MESSAGE_LIMIT} with the Tenant's phone and email`, async () => {
    const owner = customer();
    const threadId = await startThread(owner);
    const alreadyToday = await Effect.runPromise(
      countTenantCustomerMessagesTodayEffect(db, tenant.id, TIMEZONE),
    );
    await addMessages(threadId, CHAT_BOT_PUBLIC_TENANT_DAILY_MESSAGE_LIMIT - 1 - alreadyToday);

    expect(codeOf(await guard(customer()))).toBe("ok");

    await addMessages(threadId, 1);
    const result = await guard(customer());

    expect(codeOf(result)).toBe("TENANT_DAILY_LIMIT");
    expect(Either.isLeft(result) && result.left.message).toBe(
      "Our assistant is resting for today. Contact Sorella Cafe at 845-871-2010 or hello@sorella.test.",
    );
  });

  it("gives only the Tenant's email when it has several Locations, since no phone is the right one", async () => {
    await insertLocation(db, tenant.id, { name: "Airport", slug: "airport", phone: "845-000-0000" });

    const result = await guard(customer());

    expect(Either.isLeft(result) && result.left.message).toBe(
      "Our assistant is resting for today. Contact Sorella Cafe at hello@sorella.test.",
    );
  });
});

describe("public chat request size", () => {
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

  const post = (body: string) =>
    app.request("/public/chat-bot", {
      method: "POST",
      headers: { "content-type": "application/json", "x-anonymous-id": crypto.randomUUID() },
      body,
    });

  it("refuses a body over 4 KB before reading it", async () => {
    const res = await post(JSON.stringify({ slug: "sorella", content: "a".repeat(5000) }));

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({ error: "PAYLOAD_TOO_LARGE" });
  });

  it(`refuses a message over ${PUBLIC_CHAT_MESSAGE_MAX_LENGTH} characters as a 400`, async () => {
    const res = await post(
      JSON.stringify({ slug: "sorella", content: "a".repeat(PUBLIC_CHAT_MESSAGE_MAX_LENGTH + 1) }),
    );

    expect(res.status).toBe(400);
  });

  it(`accepts exactly ${PUBLIC_CHAT_MESSAGE_MAX_LENGTH} characters`, () => {
    const content = "a".repeat(PUBLIC_CHAT_MESSAGE_MAX_LENGTH);

    expect(PublicChatStreamBodySchema.parse({ slug: "sorella", content }).content).toBe(content);
  });
});
