import { beforeAll, describe, expect, it } from "vitest";
import { Effect, Either } from "effect";
import { StaffChatStreamBodySchema } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { resolveChatBotPlaceSvc } from "#/modules/chat-bot/handlers";
import { createTestDb, defaultLocationId, insertCountry, insertLocation, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let seattleId: string;
let torontoId: string;
let caId: string;
let foreignCountryId: string;
let foreignLocationId: string;

const place = (input: { location?: string; country?: string; threadId?: string }) =>
  Effect.runPromise(Effect.either(resolveChatBotPlaceSvc(db, tenantId, input)));

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Maple Cafe", "maple-staff");
  seattleId = await defaultLocationId(db, tenantId);
  caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  torontoId = await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caId });
  const otherId = await insertTenant(db, "Other Cafe", "other-staff");
  foreignCountryId = await insertCountry(db, otherId, { country: "FR", currency: "EUR" });
  foreignLocationId = await defaultLocationId(db, otherId);
});

describe("StaffChatStreamBodySchema", () => {
  it("takes an optional country and location on a first message", () => {
    const body = { content: "Hours?" };

    expect(StaffChatStreamBodySchema.parse({ ...body, country: caId, location: torontoId })).toMatchObject({
      country: caId,
      location: torontoId,
    });
    expect(StaffChatStreamBodySchema.parse(body)).not.toHaveProperty("country");
    expect(StaffChatStreamBodySchema.parse(body)).not.toHaveProperty("location");
  });
});

describe("resolveChatBotPlaceSvc for a staff Thread", () => {
  it("pins a dashboard Location and Country", async () => {
    expect(await place({ country: caId, location: torontoId })).toMatchObject({
      right: { countryId: caId, locationId: torontoId },
    });
  });

  it("pins a Country alone", async () => {
    expect(await place({ country: "CA" })).toMatchObject({ right: { countryId: caId, locationId: null } });
  });

  it("has no place when the dashboard names none", async () => {
    expect(await place({})).toMatchObject({ right: { countryId: null, locationId: null } });
  });

  it("ignores the dashboard pick on an existing Thread", async () => {
    expect(await place({ country: "CA", location: torontoId, threadId: crypto.randomUUID() })).toMatchObject({
      right: { countryId: null, locationId: null },
    });
  });

  it("rejects another Tenant's Country or Location", async () => {
    for (const input of [{ country: foreignCountryId }, { location: foreignLocationId }]) {
      const result = await place(input);
      expect(Either.isLeft(result) && result.left._tag).toBe("NotFound");
    }
  });

  it("refuses a country that is not the Location's Country", async () => {
    const result = await place({ country: "US", location: torontoId });
    expect(Either.isLeft(result) && result.left._tag).toBe("Invalid");
  });

  it("keeps a Location when only that is named", async () => {
    expect(await place({ location: seattleId })).toMatchObject({
      right: { locationId: seattleId, countryId: null },
    });
  });
});
