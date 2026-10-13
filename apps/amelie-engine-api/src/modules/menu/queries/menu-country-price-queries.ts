import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { menuItemPrices, tenantMenuItems } from "@repo/db-amelie";
import type { MenuItemVariant } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import { toDbError, type DbError } from "#/lib/effect-query";

type PriceWriter = Pick<DbConnectType, "insert">;

export type CountryPriceValue = { price: string; variants: MenuItemVariant[] | null };

export type CountryPriceSaveResult = "saved" | "no-item" | "no-price";

// -----
// The item's price in one named Country: created sold
// (or as isSold says), or its price and Variants
// replaced. isSold left out keeps the flag as it was.
// The caller has checked the Country is an open one
// of the Tenant, or resolved it with firstOpenCountryId.
// -----
export const upsertCountryPrice = async (
  tx: PriceWriter,
  tenantId: string,
  menuItemId: string,
  countryId: string,
  value: CountryPriceValue,
  isSold?: boolean,
): Promise<void> => {
  const set: Partial<typeof menuItemPrices.$inferInsert> = {
    price: value.price,
    variants: value.variants,
    updatedAt: new Date(),
  };
  if (isSold !== undefined) set.isSold = isSold;
  await tx
    .insert(menuItemPrices)
    .values({ tenantId, menuItemId, countryId, price: value.price, variants: value.variants, isSold: isSold ?? true })
    .onConflictDoUpdate({ target: [menuItemPrices.menuItemId, menuItemPrices.countryId], set });
};

// -----
// Only the flag, on a price row that is already there.
// Answers whether there was a row to change.
// -----
export const setCountrySoldFlag = async (
  tx: Pick<DbConnectType, "update">,
  tenantId: string,
  menuItemId: string,
  countryId: string,
  isSold: boolean,
): Promise<boolean> => {
  const updated = await tx
    .update(menuItemPrices)
    .set({ isSold, updatedAt: new Date() })
    .where(
      and(
        eq(menuItemPrices.tenantId, tenantId),
        eq(menuItemPrices.menuItemId, menuItemId),
        eq(menuItemPrices.countryId, countryId),
      ),
    )
    .returning({ id: menuItemPrices.menuItemId });
  return updated.length > 0;
};

export type CountryPriceChange = {
  isSold: boolean;
  priced: CountryPriceValue | null;
};

// -----
// Sets one item's Country price and sold-here flag in
// one transaction. With no new price only the flag
// changes, and the price stays; selling an item that
// has no price row yet is "no-price". An item of
// another Tenant is "no-item".
// -----
export const setCountryPriceEffect = (
  db: DbConnectType,
  tenantId: string,
  itemId: string,
  countryId: string,
  change: CountryPriceChange,
): Effect.Effect<CountryPriceSaveResult, DbError> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const [item] = await tx
          .select({ id: tenantMenuItems.id })
          .from(tenantMenuItems)
          .where(and(eq(tenantMenuItems.tenantId, tenantId), eq(tenantMenuItems.id, itemId)));
        if (!item) return "no-item" as const;
        if (change.priced) {
          await upsertCountryPrice(tx, tenantId, itemId, countryId, change.priced, change.isSold);
          return "saved" as const;
        }
        const changed = await setCountrySoldFlag(tx, tenantId, itemId, countryId, change.isSold);
        if (!changed && change.isSold) return "no-price" as const;
        return "saved" as const;
      }),
    catch: toDbError,
  });
