import { useForm } from "@tanstack/react-form";
import { FaqBodySchema, type Country, type Faq, type FaqBody, type FaqCategory, type Location } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { FAQ_NO_CATEGORY } from "../constants";
import type { FaqFormValues } from "../schemas";
import { ALL_LOCATIONS, faqScopeLabel, faqScopeOptions, toFaqBodyInput, toScopeValue } from "../utils";

type FaqFormProps = {
  categories: FaqCategory[];
  locations: Location[];
  countries: Country[];
  initial: Pick<Faq, "categoryId" | "locationId" | "countryId" | "question" | "answer"> | null;
  submitLabel: string;
  isPending: boolean;
  error: string | null;
  onSubmit: (body: FaqBody) => void;
  onCancel: (() => void) | null;
};

// -----
// One form for a new FAQ and for editing one.
// General is the empty category choice, and so
// is "All locations" for the Applies to choice
// (shown only with several Locations), which can
// also be one Country (only with several Countries).
// -----
export function FaqForm({ categories, locations, countries, initial, submitLabel, isPending, error, onSubmit, onCancel }: FaqFormProps) {
  const form = useForm({
    defaultValues: {
      categoryId: initial?.categoryId ?? FAQ_NO_CATEGORY,
      scope: toScopeValue(initial),
      question: initial?.question ?? "",
      answer: initial?.answer ?? "",
    } satisfies FaqFormValues,
    validators: {
      onChange: ({ value }) => {
        const result = FaqBodySchema.safeParse(toFaqBodyInput(value));
        if (result.success) return undefined;
        return result.error.issues.map((issue) => issue.message).join(", ");
      },
    },
    onSubmit: ({ value }) => {
      onSubmit(FaqBodySchema.parse(toFaqBodyInput(value)));
      if (initial === null) form.reset();
    },
  });

  const scopeOptions = faqScopeOptions(locations, countries);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="question">
        {(field) => (
          <Input
            aria-label="Question"
            placeholder="Question, for example: Is there parking?"
            maxLength={200}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <form.Field name="answer">
        {(field) => (
          <Textarea
            aria-label="Answer"
            placeholder="Answer"
            maxLength={1000}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <form.Field name="categoryId">
        {(field) => (
          <Select value={field.state.value} onValueChange={(value) => field.handleChange(value ?? FAQ_NO_CATEGORY)}>
            <SelectTrigger aria-label="Category" className="w-fit min-w-40">
              <SelectValue>
                {categories.find((category) => category.id === field.state.value)?.name ?? "General"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FAQ_NO_CATEGORY}>General</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </form.Field>
      {locations.length > 1 || countries.length > 1 ? (
        <form.Field name="scope">
          {(field) => (
            <Select value={field.state.value} onValueChange={(value) => field.handleChange(value ?? ALL_LOCATIONS)}>
              <SelectTrigger aria-label="Applies to" className="w-fit min-w-40">
                <SelectValue>{faqScopeLabel(field.state.value, scopeOptions)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </form.Field>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <form.Subscribe selector={(state) => FaqBodySchema.safeParse(toFaqBodyInput(state.values)).success}>
          {(isValid) => (
            <Button type="submit" size="sm" disabled={!isValid || isPending}>
              {submitLabel}
            </Button>
          )}
        </form.Subscribe>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
