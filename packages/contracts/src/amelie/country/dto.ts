import { z } from "zod";
import { COUNTRY_VALUES, CURRENCY_VALUES } from "../enums";
import { MenuItemVariantSchema, MenuPriceSchema } from "../menu";

// -----
// Responses: one country a Tenant sells in, with
// its Currency. archivedAt is null while open.
// -----
export const CountryIdSchema = z.uuid();

export const CountrySchema = z.object({
  id: CountryIdSchema,
  country: z.enum(COUNTRY_VALUES),
  currency: z.enum(CURRENCY_VALUES),
  archivedAt: z.iso.datetime().nullable(),
});

export const CountryListSchema = z.array(CountrySchema);

// -----
// What a Menu item costs in one Country, in its
// Currency. The price is the lowest Variant when
// there are Variants; isSold false keeps the price
// but stops selling the item there.
// -----
export const CountryPriceSchema = z.object({
  menuItemId: z.uuid(),
  countryId: CountryIdSchema,
  price: MenuPriceSchema,
  variants: z.array(MenuItemVariantSchema).nullable(),
  isSold: z.boolean(),
});

// -----
// Requests: routes about prices or FAQs may name a
// Country in the query, like locationId.
// -----
export const CountryQuerySchema = z.object({
  countryId: CountryIdSchema.optional(),
});

export const CountryParamSchema = z.object({
  countryId: CountryIdSchema,
});

// -----
// Managing Countries: the code is the identity, so
// only the Currency can be edited.
// -----
export const CreateCountryBodySchema = z.object({
  country: z.enum(COUNTRY_VALUES),
  currency: z.enum(CURRENCY_VALUES),
});

export const UpdateCountryBodySchema = z.object({
  currency: z.enum(CURRENCY_VALUES),
});

export const CountryArchivedSchema = z.object({ id: CountryIdSchema });

export type CreateCountryBody = z.infer<typeof CreateCountryBodySchema>;
export type UpdateCountryBody = z.infer<typeof UpdateCountryBodySchema>;
export type CountryArchived = z.infer<typeof CountryArchivedSchema>;
export type Country = z.infer<typeof CountrySchema>;
export type CountryList = z.infer<typeof CountryListSchema>;
export type CountryPrice = z.infer<typeof CountryPriceSchema>;
export type CountryQuery = z.infer<typeof CountryQuerySchema>;
export type CountryParam = z.infer<typeof CountryParamSchema>;
