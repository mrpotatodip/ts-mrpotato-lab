import { z } from "zod";
import {
  CountryArchivedSchema,
  CountryIdSchema,
  CountryListSchema,
  CountrySchema,
  UpdateCountryBodySchema,
} from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const CountryListResponseSchema = apiResponseSchema(CountryListSchema);
export const CountryResponseSchema = apiResponseSchema(CountrySchema);
export const CountryArchivedResponseSchema = apiResponseSchema(CountryArchivedSchema);

export const UpdateCountryInputSchema = UpdateCountryBodySchema.extend({ countryId: CountryIdSchema });
export const ArchiveCountryInputSchema = z.object({ countryId: CountryIdSchema });

// -----
// What the add form holds while typing: the picked
// country and its currency. The contract body does
// the real checks.
// -----
export const CountryAddFormValuesSchema = z.object({
  country: z.string(),
  currency: z.string(),
});

export type CountryAddFormValues = z.infer<typeof CountryAddFormValuesSchema>;
