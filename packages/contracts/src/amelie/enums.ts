import { COUNTRIES } from "./constants";

// -----
// Twin of party_type in db-amelie;
// change both together.
// -----
export const PARTY_TYPE_VALUES = ["person", "organization"] as const;

export type PartyTypeValue = (typeof PARTY_TYPE_VALUES)[number];

// -----
// Twin of DEFAULT_TENANT_ROLES in db-amelie;
// change both together. Every Tenant has these
// three Roles; superuser is global, no Tenant.
// -----
export const TENANT_ROLE_KEY_VALUES = ["owner", "manager", "staff"] as const;
export const ROLE_KEY_VALUES = [...TENANT_ROLE_KEY_VALUES, "superuser"] as const;

export type TenantRoleKeyValue = (typeof TENANT_ROLE_KEY_VALUES)[number];
export type RoleKeyValue = (typeof ROLE_KEY_VALUES)[number];

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
