import { z } from "zod";
import { MenuItemVariantSchema } from "../../amelie/menu/dto";

// -----
// What the menu tools hand back. The API checks
// it against the tool's output; the dashboard
// chat parses it to draw the menu card.
// -----
export const MenuItemResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.string().nullable(),
  currency: z.string().nullable(),
  variants: z.array(MenuItemVariantSchema).nullable(),
  isAvailable: z.boolean(),
  coverPath: z.string().nullable(),
  dietaryTags: z.array(z.string()),
});

export const MenuLocationResultSchema = z.object({
  location: z.object({ id: z.string(), name: z.string() }).nullable(),
  country: z
    .object({ id: z.string(), name: z.string(), code: z.string(), currency: z.string() })
    .nullable(),
  note: z.string().nullable(),
});

export const ListMenuResultSchema = MenuLocationResultSchema.extend({
  categories: z.array(
    z.object({ id: z.string(), name: z.string(), note: z.string().nullable(), items: z.array(MenuItemResultSchema) }),
  ),
});

export const FindMenuItemsResultSchema = MenuLocationResultSchema.extend({
  items: z.array(MenuItemResultSchema.extend({ category: z.string(), categoryNote: z.string().nullable() })),
});

// -----
// Results the menu, FAQ and profile tools share
// -----
export const MenuItemPricingResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.string().nullable(),
  currency: z.string().nullable(),
  variants: z.array(z.object({ name: z.string(), price: z.string() })).nullable(),
  isAvailable: z.boolean(),
});

export const FaqResultSchema = z.object({
  id: z.string(),
  categoryId: z.string().nullable(),
  category: z.string().nullable(),
  locationId: z.string().nullable(),
  countryId: z.string().nullable(),
  question: z.string(),
  answer: z.string(),
});

export const BusinessProfileResultSchema = z.object({
  description: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
});

export const BusinessProfileReadResultSchema = BusinessProfileResultSchema.extend({
  note: z.string().nullable(),
  location: z.object({ id: z.string(), name: z.string() }).nullable(),
  country: z.object({ id: z.string(), name: z.string(), code: z.string() }).nullable(),
});

// -----
// A write or read that needs a choice first:
// nothing changed, and these are the options
// -----
export const LocationNeededResultSchema = z.object({
  needsLocation: z.literal(true),
  message: z.string(),
  locations: z.array(z.object({ id: z.string(), name: z.string() })),
});

export const CountryNeededResultSchema = z.object({
  needsCountry: z.literal(true),
  message: z.string(),
  countries: z.array(z.object({ id: z.string(), name: z.string(), code: z.string() })),
});

export const FaqScopeNeededResultSchema = z.object({
  needsScope: z.literal(true),
  message: z.string(),
  countries: z.array(z.object({ id: z.string(), name: z.string(), code: z.string() })),
  locations: z.array(z.object({ id: z.string(), name: z.string() })),
});

export const BusinessProfileNeedsLocationResultSchema = BusinessProfileReadResultSchema.and(LocationNeededResultSchema);

export const ListTenantsResultSchema = z.object({
  tenants: z.array(z.object({ name: z.string(), slug: z.string() })),
});

// -----
// One tool each
// -----
const HoursResultFields = {
  isClosed: z.boolean(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
};

export const GetOpeningScheduleResultSchema = z.object({
  location: z.object({ id: z.string(), name: z.string() }),
  note: z.string().nullable(),
  timezone: z.string(),
  today: z.string(),
  now: z.string(),
  openNow: z.string(),
  weekly: z.array(z.object({ weekday: z.string(), isSet: z.boolean(), ...HoursResultFields })),
  next7Days: z.array(
    z.object({
      date: z.string(),
      weekday: z.string(),
      isSet: z.boolean(),
      ...HoursResultFields,
      note: z.string().nullable(),
      isSpecial: z.boolean(),
    }),
  ),
  specialDates: z.array(z.object({ date: z.string(), ...HoursResultFields, note: z.string().nullable() })),
});

export const SetMenuItemsAvailabilityResultSchema = z.object({
  items: z.array(MenuItemPricingResultSchema),
  notFound: z.array(z.string()),
});

export const MenuCategoryResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string().nullable(),
});

