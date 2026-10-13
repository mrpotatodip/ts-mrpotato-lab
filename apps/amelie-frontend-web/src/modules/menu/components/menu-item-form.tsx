import { useId } from "react";
import { useForm } from "@tanstack/react-form";
import {
  MenuItemBodySchema,
  type Country,
  type DietaryTag,
  type MenuCategory,
  type MenuItem,
  type MenuItemBody,
} from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { countryLabel } from "#/modules/country";
import type { MenuItemFormValues } from "../schemas";
import { toItemCandidate, toItemFormValues } from "../utils";

type MenuItemFormProps = {
  categories: Array<Pick<MenuCategory, "id" | "name">>;
  dietaryTags: DietaryTag[];
  categoryId: string;
  country: Country | undefined;
  initial: MenuItem | null;
  submitLabel: string;
  isPending: boolean;
  error: string | null;
  onSubmit: (body: MenuItemBody) => void;
  onCancel: () => void;
};

// -----
// One item: a single price, or Variants such as
// sizes. With Variants the price is the lowest one.
// -----
export function MenuItemForm({
  categories,
  dietaryTags,
  categoryId: initialCategoryId,
  country,
  initial,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: MenuItemFormProps) {
  const formId = useId();
  const scope = { countryId: country?.id, countryScoped: country !== undefined && initial !== null };
  const check = (values: MenuItemFormValues) => MenuItemBodySchema.safeParse(toItemCandidate(values, scope));

  const form = useForm({
    defaultValues: toItemFormValues(initial, initialCategoryId),
    onSubmit: ({ value }) => {
      const result = check(value);
      if (result.success) onSubmit(result.data);
    },
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="flex flex-wrap gap-2">
        <form.Field name="name">
          {(field) => (
            <Input aria-label="Item name" placeholder="Name" className="w-56" maxLength={120} value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
          )}
        </form.Field>
        <form.Field name="categoryId">
          {(field) => (
            <Select value={field.state.value} onValueChange={(value) => field.handleChange(value ?? field.state.value)}>
              <SelectTrigger aria-label="Category" className="w-fit min-w-40">
                <SelectValue>{categories.find((category) => category.id === field.state.value)?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </form.Field>
      </div>
      <form.Field name="description">
        {(field) => (
          <Textarea aria-label="Description" placeholder="Description (optional)" maxLength={500} value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
        )}
      </form.Field>

      {country ? <p className="text-muted-foreground text-xs">Prices are for {countryLabel(country)}.</p> : null}
      <form.Field name="variants" mode="array">
        {(variants) => (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {variants.state.value.length === 0 ? (
                <form.Field name="price">
                  {(field) => (
                    <Input aria-label="Price" placeholder="Price, for example 4.75" className="w-40" inputMode="decimal" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                  )}
                </form.Field>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={() => variants.pushValue({ name: "", price: "" })}>
                Add Variant
              </Button>
            </div>

            {variants.state.value.map((_, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <form.Field name={`variants[${index}].name`}>
                  {(field) => (
                    <Input aria-label="Variant name" placeholder="Variant, for example Large" className="w-48" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                  )}
                </form.Field>
                <form.Field name={`variants[${index}].price`}>
                  {(field) => (
                    <Input aria-label="Variant price" placeholder="Price" className="w-28" inputMode="decimal" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
                  )}
                </form.Field>
                <Button type="button" variant="ghost" size="sm" onClick={() => void variants.removeValue(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </>
        )}
      </form.Field>

      <div role="group" aria-labelledby={`${formId}-tags`} className="flex flex-wrap gap-x-4 gap-y-2">
        <Label id={`${formId}-tags`} className="text-muted-foreground w-full text-xs font-normal">
          Dietary tags
        </Label>
        <form.Field name="dietaryTags">
          {(field) =>
            dietaryTags.map((tag) => (
              <div key={tag.slug} className="flex items-center gap-2">
                <Checkbox
                  id={`${formId}-${tag.slug}`}
                  checked={field.state.value.includes(tag.slug)}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true ? [...field.state.value, tag.slug] : field.state.value.filter((slug) => slug !== tag.slug))
                  }
                />
                <Label htmlFor={`${formId}-${tag.slug}`} className="font-normal">
                  {tag.label}
                </Label>
              </div>
            ))
          }
        </form.Field>
      </div>

      <form.Field name="isAvailable">
        {(field) => (
          <div className="flex items-center gap-2">
            <Checkbox id={`${formId}-available`} checked={field.state.value} onCheckedChange={(checked) => field.handleChange(checked === true)} />
            <Label htmlFor={`${formId}-available`} className="font-normal">
              Available
            </Label>
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => check(state.values)}>
        {(result) => (
          <>
            {!result.success ? <p className="text-xs text-destructive">{result.error.issues[0]?.path.join(".")}: {result.error.issues[0]?.message}</p> : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!result.success || isPending}>
                {submitLabel}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </form.Subscribe>
    </form>
  );
}
