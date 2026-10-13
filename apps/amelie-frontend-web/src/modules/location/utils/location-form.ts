import type { Location, UpdateLocationBody } from "@repo/contracts/amelie";
import type { LocationFormValues } from "../schemas";
import { emptyToNull } from "#/modules/shared";

export const toLocationValues = (location: Location): LocationFormValues => ({
  name: location.name,
  address: location.address ?? "",
  phone: location.phone ?? "",
  timezone: location.timezone,
});

export const toLocationBody = (values: LocationFormValues): UpdateLocationBody => ({
  name: values.name.trim(),
  address: emptyToNull(values.address),
  phone: emptyToNull(values.phone),
  timezone: values.timezone.trim(),
});

// -----
// Compares what would be sent with what is
// saved, so outer spaces and a blank for a
// missing value do not count as a change.
// -----
export const isLocationChanged = (values: LocationFormValues, location: Location): boolean => {
  const body = toLocationBody(values);
  return (
    body.name !== location.name ||
    body.address !== location.address ||
    body.phone !== location.phone ||
    body.timezone !== location.timezone
  );
};
