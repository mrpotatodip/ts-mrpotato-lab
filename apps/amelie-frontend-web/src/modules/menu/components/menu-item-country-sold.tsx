import { useId } from "react";
import { useForm } from "@tanstack/react-form";
import { SetMenuItemCountryPriceBodySchema, type MenuItem } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { needsCountryPrice, toPriceEntryBody } from "../utils";

type MenuItemCountrySoldProps = {
  item: MenuItem;
  currency: string;
  isPending: boolean;
  error: string | null;
  onSetSold: (isSold: boolean) => void;
  onSetPrice: (price: string) => void;
};

// -----
// Whether this Country sells the item. Turning it off
// keeps the price, so it can come back. An item with
// no price here has nothing to switch on: it asks for
// a price, which also starts selling it.
// -----
export function MenuItemCountrySold({ item, currency, isPending, error, onSetSold, onSetPrice }: MenuItemCountrySoldProps) {
  const id = useId();

  const form = useForm({
    defaultValues: { price: "" },
    onSubmit: ({ value }) => {
      if (SetMenuItemCountryPriceBodySchema.safeParse(toPriceEntryBody(value.price)).success) onSetPrice(value.price.trim());
    },
  });

  return (
    <div className="space-y-1">
      {needsCountryPrice(item) ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field name="price">
            {(field) => (
              <Input
                aria-label={`Price in ${currency}`}
                placeholder={`Price in ${currency}`}
                className="w-40"
                inputMode="decimal"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => SetMenuItemCountryPriceBodySchema.safeParse(toPriceEntryBody(state.values.price)).success}>
            {(valid) => (
              <Button type="submit" size="sm" variant="outline" disabled={!valid || isPending}>
                {isPending ? "Saving..." : "Sell here"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={item.isSold === true}
            disabled={isPending}
            onCheckedChange={(checked) => onSetSold(checked === true)}
          />
          <Label htmlFor={id} className="font-normal">
            Sold in this country
          </Label>
        </div>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
