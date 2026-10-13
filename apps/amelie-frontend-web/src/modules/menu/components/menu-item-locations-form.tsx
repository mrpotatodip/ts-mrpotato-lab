import { useForm } from "@tanstack/react-form";
import {
  MenuItemLocationsBodySchema,
  type Location,
  type MenuItem,
  type MenuItemLocationsBody,
} from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";

type MenuItemLocationsFormProps = {
  item: Pick<MenuItem, "id" | "availableAtAllLocations" | "locationIds">;
  locations: Location[];
  isPending: boolean;
  error: string | null;
  onSubmit: (body: MenuItemLocationsBody) => void;
  onCancel: () => void;
};

const ALL = "all";
const SOME = "some";

// -----
// Sold at every Location with some sold out, or
// sold only at the chosen ones. The ticked list
// means "sold out at" in the first case and
// "sold at" in the second. An archived Location
// is not shown, so it is not carried into the save.
// -----
export function MenuItemLocationsForm({ item, locations, isPending, error, onSubmit, onCancel }: MenuItemLocationsFormProps) {
  const idsAtOpenLocations = item.locationIds.filter((id) => locations.some((location) => location.id === id));
  const form = useForm({
    defaultValues: { availableAtAllLocations: item.availableAtAllLocations, locationIds: idsAtOpenLocations },
    validators: { onChange: MenuItemLocationsBodySchema },
    onSubmit: ({ value }) => onSubmit(MenuItemLocationsBodySchema.parse(value)),
  });

  return (
    <form
      className="flex flex-col gap-3 rounded-md border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="availableAtAllLocations">
        {(field) => (
          <div className="flex flex-col gap-1.5 text-sm">
            <Label htmlFor={`sold-${item.id}`}>Where is it sold?</Label>
            <Select
              value={field.state.value ? ALL : SOME}
              onValueChange={(choice) => {
                field.handleChange(choice === ALL);
                form.setFieldValue("locationIds", []);
              }}
            >
              <SelectTrigger id={`sold-${item.id}`} aria-label="Where is it sold?" className="w-64">
                <SelectValue>{field.state.value ? "All locations" : "Only some locations"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All locations</SelectItem>
                <SelectItem value={SOME}>Only some locations</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>
      <form.Field name="locationIds">
        {(field) => (
          <fieldset className="flex flex-col gap-2 text-sm">
            <form.Subscribe selector={(state) => state.values.availableAtAllLocations}>
              {(atAll) => (
                <legend className="text-muted-foreground mb-1 text-xs">
                  {atAll ? "Sold out at (leave empty if it is on sale everywhere)" : "Sold at (new locations will not sell it)"}
                </legend>
              )}
            </form.Subscribe>
            {locations.map((location) => (
              <label key={location.id} className="flex items-center gap-2">
                <Checkbox
                  checked={field.state.value.includes(location.id)}
                  onCheckedChange={(checked) =>
                    field.handleChange(
                      checked === true
                        ? [...field.state.value.filter((chosen) => chosen !== location.id), location.id]
                        : field.state.value.filter((chosen) => chosen !== location.id),
                    )
                  }
                />
                {location.name}
              </label>
            ))}
          </fieldset>
        )}
      </form.Field>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <form.Subscribe selector={(state) => MenuItemLocationsBodySchema.safeParse(state.values).success}>
          {(canSave) => (
            <Button type="submit" size="sm" disabled={!canSave || isPending}>
              Save
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
