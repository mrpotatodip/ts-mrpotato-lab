import { BusinessProfileSchema, LocationIdSchema, UpdateBusinessProfileBodySchema } from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const BusinessProfileResponseSchema = apiResponseSchema(BusinessProfileSchema);

export const UpdateBusinessProfileInputSchema = UpdateBusinessProfileBodySchema.extend({
  locationId: LocationIdSchema.optional(),
});

export type BusinessProfileFormValues = {
  description: string;
  websiteUrl: string;
  phone: string;
  email: string;
  address: string;
};
