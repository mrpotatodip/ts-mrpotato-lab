import { beforeEach, describe, expect, it } from "vitest";
import { Effect, Either } from "effect";
import { eq } from "drizzle-orm";
import { menuItemPrices } from "@repo/db-amelie";
import { MenuItemBodySchema, SetMenuItemCountryPriceBodySchema } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { runEffect } from "#/lib/effect-query";
import { addCountrySvc, archiveCountrySvc, listCountriesSvc } from "#/modules/country";
import { COUNTRY_REQUIRED } from "#/modules/country/constants";
import {
  addMenuCategorySvc,
  addMenuItemSvc,
  getMenuEditorSvc,
  setMenuItemCountryPriceSvc,
  updateMenuItemSvc,
} from "#/modules/menu";
import { createTestDb, insertTenant } from "#/__tests__/amelie-test-db";

let db: DbConnectType;
let tenantId: string;
let usId: string;
let caId: string;
let categoryId: string;

type ItemInput = Parameters<typeof addMenuItemSvc>[2];

const itemInput = (overrides: Partial<ItemInput> = {}): ItemInput => ({
  categoryId,
  name: "Latte",
  description: null,
  price: "4.75",
  variants: null,
  isAvailable: true,
  dietaryTags: [],
  ...overrides,
});

const failure = async <A, E>(effect: Effect.Effect<A, E>) => {
  const result = await Effect.runPromise(Effect.either(effect));
  if (Either.isRight(result)) throw new Error("expected a failure");
  return result.left;
};

const menuIn = async (countryId: string) => {
  const editor = await runEffect(getMenuEditorSvc(db, tenantId, undefined, countryId));
  return editor.categories.flatMap((category) => category.items);
};

beforeEach(async () => {
  db = await createTestDb();
  tenantId = await insertTenant(db, "Sorella", "sorella");
  usId = (await runEffect(listCountriesSvc(db, tenantId)))[0].id;
  caId = (await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }))).id;
  categoryId = (await runEffect(addMenuCategorySvc(db, tenantId, { name: "Coffee", note: null }))).id;
});

describe("the menu editor for a Country", () => {
  it("returns every item with its price, Variants, currency and isSold in that Country", async () => {
    const variants = [
      { name: "Small", price: "4.75" },
      { name: "Large", price: "6.25" },
    ];
    await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: usId, variants, price: null })));

    const [latte] = await menuIn(usId);

    expect(latte).toMatchObject({ name: "Latte", price: "4.75", currency: "USD", variants, isSold: true });
  });

  it("returns an item with no price there as not sold, with no price, instead of leaving it out", async () => {
    await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: usId })));

    const items = await menuIn(caId);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: "Latte", price: null, variants: null, isSold: false });
  });

  it("keeps an empty category in the list so items can be added to it", async () => {
    const editor = await runEffect(getMenuEditorSvc(db, tenantId, undefined, caId));

    expect(editor.categories.map((category) => category.name)).toEqual(["Coffee"]);
  });

  it("answers not found for an unknown, foreign or archived Country, never an empty menu", async () => {
    const mx = await runEffect(addCountrySvc(db, tenantId, { country: "MX", currency: "MXN" }));
    await runEffect(archiveCountrySvc(db, tenantId, mx.id));
    const foreign = (await runEffect(listCountriesSvc(db, await insertTenant(db, "Other", "other"))))[0].id;

    for (const countryId of ["00000000-0000-4000-8000-000000000000", foreign, mx.id]) {
      const error = await failure(getMenuEditorSvc(db, tenantId, undefined, countryId));
      expect(error._tag).toBe("NotFound");
    }
  });
});

describe("items written for a Country", () => {
  it("prices Latte at 6.25 CAD in Canada and leaves the US menu untouched", async () => {
    await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: usId })));
    const [latte] = await menuIn(usId);

    await runEffect(setMenuItemCountryPriceSvc(db, tenantId, latte.id, caId, { price: "6.25", isSold: true }));

    expect(await menuIn(caId)).toMatchObject([{ price: "6.25", currency: "CAD", isSold: true }]);
    expect(await menuIn(usId)).toMatchObject([{ price: "4.75", currency: "USD", isSold: true }]);
  });

  it("a new item in Canada is priced there only", async () => {
    const created = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: caId, price: "6.25" })));

    expect(created).toMatchObject({ price: "6.25", currency: "CAD" });
    expect(await menuIn(usId)).toMatchObject([{ name: "Latte", price: null, isSold: false }]);
  });

  it("an edit writes the price to the Country it names", async () => {
    const created = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: usId })));

    await runEffect(updateMenuItemSvc(db, tenantId, created.id, itemInput({ countryId: caId, price: "7.00" })));

    expect(await menuIn(caId)).toMatchObject([{ price: "7.00", isSold: true }]);
    expect(await menuIn(usId)).toMatchObject([{ price: "4.75" }]);
  });

  it("an item can be created not sold in its Country", async () => {
    await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: usId, isSold: false })));

    expect(await menuIn(usId)).toMatchObject([{ price: "4.75", isSold: false }]);
  });

  it("needs a countryId once the cafe has two open Countries", async () => {
    const error = await failure(addMenuItemSvc(db, tenantId, itemInput()));

    expect(error).toMatchObject({ _tag: "Invalid", message: COUNTRY_REQUIRED });
  });

  it("uses the only Country when the cafe has one", async () => {
    await runEffect(archiveCountrySvc(db, tenantId, caId));

    const created = await runEffect(addMenuItemSvc(db, tenantId, itemInput()));

    expect(created).toMatchObject({ price: "4.75", currency: "USD" });
  });

  it("refuses a Country that is not an open one of this cafe", async () => {
    const mx = await runEffect(addCountrySvc(db, tenantId, { country: "MX", currency: "MXN" }));
    await runEffect(archiveCountrySvc(db, tenantId, mx.id));

    const error = await failure(addMenuItemSvc(db, tenantId, itemInput({ countryId: mx.id })));

    expect(error._tag).toBe("NotFound");
  });
});

