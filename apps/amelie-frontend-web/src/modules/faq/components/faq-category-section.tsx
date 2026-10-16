import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { FaqCategoryBodySchema, type Country, type FaqCategory, type Location } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { PageCard } from "#/modules/shared";
import { useFaqActions } from "../hooks";
import { faqCategoryNameError, type FaqGroup } from "../utils";
import { FaqForm } from "./faq-form";
import { FaqList } from "./faq-list";

type FaqCategorySectionProps = {
  group: FaqGroup;
  categories: FaqCategory[];
  locations: Location[];
  countries: Country[];
  formCountries: Country[];
  canEdit: boolean;
};

export function FaqCategorySection({ group, categories, locations, countries, formCountries, canEdit }: FaqCategorySectionProps) {
  const { add, renameCategory, removeCategory } = useFaqActions();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const form = useForm({
    defaultValues: { name: group.title },
    validators: { onChange: ({ value }) => faqCategoryNameError(value) },
    onSubmit: ({ value }) => {
      if (group.category === null) return;
      renameCategory.mutate(
        { data: { categoryId: group.category.id, ...FaqCategoryBodySchema.parse(value) } },
        { onSuccess: () => setIsEditing(false) },
      );
    },
  });

  return (
    <PageCard
      title={isEditing ? "Edit category" : group.title}
      description={isEditing ? undefined : `${group.faqs.length} ${group.faqs.length === 1 ? "FAQ" : "FAQs"}`}
      contentClassName="p-0"
      action={
        canEdit && group.category !== null && !isEditing ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Edit category" title="Edit" onClick={() => setIsEditing(true)}>
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete category"
              title="Delete"
              disabled={removeCategory.isPending}
              onClick={() => {
                const categoryId = group.category?.id;
                if (categoryId === undefined) return;
                if (window.confirm(`Delete "${group.title}"? Its FAQs move to General.`)) {
                  removeCategory.mutate(
                    { data: { categoryId } },
                    { onSuccess: () => void navigate({ to: "/faqs", search: {} }) },
                  );
                }
              }}
            >
              <Trash2 />
            </Button>
          </div>
        ) : null
      }
    >
      {isEditing && group.category !== null ? (
        <form
          className="flex flex-col gap-3 p-6"
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
                maxLength={60}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            )}
          </form.Field>
          {renameCategory.isError ? <p className="text-xs text-destructive">{renameCategory.error.message}</p> : null}
          <div className="mt-3 flex gap-2">
            <form.Subscribe selector={(state) => state.values.name}>
              {(name) => (
                <Button
                  type="submit"
                  size="sm"
                  disabled={faqCategoryNameError({ name }) !== undefined || name.trim() === group.title || renameCategory.isPending}
                >
                  Save
                </Button>
              )}
            </form.Subscribe>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <FaqList faqs={group.faqs} categories={categories} locations={locations} countries={countries} canEdit={canEdit} />
          {removeCategory.isError ? <p className="px-6 pt-4 text-xs text-destructive">{removeCategory.error.message}</p> : null}
          {canEdit ? (
            <div className="border-t p-6">
              {isAdding ? (
                <FaqForm
                  categories={categories}
                  locations={locations}
                  countries={formCountries}
                  initial={null}
                  defaultCategoryId={group.key}
                  hideCategoryField
                  submitLabel="Add FAQ"
                  isPending={add.isPending}
                  error={add.isError ? add.error.message : null}
                  onSubmit={(body) => add.mutate({ data: body }, { onSuccess: () => setIsAdding(false) })}
                  onCancel={() => setIsAdding(false)}
                />
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(true)}>
                  Add FAQ
                </Button>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground p-6 text-sm">Only a tenant_admin or store_admin can change these.</p>
          )}
        </>
      )}
    </PageCard>
  );
}
