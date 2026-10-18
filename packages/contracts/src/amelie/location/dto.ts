import { z } from "zod";
import { LOCATION_ADDRESS_MAX, LOCATION_NAME_MAX, LOCATION_PHONE_MAX } from "../constants";

// -----
// Responses: one physical place a Tenant
// operates from. archivedAt is null while
// the Location is active.
// -----
export const LocationIdSchema = z.uuid();

export const LocationSchema = z.object({
  id: LocationIdSchema,
  name: z.string(),
  slug: z.string(),
  countryId: z.uuid(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  timezone: z.string(),
  archivedAt: z.iso.datetime().nullable(),
});

// -----
// Requests: staff routes about hours or contact
// details name a Location in the query. Left out,
// a Tenant with one Location uses it.
// -----
export const LocationQuerySchema = z.object({
  locationId: LocationIdSchema.optional(),
});

export const LocationParamSchema = z.object({
  locationId: LocationIdSchema,
});

const isTimezone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const locationTimezone = z.string().refine(isTimezone, "Must be an IANA timezone, e.g. Europe/Rome");
const locationText = (max: number) => z.string().trim().min(1).max(max).nullable();

const EditableLocationFieldsSchema = z.object({
  name: z.string().trim().min(1).max(LOCATION_NAME_MAX),
  address: locationText(LOCATION_ADDRESS_MAX).optional(),
  phone: locationText(LOCATION_PHONE_MAX).optional(),
  timezone: locationTimezone.optional(),
});

// -----
// A new Location names its Country: required once the
// Tenant has two open ones, defaulted when it has one.
// -----
export const CreateLocationBodySchema = EditableLocationFieldsSchema.extend({
  countryId: z.uuid().optional(),
});

// -----
// A field left out is kept, so every field is optional.
// A Location's Country is fixed at creation: a countryId
// sent here is stripped and never read.
// -----
export const UpdateLocationBodySchema = EditableLocationFieldsSchema.partial();

// -----
// The menu items that were sold only at the
// archived Location and so are sold nowhere now
// -----
export const LocationUnsoldItemSchema = z.object({ id: z.uuid(), name: z.string() });

export const LocationArchivedSchema = z.object({
  id: LocationIdSchema,
  unsoldMenuItems: z.array(LocationUnsoldItemSchema),
});

// -----
// What archiving a Location will do to team members:
// those whose Bindings reach no other open Location,
// who will then be refused every limited action.
// Computed by the server so the dashboard can name them.
// -----
export const LocationArchivePreviewSchema = z.object({
  id: LocationIdSchema,
  membersWithoutLocation: z.array(z.object({ partyId: z.uuid(), name: z.string(), email: z.string() })),
});

export const LocationListSchema = z.array(LocationSchema);

export type Location = z.infer<typeof LocationSchema>;
export type LocationQuery = z.infer<typeof LocationQuerySchema>;
export type LocationList = z.infer<typeof LocationListSchema>;
export type LocationParam = z.infer<typeof LocationParamSchema>;
export type CreateLocationBody = z.infer<typeof CreateLocationBodySchema>;
export type UpdateLocationBody = z.infer<typeof UpdateLocationBodySchema>;
export type LocationUnsoldItem = z.infer<typeof LocationUnsoldItemSchema>;
export type LocationArchivePreview = z.infer<typeof LocationArchivePreviewSchema>;
export type LocationArchived = z.infer<typeof LocationArchivedSchema>;