export const ListFaqsResultSchema = z.object({
  location: z.object({ id: z.string(), name: z.string() }).nullable(),
  country: z.object({ id: z.string(), name: z.string() }).nullable(),
  note: z.string().nullable(),
  categories: z.array(z.object({ id: z.string(), name: z.string() })),
  faqs: z.array(FaqResultSchema),
});

export const ShowMenuItemsResultSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.string().nullable(),
      currency: z.string().nullable(),
      variants: z.array(MenuItemVariantSchema).nullable(),
      coverPath: z.string().nullable(),
    }),
  ),
});

export const ReportMissingInformationResultSchema = z.object({
  topic: z.string(),
});

export const SetThreadCountryResultSchema = z.object({
  country: z.object({ id: z.string(), name: z.string(), code: z.string() }),
});

export const SetThreadLocationResultSchema = z.object({
  location: z.object({ id: z.string(), name: z.string() }),
});

export const SetBusinessHoursResultSchema = z.object({
  weekday: z.string(),
  isSet: z.boolean(),
  ...HoursResultFields,
});

export const SetHoursOverrideResultSchema = z.object({
  date: z.string(),
  ...HoursResultFields,
  note: z.string().nullable(),
});

export const RemoveHoursOverrideResultSchema = z.object({
  date: z.string(),
});

export type MenuItemResult = z.infer<typeof MenuItemResultSchema>;
export type MenuLocationResult = z.infer<typeof MenuLocationResultSchema>;
export type ListMenuResult = z.infer<typeof ListMenuResultSchema>;
export type FindMenuItemsResult = z.infer<typeof FindMenuItemsResultSchema>;
export type MenuItemPricingResult = z.infer<typeof MenuItemPricingResultSchema>;
export type FaqResult = z.infer<typeof FaqResultSchema>;
export type BusinessProfileResult = z.infer<typeof BusinessProfileResultSchema>;
export type BusinessProfileReadResult = z.infer<typeof BusinessProfileReadResultSchema>;
export type LocationNeededResult = z.infer<typeof LocationNeededResultSchema>;
export type CountryNeededResult = z.infer<typeof CountryNeededResultSchema>;
export type FaqScopeNeededResult = z.infer<typeof FaqScopeNeededResultSchema>;
export type BusinessProfileNeedsLocationResult = z.infer<typeof BusinessProfileNeedsLocationResultSchema>;
export type ListTenantsResult = z.infer<typeof ListTenantsResultSchema>;
export type GetOpeningScheduleResult = z.infer<typeof GetOpeningScheduleResultSchema>;
export type ListFaqsResult = z.infer<typeof ListFaqsResultSchema>;
export type ShowMenuItemsResult = z.infer<typeof ShowMenuItemsResultSchema>;
export type ReportMissingInformationResult = z.infer<typeof ReportMissingInformationResultSchema>;
export type SetThreadCountryResult = z.infer<typeof SetThreadCountryResultSchema>;
export type SetThreadLocationResult = z.infer<typeof SetThreadLocationResultSchema>;
export type SetBusinessHoursResult = z.infer<typeof SetBusinessHoursResultSchema>;
export type SetHoursOverrideResult = z.infer<typeof SetHoursOverrideResultSchema>;
export type RemoveHoursOverrideResult = z.infer<typeof RemoveHoursOverrideResultSchema>;
export type SetMenuItemsAvailabilityResult = z.infer<typeof SetMenuItemsAvailabilityResultSchema>;
export type MenuCategoryResult = z.infer<typeof MenuCategoryResultSchema>;
