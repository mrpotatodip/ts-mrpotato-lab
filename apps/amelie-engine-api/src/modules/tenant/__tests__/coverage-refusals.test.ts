import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { uncoveredLocations, type Coverage } from "@repo/contracts/amelie";
import { partyRoles, partyRoleScopes, tenantLocations } from "@repo/db-amelie";
import { AppError } from "#/lib/errors";
import type { DbConnectType } from "#/lib/db-connection";
import type { AppEnv } from "#/types/variables";
import { requireBoundChatBotPower } from "#/modules/chat-bot/lib";
import {
  requireBoundPower,
  requireCovered,
  TENANT_LOCATION_NOT_COVERED,
  TENANT_LOCATIONS_NOT_COVERED,
} from "#/modules/tenant";
import {
  createTestDb,
  insertLocation,
  insertMember,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";

describe("uncoveredLocations", () => {
  it("finds nothing wrong with a whole-cafe coverage, whatever is named", () => {
    expect(uncoveredLocations("all", [])).toBeNull();
    expect(uncoveredLocations("all", [A])).toBeNull();
  });

  it("flags a member who covers nothing, even when no Location is named", () => {
    expect(uncoveredLocations([], [])).toEqual({ coversNothing: true, uncovered: [] });
    expect(uncoveredLocations([], [A])).toEqual({ coversNothing: true, uncovered: [A] });
  });

  it("lists the named Locations the coverage misses", () => {
    expect(uncoveredLocations([A], [])).toBeNull();
    expect(uncoveredLocations([A], [A])).toBeNull();
    expect(uncoveredLocations([A, B], [A, C, B])).toEqual({ coversNothing: false, uncovered: [C] });
  });
});

const statusFor = async (coverage: Coverage) => {
  const app = new Hono<AppEnv>();
  app.onError((err, c) => {
    if (err instanceof AppError) {
      // SAFETY: AppError subclasses only use 4xx/5xx codes.
      return c.json({ data: null, error: { message: err.message } }, err.statusCode as 403);
    }
    throw err;
  });
  app.use("*", async (c, next) => {
    c.set("powers", ["store:menu:availability:update"]);
    c.set("coverage", coverage);
    await next();
  });
  app.get("/", requireBoundPower("store:menu:availability:update", () => []), (c) => c.json({ ok: true }));
  const res = await app.request("/");
  return { status: res.status, message: (await res.json()).error?.message };
};

describe("requireBoundPower with no Location named", () => {
  it("passes for whole-cafe and for a member who covers something", async () => {
    expect((await statusFor("all")).status).toBe(200);
    expect((await statusFor([A])).status).toBe(200);
  });

  it("refuses a member who covers nothing", async () => {
    expect(await statusFor([])).toEqual({ status: 403, message: TENANT_LOCATION_NOT_COVERED });
  });
});

const runCovered = (coverage: Coverage, ids: string[]) => Effect.runPromise(Effect.either(requireCovered(coverage, ids)));

describe("requireCovered with no Location named", () => {
  it("passes only for whole-cafe: a Country with no open Location is a scope nobody can be bound to", async () => {
    expect((await runCovered("all", []))._tag).toBe("Right");
    const covering = await runCovered([A], []);
    expect(covering._tag).toBe("Left");
    expect(covering._tag === "Left" && covering.left.message).toBe(TENANT_LOCATION_NOT_COVERED);
    const nothing = await runCovered([], []);
    expect(nothing._tag === "Left" && nothing.left.message).toBe(TENANT_LOCATION_NOT_COVERED);
  });

  it("names the Locations a member misses", async () => {
    const missed = await runCovered([A], [A, B]);
    expect(missed._tag === "Left" && missed.left.message).toBe(TENANT_LOCATIONS_NOT_COVERED([B]));
    expect((await runCovered([A, B], [A, B]))._tag).toBe("Right");
  });
});

describe("requireBoundChatBotPower with no Location named", () => {
  let db: DbConnectType;
  let tenantId: string;
  let covering: string;
  let coversNothing: string;

  const check = (userId: string) =>
    Effect.runPromise(
      Effect.either(
        requireBoundChatBotPower(
          { db, owner: { kind: "user", tenantId, userId } },
          "store:menu:availability:update",
          [],
        ),
      ),
    );

  beforeAll(async () => {
    db = await createTestDb();
    tenantId = await insertTenant(db, "Sorella", "sorella");
    const airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
    const goneId = await insertLocation(db, tenantId, { name: "Gone", slug: "gone" });
    await db.update(tenantLocations).set({ archivedAt: new Date() }).where(eq(tenantLocations.id, goneId));
    const bind = async (email: string, locationId: string) => {
      const login = await insertPersonWithLogin(db, email);
      await insertMember(db, tenantId, login.partyId, "store_admin");
      const [role] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, login.partyId));
      await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: role.id, locationId });
      return login.userId;
    };
    covering = await bind("covering@t.test", airportId);
    coversNothing = await bind("nothing@t.test", goneId);
  });

  it("passes for a member who covers something and refuses one who covers nothing", async () => {
    expect((await check(covering))._tag).toBe("Right");
    const refused = await check(coversNothing);
    expect(refused._tag === "Left" && refused.left.message).toBe(TENANT_LOCATION_NOT_COVERED);
  });
});
