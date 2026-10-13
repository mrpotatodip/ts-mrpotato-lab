import { useForm } from "@tanstack/react-form";
import {
  LOCATION_ADDRESS_MAX,
  LOCATION_NAME_MAX,
  LOCATION_PHONE_MAX,
  UpdateLocationBodySchema,
  type Location,
} from "@repo/contracts/amelie";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { countryLabel, useActiveCountries } from "#/modules/country";
import { useLocationActions } from "../hooks";
import { isLocationChanged, toLocationBody, toLocationValues } from "../utils";
import { LocationTimezoneSelect } from "./location-timezone-select";

type LocationRowProps = {
  location: Location;
  canEdit: boolean;
  onArchive: (location: Location) => void;
  isArchiving: boolean;
};

// -----
// One Location's name, address, phone and timezone.
// The form starts from the saved Location and
// follows it while untouched. Archiving is asked
// by the section; the last active Location is
// refused by the server with its reason.
// -----
export function LocationRow({ location, canEdit, onArchive, isArchiving }: LocationRowProps) {
  const { updateLocation } = useLocationActions();
  const { countries } = useActiveCountries();
  const country = countries.length > 1 ? countries.find((entry) => entry.id === location.countryId) : undefined;

  const form = useForm({
    defaultValues: toLocationValues(location),
    validators: {
      onChange: ({ value }) => {
        const result = UpdateLocationBodySchema.safeParse(toLocationBody(value));
        if (result.success) return undefined;
        return result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
      },
    },
    onSubmit: ({ value }) =>
      updateLocation.mutate(
        { data: { locationId: location.id, ...toLocationBody(value) } },
        { onSuccess: (saved) => form.reset(toLocationValues(saved)) },
      ),
  });

  return (
    <li className="px-6 py-5">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        {country ? <Badge variant="outline">{countryLabel(country)}</Badge> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <form.Field name="name">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`location-name-${location.id}`}>Name</Label>
                <Input
                  id={`location-name-${location.id}`}
                  value={field.state.value}
                  maxLength={LOCATION_NAME_MAX}
                  disabled={!canEdit}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="timezone">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`location-timezone-${location.id}`}>Timezone</Label>
                <LocationTimezoneSelect
                  id={`location-timezone-${location.id}`}
                  value={field.state.value}
                  disabled={!canEdit}
                  onChange={field.handleChange}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="address">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`location-address-${location.id}`}>Address</Label>
                <Input
                  id={`location-address-${location.id}`}
                  value={field.state.value}
                  maxLength={LOCATION_ADDRESS_MAX}
                  disabled={!canEdit}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="phone">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`location-phone-${location.id}`}>Phone</Label>
                <Input
                  id={`location-phone-${location.id}`}
                  type="tel"
                  value={field.state.value}
                  maxLength={LOCATION_PHONE_MAX}
                  disabled={!canEdit}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </div>
            )}
          </form.Field>
        </div>
        {canEdit ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <form.Subscribe selector={(state) => state.canSubmit && isLocationChanged(state.values, location)}>
              {(canSave) => (
                <Button type="submit" size="sm" disabled={!canSave || updateLocation.isPending}>
                  {updateLocation.isPending ? "Saving..." : "Save"}
                </Button>
              )}
            </form.Subscribe>
            <Button type="button" variant="ghost" size="sm" disabled={isArchiving} onClick={() => onArchive(location)}>
              Archive
            </Button>
            <form.Subscribe selector={(state) => state.errors}>
              {(errors) => (errors.length > 0 ? <span className="text-xs text-destructive">{errors.join(", ")}</span> : null)}
            </form.Subscribe>
            {updateLocation.isError ? <span className="text-xs text-destructive">{updateLocation.error.message}</span> : null}
          </div>
        ) : null}
      </form>
    </li>
  );
}
