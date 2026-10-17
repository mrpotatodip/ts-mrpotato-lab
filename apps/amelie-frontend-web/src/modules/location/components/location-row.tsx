import { useForm } from "@tanstack/react-form";
import {
  LOCATION_ADDRESS_MAX,
  LOCATION_NAME_MAX,
  LOCATION_PHONE_MAX,
  UpdateLocationBodySchema,
  type Location,
} from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { countryLabel, useActiveCountries } from "#/modules/country";
import { PowerMark } from "#/modules/shared";
import { useLocationActions } from "../hooks";
import { isLocationChanged, toLocationBody, toLocationValues } from "../utils";
import { LocationTimezoneSelect } from "./location-timezone-select";

type LocationRowProps = {
  location: Location;
  canUpdate: boolean;
  canArchive: boolean;
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
export function LocationRow({ location, canUpdate, canArchive, onArchive, isArchiving }: LocationRowProps) {
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
    <li className="p-6">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        {country ? <p className="text-muted-foreground text-xs">In {countryLabel(country)}.</p> : null}
        <div className="flex flex-wrap gap-2">
          <form.Field name="name">
            {(field) => (
              <Input
                aria-label="Name"
                placeholder="Name"
                className="w-56"
                value={field.state.value}
                maxLength={LOCATION_NAME_MAX}
                disabled={!canUpdate}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>
          <form.Field name="timezone">
            {(field) => (
              <LocationTimezoneSelect value={field.state.value} disabled={!canUpdate} onChange={field.handleChange} />
            )}
          </form.Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <form.Field name="address">
            {(field) => (
              <Input
                aria-label="Address"
                placeholder="Address (optional)"
                className="min-w-56 flex-1"
                value={field.state.value}
                maxLength={LOCATION_ADDRESS_MAX}
                disabled={!canUpdate}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>
          <form.Field name="phone">
            {(field) => (
              <Input
                aria-label="Phone"
                placeholder="Phone (optional)"
                className="w-40"
                type="tel"
                value={field.state.value}
                maxLength={LOCATION_PHONE_MAX}
                disabled={!canUpdate}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>
        </div>
        {canUpdate || canArchive ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canUpdate ? (
              <>
                <PowerMark power="company:profile:locations:update" />
                <form.Subscribe selector={(state) => state.canSubmit && isLocationChanged(state.values, location)}>
                  {(canSave) => (
                    <Button type="submit" size="sm" disabled={!canSave || updateLocation.isPending}>
                      {updateLocation.isPending ? "Saving..." : "Save"}
                    </Button>
                  )}
                </form.Subscribe>
              </>
            ) : null}
            {canArchive ? (
              <>
                <PowerMark power="company:profile:locations:archive" />
                <Button type="button" variant="ghost" size="sm" disabled={isArchiving} onClick={() => onArchive(location)}>
                  Archive
                </Button>
              </>
            ) : null}
            <form.Subscribe selector={(state) => state.errors}>
              {(errors) => (errors.length > 0 ? <p className="text-xs text-destructive">{errors.join(", ")}</p> : null)}
            </form.Subscribe>
            {updateLocation.isError ? <p className="text-xs text-destructive">{updateLocation.error.message}</p> : null}
          </div>
        ) : null}
      </form>
    </li>
  );
}
