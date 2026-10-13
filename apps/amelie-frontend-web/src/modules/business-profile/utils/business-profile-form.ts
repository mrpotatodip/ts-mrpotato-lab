import type { BusinessProfile } from "@repo/contracts/amelie";
import { emptyToNull } from "#/modules/shared";
import type { BusinessProfileFormValues } from "../schemas";

export const toProfileValues = (profile: BusinessProfile): BusinessProfileFormValues => ({
  description: profile.description ?? "",
  websiteUrl: profile.websiteUrl ?? "",
  phone: profile.phone ?? "",
  email: profile.email ?? "",
  address: profile.address ?? "",
});

export const toProfileBody = (value: BusinessProfileFormValues) => ({
  description: emptyToNull(value.description),
  websiteUrl: emptyToNull(value.websiteUrl),
  phone: emptyToNull(value.phone),
  email: emptyToNull(value.email),
  address: emptyToNull(value.address),
});