describe("editing an item's own fields without pricing it", () => {
  it("an edit with a countryId and no price changes the name and leaves that Country's price alone", async () => {
    const created = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: usId })));

    await runEffect(
      updateMenuItemSvc(db, tenantId, created.id, itemInput({ countryId: caId, name: "Oat latte", price: null })),
    );

    expect(await menuIn(caId)).toMatchObject([{ name: "Oat latte", price: null, isSold: false }]);
    expect(await menuIn(usId)).toMatchObject([{ name: "Oat latte", price: "4.75", isSold: true }]);
  });

  it("a new item still needs a price in its Country", async () => {
    const error = await failure(addMenuItemSvc(db, tenantId, itemInput({ countryId: caId, price: null })));

    expect(error._tag).toBe("Invalid");
  });
});

describe("setMenuItemCountryPriceSvc", () => {
  it("turning sold-here off keeps the price, and turning it on again brings it back", async () => {
    const created = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: usId })));

    await runEffect(setMenuItemCountryPriceSvc(db, tenantId, created.id, usId, { isSold: false }));
    expect(await menuIn(usId)).toMatchObject([{ price: "4.75", isSold: false }]);
    const rows = await db.select().from(menuItemPrices).where(eq(menuItemPrices.menuItemId, created.id));
    expect(rows[0]).toMatchObject({ price: "4.75", isSold: false });

    await runEffect(setMenuItemCountryPriceSvc(db, tenantId, created.id, usId, { isSold: true }));
    expect(await menuIn(usId)).toMatchObject([{ price: "4.75", isSold: true }]);
  });

  it("sets Variants and the lowest price for the Country", async () => {
    const created = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: usId })));
    const variants = [
      { name: "Small", price: "5.50" },
      { name: "Large", price: "7.00" },
    ];

    await runEffect(setMenuItemCountryPriceSvc(db, tenantId, created.id, caId, { variants, isSold: true }));

    expect(await menuIn(caId)).toMatchObject([{ price: "5.50", variants, currency: "CAD" }]);
  });

  it("refuses to sell an item in a Country where it has no price yet", async () => {
    const created = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: usId })));

    const error = await failure(setMenuItemCountryPriceSvc(db, tenantId, created.id, caId, { isSold: true }));

    expect(error._tag).toBe("Invalid");
  });

  it("does not find another Tenant's item or a Country that is not open", async () => {
    const created = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: usId })));
    await runEffect(archiveCountrySvc(db, tenantId, caId));

    const badCountry = await failure(
      setMenuItemCountryPriceSvc(db, tenantId, created.id, caId, { price: "6.25", isSold: true }),
    );
    const otherTenant = await insertTenant(db, "Other", "other");
    const badItem = await failure(
      setMenuItemCountryPriceSvc(db, otherTenant, created.id, usId, { price: "6.25", isSold: true }),
    );

    expect(badCountry._tag).toBe("NotFound");
    expect(badItem._tag).toBe("NotFound");
  });
});

describe("archiving and re-adding a Country", () => {
  it("brings the prices back when the archived Country is added again", async () => {
    const created = await runEffect(addMenuItemSvc(db, tenantId, itemInput({ countryId: caId, price: "6.25" })));
    await runEffect(archiveCountrySvc(db, tenantId, caId));

    const restored = await runEffect(addCountrySvc(db, tenantId, { country: "CA", currency: "CAD" }));

    expect(restored.id).toBe(caId);
    expect(await menuIn(caId)).toMatchObject([{ id: created.id, price: "6.25", currency: "CAD", isSold: true }]);
  });
});

describe("the item contracts", () => {
  const body = { categoryId: "00000000-0000-4000-8000-000000000000", name: "Latte", description: null, price: "4.75", variants: null, isAvailable: true, dietaryTags: [] };

  it("accept an optional countryId and isSold on an item", () => {
    const parsed = MenuItemBodySchema.parse({ ...body, countryId: "00000000-0000-4000-8000-000000000000", isSold: false });

    expect(parsed).toMatchObject({ isSold: false });
    expect(MenuItemBodySchema.safeParse(body).success).toBe(true);
  });

  it("need a price without Variants, unless a countryId says the edit leaves the price alone", () => {
    const countryId = "00000000-0000-4000-8000-000000000000";

    expect(MenuItemBodySchema.safeParse({ ...body, price: null }).success).toBe(false);
    expect(MenuItemBodySchema.safeParse({ ...body, price: null, countryId }).success).toBe(true);
  });

  it("let the Country price body leave the price out to only flip the flag, and need a price with no Variants otherwise", () => {
    expect(SetMenuItemCountryPriceBodySchema.safeParse({ isSold: false }).success).toBe(true);
    expect(SetMenuItemCountryPriceBodySchema.safeParse({ isSold: true, price: "6.25" }).success).toBe(true);
    expect(SetMenuItemCountryPriceBodySchema.safeParse({ isSold: true, price: null, variants: null }).success).toBe(false);
    expect(
      SetMenuItemCountryPriceBodySchema.safeParse({
        isSold: true,
        variants: [
          { name: "A", price: "1.00" },
          { name: "a", price: "2.00" },
        ],
      }).success,
    ).toBe(false);
  });
});
