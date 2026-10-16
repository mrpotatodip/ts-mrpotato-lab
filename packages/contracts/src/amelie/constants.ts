import type { CurrencyValue } from "./enums";

export const PUBLIC_CHAT_MESSAGE_MAX_LENGTH = 500;

// -----
// Menu imports: one PDF, or up to 10 images
// -----
export const IMPORT_MAX_IMAGES = 10;
export const IMPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const IMPORT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMPORT_PDF_TYPE = "application/pdf";

export const MENU_ITEM_IMAGE_MAX = 10;

// -----
// Sign-up: limits the form and the server share
// -----
export const SIGN_UP_INVITE_CODE_MAX = 128;
export const SIGN_UP_PERSON_NAME_MAX = 60;
export const SIGN_UP_CAFE_NAME_MAX = 80;
export const SIGN_UP_EMAIL_MAX = 254;
export const SIGN_UP_PASSWORD_MIN = 8;
export const SIGN_UP_PASSWORD_MAX = 128;
export const SIGN_UP_WEBSITE_MAX = 2048;

// -----
// Widget: websites that may iframe the Customer chat
// -----
export const ALLOWED_ORIGINS_MAX = 20;
export const CUSTOMER_CHAT_LABEL_MAX = 40;
export const CUSTOMER_CHAT_LABEL_DEFAULT = "Chat with us";

// -----
// Invite codes: limits the admin form and the server share
// -----
export const INVITE_CODE_NOTE_MAX = 200;
export const INVITE_CODE_MAX_USES_DEFAULT = 1;
export const INVITE_CODE_MAX_USES_LIMIT = 1000;

export const TEAM_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TEAM_INVITE_TOKEN_BYTES = 32;

// -----
// Locations: limits the form and the server share
// -----
export const LOCATION_NAME_MAX = 80;
export const LOCATION_ADDRESS_MAX = 200;
export const LOCATION_PHONE_MAX = 40;

// -----
// Region: the currency a country pre-selects.
// Country only pre-selects the currency, so the
// two stay independent.
// -----
export const COUNTRIES = [
  { country: "US", currency: "USD" },
  { country: "CA", currency: "CAD" },
  { country: "MX", currency: "MXN" },
  { country: "GB", currency: "GBP" },
  { country: "IE", currency: "EUR" },
  { country: "FR", currency: "EUR" },
  { country: "DE", currency: "EUR" },
  { country: "IT", currency: "EUR" },
  { country: "ES", currency: "EUR" },
  { country: "PT", currency: "EUR" },
  { country: "NL", currency: "EUR" },
  { country: "BE", currency: "EUR" },
  { country: "LU", currency: "EUR" },
  { country: "AT", currency: "EUR" },
  { country: "FI", currency: "EUR" },
  { country: "GR", currency: "EUR" },
  { country: "HR", currency: "EUR" },
  { country: "SK", currency: "EUR" },
  { country: "SI", currency: "EUR" },
  { country: "EE", currency: "EUR" },
  { country: "LV", currency: "EUR" },
  { country: "LT", currency: "EUR" },
  { country: "MT", currency: "EUR" },
  { country: "CY", currency: "EUR" },
  { country: "CH", currency: "CHF" },
  { country: "SE", currency: "SEK" },
  { country: "NO", currency: "NOK" },
  { country: "DK", currency: "DKK" },
  { country: "IS", currency: "ISK" },
  { country: "PL", currency: "PLN" },
  { country: "CZ", currency: "CZK" },
  { country: "HU", currency: "HUF" },
  { country: "RO", currency: "RON" },
  { country: "BG", currency: "BGN" },
  { country: "TR", currency: "TRY" },
  { country: "UA", currency: "UAH" },
  { country: "AU", currency: "AUD" },
  { country: "NZ", currency: "NZD" },
  { country: "JP", currency: "JPY" },
  { country: "KR", currency: "KRW" },
  { country: "CN", currency: "CNY" },
  { country: "HK", currency: "HKD" },
  { country: "TW", currency: "TWD" },
  { country: "SG", currency: "SGD" },
  { country: "MY", currency: "MYR" },
  { country: "TH", currency: "THB" },
  { country: "VN", currency: "VND" },
  { country: "ID", currency: "IDR" },
  { country: "PH", currency: "PHP" },
  { country: "KH", currency: "KHR" },
  { country: "IN", currency: "INR" },
  { country: "PK", currency: "PKR" },
  { country: "BD", currency: "BDT" },
  { country: "LK", currency: "LKR" },
  { country: "AE", currency: "AED" },
  { country: "SA", currency: "SAR" },
  { country: "QA", currency: "QAR" },
  { country: "KW", currency: "KWD" },
  { country: "IL", currency: "ILS" },
  { country: "EG", currency: "EGP" },
  { country: "ZA", currency: "ZAR" },
  { country: "NG", currency: "NGN" },
  { country: "KE", currency: "KES" },
  { country: "GH", currency: "GHS" },
  { country: "MA", currency: "MAD" },
  { country: "BR", currency: "BRL" },
  { country: "AR", currency: "ARS" },
  { country: "CL", currency: "CLP" },
  { country: "CO", currency: "COP" },
  { country: "PE", currency: "PEN" },
  { country: "UY", currency: "UYU" },
  { country: "EC", currency: "USD" },
  { country: "PA", currency: "USD" },
  { country: "CR", currency: "CRC" },
  { country: "DO", currency: "DOP" },
  { country: "JM", currency: "JMD" },
] as const satisfies ReadonlyArray<{ country: string; currency: CurrencyValue }>;
