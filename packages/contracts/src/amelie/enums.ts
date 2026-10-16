import { COUNTRIES } from "./constants";

// -----
// Twin of party_type in db-amelie;
// change both together.
// -----
export const PARTY_TYPE_VALUES = ["person", "organization"] as const;

export type PartyTypeValue = (typeof PARTY_TYPE_VALUES)[number];

// -----
// The Role keys the code itself relies on. Every
// other Role key is data in access_master_roles.
// -----
export const TENANT_ADMIN_ROLE_KEY = "tenant_admin";

// -----
// Last segment of a Power path. The tree of
// nodes in front of it lives in access/.
// -----
export const ACCESS_ACTION_VALUES = [
  "read",
  "create",
  "update",
  "delete",
  "archive",
  "reorder",
  "publish",
  "dismiss",
] as const;

export type AccessActionValue = (typeof ACCESS_ACTION_VALUES)[number];

export const IMPORT_STATUS_VALUES = ["running", "ready", "failed"] as const;
export const IMPORT_DRAFT_KIND_VALUES = ["menu_category", "menu_item", "business_hours", "business_profile"] as const;
export const IMPORT_DRAFT_STATUS_VALUES = ["pending", "approved", "discarded"] as const;
export const IMPORT_PUBLISH_MODE_VALUES = ["replace", "add"] as const;

export const INVITE_CODE_STATUS_VALUES = ["active", "used_up", "expired", "revoked"] as const;

export type InviteCodeStatusValue = (typeof INVITE_CODE_STATUS_VALUES)[number];

const [firstCountry, ...otherCountries] = COUNTRIES;

export const COUNTRY_VALUES = [firstCountry.country, ...otherCountries.map((entry) => entry.country)] as const;

export const CURRENCY_VALUES = [
  "AED",
  "ARS",
  "AUD",
  "BDT",
  "BGN",
  "BRL",
  "CAD",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CRC",
  "CZK",
  "DKK",
  "DOP",
  "EGP",
  "EUR",
  "GBP",
  "GHS",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "ISK",
  "JMD",
  "JPY",
  "KES",
  "KHR",
  "KRW",
  "KWD",
  "LKR",
  "MAD",
  "MXN",
  "MYR",
  "NGN",
  "NOK",
  "NZD",
  "PEN",
  "PHP",
  "PKR",
  "PLN",
  "QAR",
  "RON",
  "SAR",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "TWD",
  "UAH",
  "USD",
  "UYU",
  "VND",
  "ZAR",
] as const;

export type CountryValue = (typeof COUNTRY_VALUES)[number];
export type CurrencyValue = (typeof CURRENCY_VALUES)[number];
