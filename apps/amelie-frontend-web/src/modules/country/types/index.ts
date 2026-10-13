import type { Country, CurrencyValue } from "@repo/contracts/amelie";

// -----
// A currency change waiting for the owner to confirm
// that nothing is converted.
// -----
export type CountryCurrencyChange = { country: Country; currency: CurrencyValue };
