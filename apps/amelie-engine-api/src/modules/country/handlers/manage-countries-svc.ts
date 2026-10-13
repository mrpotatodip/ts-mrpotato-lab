import type { Effect } from "effect";
import type { Country, CountryArchived, CreateCountryBody } from "@repo/contracts/amelie";
import type { DbConnectType } from "#/lib/db-connection";
import type { Conflict, DbError, NotFound } from "#/lib/effect-query";
import {
  addCountryEffect,
  archiveCountryEffect,
  listCountriesEffect,
  updateCountryCurrencyEffect,
} from "#/modules/country/queries";

export const listCountriesSvc = (db: DbConnectType, tenantId: string): Effect.Effect<Country[], DbError> =>
  listCountriesEffect(db, tenantId);

export const addCountrySvc = (
  db: DbConnectType,
  tenantId: string,
  body: CreateCountryBody,
): Effect.Effect<Country, Conflict | DbError> => addCountryEffect(db, tenantId, body);

// -----
// Prices keep their numbers: nothing is converted.
// -----
export const updateCountryCurrencySvc = (
  db: DbConnectType,
  tenantId: string,
  countryId: string,
  currency: string,
): Effect.Effect<Country, NotFound | DbError> => updateCountryCurrencyEffect(db, tenantId, countryId, currency);

// -----
// A Country is archived, never deleted. A Tenant
// keeps one open Country, and a Country with open
// Locations stays open.
// -----
export const archiveCountrySvc = (
  db: DbConnectType,
  tenantId: string,
  countryId: string,
): Effect.Effect<CountryArchived, NotFound | Conflict | DbError> =>
  archiveCountryEffect(db, tenantId, countryId, new Date());
