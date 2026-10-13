import { z } from "zod";
import {
  LOCATION_ADDRESS_MAX,
  LOCATION_NAME_MAX,
  LOCATION_PHONE_MAX,
  LocationArchivedSchema,
  LocationIdSchema,
  LocationListSchema,
  LocationSchema,
  LocationUnsoldItemSchema,
  UpdateLocationBodySchema,
} from "@repo/contracts/amelie";
import { apiResponseSchema } from "#/lib/api-response-schema";

export const LocationListResponseSchema = apiResponseSchema(LocationListSchema);
export const LocationResponseSchema = apiResponseSchema(LocationSchema);
export const LocationArchivedResponseSchema = apiResponseSchema(LocationArchivedSchema);

export const UpdateLocationInputSchema = UpdateLocationBodySchema.extend({ locationId: LocationIdSchema });
export const ArchiveLocationInputSchema = z.object({ locationId: LocationIdSchema });
export const LocationScopeInputSchema = z.object({ locationId: LocationIdSchema.optional() });

// -----
// What the forms hold while typing: plain text
// boxes. A blank address or phone is sent as
// null; the contract bodies do the real checks.
// -----
export const LocationFormValuesSchema = z.object({
  name: z.string().max(LOCATION_NAME_MAX),
  address: z.string().max(LOCATION_ADDRESS_MAX),
  phone: z.string().max(LOCATION_PHONE_MAX),
  timezone: z.string(),
});

// -----
// The Country is held as its id, "" until chosen; it is
// only sent when the cafe sells in several.
// -----
export const LocationAddFormValuesSchema = LocationFormValuesSchema.pick({ name: true }).extend({ countryId: z.string() });

// -----
// Held in the query cache after an archive, so it
// outlives the section and the page that showed it.
// -----
export const LocationArchivedNoticeSchema = z.object({
  name: z.string(),
  unsoldMenuItems: z.array(LocationUnsoldItemSchema),
});

export type LocationArchivedNotice = z.infer<typeof LocationArchivedNoticeSchema>;
export type LocationFormValues = z.infer<typeof LocationFormValuesSchema>;
export type LocationAddFormValues = z.infer<typeof LocationAddFormValuesSchema>;
