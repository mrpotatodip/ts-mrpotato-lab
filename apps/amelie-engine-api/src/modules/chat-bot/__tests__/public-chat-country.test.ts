import { beforeAll, describe, expect, it } from "vitest";
import { Effect, Either } from "effect";
import { eq } from "drizzle-orm";
import { chatBotThreadSessions } from "@repo/db-amelie";
import { PublicChatStreamBodySchema } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { startPublicChatTurnSvc } from "#/modules/chat-bot/handlers";
import { insertChatBotThreadWithRunEffect } from "#/modules/chat-bot/queries";
import type { PublicChatLimiters } from "#/modules/chat-bot/types";
import { createTestDb, defaultLocationId, insertCountry, insertLocation, insertTenant } from "#/__tests__/amelie-test-db";

const ORIGIN = "https://app.test";

const allowAll: PublicChatLimiters = {
  message: async () => true,
  newThread: async () => true,
};

let db: DbConnectType;
let seattleId: string;
let torontoId: string;
let caId: string;
let archivedId: string;
let foreignCountryId: string;

const start = (input: { country?: string; location?: string; threadId?: string }) =>
  Effect.runPromise(
    Effect.either(
      startPublicChatTurnSvc({
        db,
        slug: "maple",
        origin: ORIGIN,
        ownOrigins: [ORIGIN],
        anonymousId: crypto.randomUUID(),
        runId: undefined,
        ip: "203.0.113.7",
        limiters: allowAll,
        threadId: undefined,
        ...input,
      }),
    ),
  );

beforeAll(async () => {
  db = await createTestDb();
  const tenantId = await insertTenant(db, "Maple Cafe", "maple");
  seattleId = await defaultLocationId(db, tenantId);
  caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  torontoId = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caId });
  archivedId = await insertCountry(db, tenantId, { country: "MX", currency: "MXN", archivedAt: new Date() });
  foreignCountryId = await insertCountry(db, await insertTenant(db, "Other Cafe", "other"), { country: "FR", currency: "EUR" });
});

describe("PublicChatStreamBodySchema country", () => {
  it("takes an optional country, code, name or id", () => {
    const body = { slug: "maple", content: "Hi" };

    expect(PublicChatStreamBodySchema.parse({ ...body, country: "CA" })).toHaveProperty("country", "CA");
    expect(PublicChatStreamBodySchema.parse(body)).not.toHaveProperty("country");
  });
});

describe("starting a Thread from an embed with a country", () => {
  it("validates a code, a name or an id against the Tenant's open Countries", async () => {
    for (const country of ["CA", "canada", caId]) {
      expect(await start({ country })).toMatchObject({ right: { countryId: caId, locationId: null } });
    }
  });

  it("has no Country when the embed names none", async () => {
    expect(await start({})).toMatchObject({ right: { countryId: null } });
  });

  it("rejects another Tenant's, an archived or a made-up Country", async () => {
    for (const country of [foreignCountryId, "FR", archivedId, "MX", "Atlantis"]) {
      const result = await start({ country });
      expect(Either.isLeft(result) && result.left._tag).toBe("NotFound");
    }
  });

  it("ignores the country on a message to an existing Thread", async () => {
    expect(await start({ country: "Atlantis", threadId: crypto.randomUUID() })).toMatchObject({
      right: { countryId: null },
    });
  });

  it("with a Location in that Country keeps both", async () => {
    expect(await start({ country: "CA", location: "toronto" })).toMatchObject({
      right: { countryId: caId, locationId: torontoId },
    });
  });

  it("refuses a country that is not the Location's Country as a validation failure, not a not-found", async () => {
    const result = await start({ country: "US", location: "toronto" });
    expect(Either.isLeft(result) && result.left._tag).toBe("Invalid");
  });

  it("lets the Location's Country win when only a Location is named", async () => {
    expect(await start({ location: seattleId })).toMatchObject({ right: { locationId: seattleId, countryId: null } });
  });
});

describe("a new Thread stores the Country on its Thread session", () => {
  it("writes country_id with the session", async () => {
    const turn = await start({ country: "CA" });
    if (!Either.isRight(turn)) throw new Error("expected a turn");

    const thread = await Effect.runPromise(
      insertChatBotThreadWithRunEffect(db, {
        owner: turn.right.owner,
        countryId: turn.right.countryId,
        title: "Hi",
        trigger: "widget",
        module: "customer",
        runId: crypto.randomUUID(),
      }),
    );
    const [session] = await db
      .select({ countryId: chatBotThreadSessions.countryId })
      .from(chatBotThreadSessions)
      .where(eq(chatBotThreadSessions.threadId, thread.id));

    expect(session.countryId).toBe(caId);
  });

  it("refuses at the database a Country of another Tenant", async () => {
    const turn = await start({});
    if (!Either.isRight(turn)) throw new Error("expected a turn");

    const result = await Effect.runPromise(
      Effect.either(
        insertChatBotThreadWithRunEffect(db, {
          owner: turn.right.owner,
          countryId: foreignCountryId,
          title: "Hi",
          trigger: "widget",
          module: "customer",
          runId: crypto.randomUUID(),
        }),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
  });
});
