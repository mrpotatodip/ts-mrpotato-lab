import { beforeAll, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { tenantMenuCategories } from "@repo/db-amelie";
import type { ChatBotJson, ChatBotToolError } from "@repo/contracts/chat-bots";
import type { DbConnectType } from "#/lib/db-connection";
import { mcpToolSpecs } from "#/modules/mcp/api/handle-mcp";
import type { ChatBotRuntime } from "#/modules/chat-bot/types";
import {
  createTestDb,
  insertCountry,
  insertLocation,
  insertMenuItem,
  insertMenuItemPrice,
  insertTenant,
} from "#/__tests__/amelie-test-db";

// -----
// An MCP caller has no Thread. A café selling in the US
// and in Canada: with no Location or Country named, the
// menu has names and availability but no prices, and
// says to ask which location. Naming one gives prices.
// -----
let db: DbConnectType;
let tenantId: string;
let caId: string;

type MenuResult = {
  note: string | null;
  categories: Array<{ items: Array<{ name: string; price: string | null; currency: string | null }> }>;
};

const callListMenu = async (input: ChatBotJson): Promise<MenuResult> => {
  const spec = mcpToolSpecs.find((tool) => tool.definition.name === "listMenu");
  if (!spec) throw new Error("listMenu is not an MCP tool");
  const runtime: ChatBotRuntime = {
    db,
    owner: { kind: "anonymous", tenantId, anonymousId: "mcp:203.0.113.7" },
  };
  const result: ChatBotJson | ChatBotToolError = await Effect.runPromise(spec.execute(input, runtime));
  // SAFETY: listMenu returns this plain JSON shape.
  return result as MenuResult;
};

const items = (menu: MenuResult) =>
  menu.categories.flatMap((category) => category.items).map(({ name, price, currency }) => `${name} ${price ?? "-"} ${currency ?? "-"}`);

beforeAll(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Maple Cafe", "maple");
  caId = await insertCountry(db, tenantId, { country: "CA", currency: "CAD" });
  await insertLocation(db, tenantId, { name: "Toronto", slug: "toronto", countryId: caId });
  const [category] = await db.insert(tenantMenuCategories).values({ tenantId, name: "Drinks" }).returning();
  const latte = await insertMenuItem(db, tenantId, { categoryId: category.id, name: "Latte", price: "4.00" });
  await insertMenuItemPrice(db, tenantId, latte.id, caId, { price: "5.50" });
});

describe("the MCP menu on a café with 2 open Countries", () => {
  it("with no locationId or countryId lists names and availability, no prices, and asks which location", async () => {
    const menu = await callListMenu({});

    expect(items(menu)).toEqual(["Latte - -"]);
    expect(menu.note).toMatch(/ask which location/i);
  });

  it("gives prices when a countryId is passed", async () => {
    expect(items(await callListMenu({ countryId: "CA" }))).toEqual(["Latte 5.50 CAD"]);
  });

  it("gives prices when a locationId is passed", async () => {
    expect(items(await callListMenu({ locationId: "toronto" }))).toEqual(["Latte 5.50 CAD"]);
  });
});
