import { useForm } from "@tanstack/react-form";
import { Check, Plus, Trash2 } from "lucide-react";
import { FaqCategoryBodySchema, type FaqCategory } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { PageCard } from "#/modules/shared";
import { useFaqActions } from "../hooks";

type FaqCategoryManagerProps = {
  categories: FaqCategory[];
};

type FaqCategoryRowProps = {
  category: FaqCategory;
};

function categoryNameError(value: { name: string }): string | undefined {
  const result = FaqCategoryBodySchema.safeParse(value);
  if (result.success) return undefined;
  return result.error.issues.map((issue) => issue.message).join(", ");
}

// -----
// The row is keyed by category id only. The saved name is
// read from the query on every render, so "changed" is
// always compared with what the server holds now.
// -----
function FaqCategoryRow({ category }: FaqCategoryRowProps) {
  const { renameCategory, removeCategory } = useFaqActions();
  const form = useForm({
    defaultValues: { name: category.name },
    validators: { onChange: ({ value }) => categoryNameError(value) },
    onSubmit: ({ value }) => {
      renameCategory.mutate({ data: { categoryId: category.id, ...FaqCategoryBodySchema.parse(value) } });
    },
  });

  return (
    <li className="flex flex-wrap items-center gap-2 py-1">
      <form
        className="flex min-w-0 flex-1 items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field name="name">
          {(field) => (
            <Input
              aria-label="Category name"
              className="min-w-0 flex-1"
              maxLength={60}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.name}>
          {(name) => (
            <Button
              type="submit"
              size="icon-sm"
              aria-label="Save category"
              title="Save"
              disabled={categoryNameError({ name }) !== undefined || name.trim() === category.name || renameCategory.isPending}
            >
              <Check />
            </Button>
          )}
        </form.Subscribe>
      </form>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Delete category"
        title="Delete"
        disabled={removeCategory.isPending}
        onClick={() => {
          if (window.confirm(`Delete "${category.name}"? Its FAQs move to General.`)) {
            removeCategory.mutate({ data: { categoryId: category.id } });
          }
        }}
      >
        <Trash2 />
      </Button>
      {renameCategory.isError ? <span className="basis-full text-xs text-destructive">{renameCategory.error.message}</span> : null}
      {removeCategory.isError ? <span className="basis-full text-xs text-destructive">{removeCategory.error.message}</span> : null}
    </li>
  );
}

// -----
// Categories group the FAQs on this page.
// A deleted one hands its FAQs to General.
// -----
export function FaqCategoryManager({ categories }: FaqCategoryManagerProps) {
  const { addCategory } = useFaqActions();
  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: ({ value }) => categoryNameError(value) },
    onSubmit: ({ value }) => {
      addCategory.mutate({ data: FaqCategoryBodySchema.parse(value) }, { onSuccess: () => form.reset() });
    },
  });

  return (
    <PageCard title="Categories" description="Group your FAQs. Deleting one moves its FAQs to General." contentClassName="space-y-2">
      <ul>
        {categories.map((category) => (
          <FaqCategoryRow key={category.id} category={category} />
        ))}
      </ul>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field name="name">
          {(field) => (
            <Input
              aria-label="New category"
              placeholder="New category"
              className="min-w-0 flex-1"
              maxLength={60}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.name}>
          {(name) => (
            <Button
              type="submit"
              size="icon-sm"
              aria-label="Add category"
              title="Add category"
              disabled={categoryNameError({ name }) !== undefined || addCategory.isPending}
            >
              <Plus />
            </Button>
          )}
        </form.Subscribe>
        {addCategory.isError ? <span className="basis-full text-xs text-destructive">{addCategory.error.message}</span> : null}
      </form>
    </PageCard>
  );
}
