import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { partyRoles, partyRoleScopes, tenantLocations, tenantMenuCategories, tenantMenuItems } from "@repo/db-amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { setMenuItemAvailabilityTool, setMenuItemsAvailabilityTool } from "#/modules/chat-bot/agent-tools";
import type { ChatBotOwner, ChatBotToolSpec } from "#/modules/chat-bot/types";
import { TENANT_ITEM_WIDE_NOT_COVERED } from "#/modules/tenant/constants";
import {
  createTestDb,
  insertLocation,
  insertMember,
  insertMenuItems,
  insertPersonWithLogin,
  insertTenant,
} from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let latteId: string;
let admin: ChatBotOwner;
let unbound: ChatBotOwner;
let bound: ChatBotOwner;
let coversAll: ChatBotOwner;

const run = (tool: ChatBotToolSpec, input: Parameters<ChatBotToolSpec["execute"]>[0], who: ChatBotOwner) =>
  Effect.runPromise(tool.execute(input, { db, owner: who }));

const member = async (email: string, role: string, bindings: string[] = []): Promise<ChatBotOwner> => {
  const login = await insertPersonWithLogin(db, email);
  await insertMember(db, tenantId, login.partyId, role);
  const [partyRole] = await db.select({ id: partyRoles.id }).from(partyRoles).where(eq(partyRoles.partyId, login.partyId));
  for (const locationId of bindings) {
    await db.insert(partyRoleScopes).values({ tenantId, partyRoleId: partyRole.id, locationId });
  }
  return { kind: "user", tenantId, userId: login.userId };
};

const isAvailable = async (): Promise<boolean> => {
  const [item] = await db.select().from(tenantMenuItems).where(eq(tenantMenuItems.id, latteId));
  return item.isAvailable;
};

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella", "sorella");
  const airportId = await insertLocation(db, tenantId, { name: "Airport", slug: "airport" });
  const [coffee] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Coffee" }).returning();
  const [latte] = await insertMenuItems(db, tenantId, [{ categoryId: coffee.id, name: "Latte", price: "4.75" }]);
  latteId = latte.id;
  admin = await member("admin@a.test", "tenant_admin");
  unbound = await member("unbound@a.test", "store_admin");
  bound = await member("bound@a.test", "store_admin", [airportId]);
  const open = await db.select({ id: tenantLocations.id }).from(tenantLocations).where(eq(tenantLocations.tenantId, tenantId));
  coversAll = await member("all@a.test", "store_admin", open.map((location) => location.id));
});

describe("availability tools flip one cafe-wide flag", () => {
  it("refuse a bound member and write nothing", async () => {
    const refusal = { error: TENANT_ITEM_WIDE_NOT_COVERED };
    expect(await run(setMenuItemAvailabilityTool, { itemId: latteId, isAvailable: false }, bound)).toEqual(refusal);
    expect(await run(setMenuItemsAvailabilityTool, { itemIds: [latteId], isAvailable: false }, bound)).toEqual(refusal);
    expect(await isAvailable()).toBe(true);
  });

  it("say so in plain words", () => {
    expect(TENANT_ITEM_WIDE_NOT_COVERED).toBe(
      "This change affects every Location, and your Role does not cover every Location",
    );
  });

  it("work for a bound member whose Bindings reach every open Location", async () => {
    expect(await run(setMenuItemAvailabilityTool, { itemId: latteId, isAvailable: true }, coversAll)).toHaveProperty(
      "isAvailable",
      true,
    );
  });

  it("still work for an unbound member and the tenant admin", async () => {
    expect(await run(setMenuItemAvailabilityTool, { itemId: latteId, isAvailable: false }, unbound)).toHaveProperty(
      "isAvailable",
      false,
    );
    expect(await run(setMenuItemsAvailabilityTool, { itemIds: [latteId], isAvailable: true }, admin)).toHaveProperty(
      "items.0.isAvailable",
      true,
    );
  });
});
