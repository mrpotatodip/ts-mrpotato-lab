export type PublishMode = "replace" | "add";

// -----
// Replace deletes categories, which would take other
// Countries' prices with it, so a cafe with several
// Countries can only Add.
// -----
export const publishModesFor = (multipleCountries: boolean): PublishMode[] =>
  multipleCountries ? ["add"] : ["replace", "add"];

export const usableMode = (mode: PublishMode, multipleCountries: boolean): PublishMode =>
  publishModesFor(multipleCountries).includes(mode) ? mode : "add";

// -----
// A one-Country cafe sees the price as before; with
// several, the draft shows the currency it is read in.
// -----
export const importPriceText = (price: string, currency: string | undefined): string =>
  currency ? `${currency} ${price}` : price;
