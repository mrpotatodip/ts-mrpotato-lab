import { and, eq, exists, not, or, sql, type SQL } from "drizzle-orm";
import type { DbConnectType } from "#/lib/db-connection";
import {
  menuItemPrices,
  tenantLocations,
  tenantMenuItemLocations,
  tenantMenuItems,
} from "@repo/db-amelie";

const locationRow = (db: DbConnectType, locationId: string, isAvailable: boolean) =>
  exists(
    db
      .select({ one: tenantMenuItemLocations.menuItemId })
      .from(tenantMenuItemLocations)
      .where(
        and(
          eq(tenantMenuItemLocations.menuItemId, tenantMenuItems.id),
          eq(tenantMenuItemLocations.tenantId, tenantMenuItems.tenantId),
          eq(tenantMenuItemLocations.locationId, locationId),
          eq(tenantMenuItemLocations.isAvailable, isAvailable),
        ),
      ),
  );

// -----
// A price row says the item is sold in the Country the
// Location is in (ADR-0002). A price row with is_sold
// off, or none, means it is not sold there.
// -----
const soldInLocationCountry = (db: DbConnectType, locationId: string) =>
  exists(
    db
      .select({ one: menuItemPrices.menuItemId })
      .from(menuItemPrices)
      .where(
        and(
          eq(menuItemPrices.menuItemId, tenantMenuItems.id),
          eq(menuItemPrices.tenantId, tenantMenuItems.tenantId),
          eq(menuItemPrices.isSold, true),
          eq(
            menuItemPrices.countryId,
            db
              .select({ countryId: tenantLocations.countryId })
              .from(tenantLocations)
              .where(and(eq(tenantLocations.id, locationId), eq(tenantLocations.tenantId, tenantMenuItems.tenantId))),
          ),
        ),
      ),
  );

// -----
// The one availability rule (ADR-0001, ADR-0002), used by
// every menu read that is about a Location. The item must
// be available overall and sold in the Location's Country.
// Then an all-Locations item hides only where a row says
// sold out; any other item shows only where a row says it
// is sold.
// -----
export const menuItemShownAt = (
  db: DbConnectType,
  locationId: string,
  includeUnavailable = false,
): SQL | undefined =>
  and(
    includeUnavailable ? undefined : eq(tenantMenuItems.isAvailable, true),
    soldInLocationCountry(db, locationId),
    or(
      and(eq(tenantMenuItems.availableAtAllLocations, true), not(locationRow(db, locationId, false))),
      and(eq(tenantMenuItems.availableAtAllLocations, false), locationRow(db, locationId, true)),
    ),
  );

// -----
// Sold in a Country, with no Location in play: a price
// row with is_sold on. Used when a Country is passed
// explicitly (the dashboard's Country switcher, the
// assistant's countryId).
// -----
export const menuItemSoldInCountry = (db: DbConnectType, countryId: string | null): SQL =>
  countryId === null
    ? sql`false`
    : exists(
        db
          .select({ one: menuItemPrices.menuItemId })
          .from(menuItemPrices)
          .where(
            and(
              eq(menuItemPrices.menuItemId, tenantMenuItems.id),
              eq(menuItemPrices.tenantId, tenantMenuItems.tenantId),
              eq(menuItemPrices.countryId, countryId),
              eq(menuItemPrices.isSold, true),
            ),
          ),
      );

// -----
// Join condition for the item's price in the Country
// being quoted. No Country matches no price row.
// -----
export const countryPriceOn = (countryId: string | null): SQL =>
  // SAFETY: and() is undefined only when every condition is, and the first two never are.
  and(
    eq(menuItemPrices.menuItemId, tenantMenuItems.id),
    eq(menuItemPrices.tenantId, tenantMenuItems.tenantId),
    countryId === null ? sql`false` : eq(menuItemPrices.countryId, countryId),
  ) as SQL;
