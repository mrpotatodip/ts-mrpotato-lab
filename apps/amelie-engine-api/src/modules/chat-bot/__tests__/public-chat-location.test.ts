import { beforeAll, describe, expect, it } from "vitest";
import { Effect, Either } from "effect";
import { eq } from "drizzle-orm";
import { chatBotThreadSessions, tenantLocations } from "@repo/db-amelie";
import { PublicChatStreamBodySchema } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { startPublicChatTurnSvc } from "#/modules/chat-bot/handlers";
import { insertChatBotThreadWithRunEffect } from "#/modules/chat-bot/queries";
import type { PublicChatLimiters } from "#/modules/chat-bot/types";
import { createTestDb, defaultLocationId, insertLocation, insertTenant } from "#/__tests__/amelie-test-db";

const ORIGIN = "https://app.test";

const allowAll: PublicChatLimiters = {
  message: async () => true,
  newThread: async () => true,
};

let db: DbConnectType;
let tenantId: string;
let downtownId: string;
let airportId: string;
let otherTenantLocationId: string;
let otherTenantSlug: string;

const start = (location: string | undefined, threadId?: string) =>
  Effect.runPromise(
    Effect.either(
      startPublicChatTurnSvc({
        db,
        slug: "two-branch",
        origin: ORIGIN,
        ownOrigins: [ORIGIN],
        anonymousId: crypto.randomUUID(),
        runId: undefined,
        threadId,
        location,
        ip: "203.0.113.7",
        limiters: allowAll,
      }),
    ),
  );

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Two Branch Cafe", "two-branch");
  downtownId = await defaultLocationId(db, tenantId);
  airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  otherTenantSlug = "other";
  otherTenantLocationId = await defaultLocationId(db, await insertTenant(db, "Other Cafe", otherTenantSlug));
});

describe("PublicChatStreamBodySchema location", () => {
  it("takes an optional location, slug or id", () => {
    const body = { slug: "two-branch", content: "Open?" };

    expect(PublicChatStreamBodySchema.parse({ ...body, location: "airport" })).toHaveProperty("location", "airport");
    expect(PublicChatStreamBodySchema.parse(body)).not.toHaveProperty("location");
  });
});

describe("starting a Thread from an embed with a location", () => {
  it("validates a slug against the Tenant", async () => {
    expect(await start("airport")).toMatchObject({ right: { locationId: airportId } });
  });

  it("validates an id against the Tenant", async () => {
    expect(await start(downtownId)).toMatchObject({ right: { locationId: downtownId } });
  });

  it("has no Location when the embed names none", async () => {
    expect(await start(undefined)).toMatchObject({ right: { locationId: null } });
  });

  it("rejects another Tenant's Location, by id or slug", async () => {
    for (const foreign of [otherTenantLocationId, otherTenantSlug]) {
      const result = await start(foreign);
      expect(Either.isLeft(result) && result.left._tag).toBe("NotFound");
    }
  });

  it("rejects an archived Location", async () => {
    await insertLocation(db, tenantId, { name: "Closed", slug: "closed" });
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.slug, "closed"));

    const result = await start("closed");
    expect(Either.isLeft(result) && result.left._tag).toBe("NotFound");
  });

  it("ignores the location on a message to an existing Thread", async () => {
    expect(await start("not-a-location", crypto.randomUUID())).toMatchObject({ right: { locationId: null } });
  });
});

describe("a new Thread stores the Location on its Thread session", () => {
  it("writes location_id with the session", async () => {
    const turn = await start("airport");
    if (!Either.isRight(turn)) throw new Error("expected a turn");

    const thread = await Effect.runPromise(
      insertChatBotThreadWithRunEffect(db, {
        owner: turn.right.owner,
        locationId: turn.right.locationId,
        title: "Hi",
        trigger: "widget",
        module: "customer",
        runId: crypto.randomUUID(),
      }),
    );
    const [session] = await db
      .select({ locationId: chatBotThreadSessions.locationId })
      .from(chatBotThreadSessions)
      .where(eq(chatBotThreadSessions.threadId, thread.id));

    expect(session.locationId).toBe(airportId);
  });

  it("refuses at the database a Location of another Tenant", async () => {
    const turn = await start(undefined);
    if (!Either.isRight(turn)) throw new Error("expected a turn");

    const result = await Effect.runPromise(
      Effect.either(
        insertChatBotThreadWithRunEffect(db, {
          owner: turn.right.owner,
          locationId: otherTenantLocationId,
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
