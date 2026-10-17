import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { FaqCategoryBodySchema } from "@repo/contracts/amelie";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";
import { PageCard, PowerMark } from "#/modules/shared";
import { FAQ_NO_CATEGORY } from "../constants";
import { useFaqAccess, useFaqActions } from "../hooks";
import { faqCategoryNameError, type FaqGroup } from "../utils";

type FaqCategoryNavProps = {
  groups: FaqGroup[];
  selectedKey: string;
};

export function FaqCategoryNav({ groups, selectedKey }: FaqCategoryNavProps) {
  const { canCreateCategory } = useFaqAccess();
  const { addCategory } = useFaqActions();
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: ({ value }) => faqCategoryNameError(value) },
    onSubmit: ({ value }) => {
      addCategory.mutate(
        { data: FaqCategoryBodySchema.parse(value) },
        {
          onSuccess: (category) => {
            form.reset();
            void navigate({ to: "/faqs", search: { category: category.id } });
          },
        },
      );
    },
  });

  return (
    <PageCard title="Categories" description="Open one category at a time." contentClassName="p-0">
      <ul className="p-3">
        {groups.map((group) => (
          <li key={group.key}>
            <Link
              to="/faqs"
              search={group.key === FAQ_NO_CATEGORY ? {} : { category: group.key }}
              className={cn(
                "hover:bg-muted flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm",
                selectedKey === group.key && "bg-primary/10 font-medium",
              )}
            >
              <span className="min-w-0 truncate">{group.title}</span>
              <span className="text-muted-foreground text-xs font-normal">{group.faqs.length}</span>
            </Link>
          </li>
        ))}
      </ul>
      {canCreateCategory ? (
        <form
          className="flex flex-wrap items-center gap-2 border-t p-6"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <PowerMark power="company:faqs:categories:create" />
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
                title="Add"
                disabled={faqCategoryNameError({ name }) !== undefined || addCategory.isPending}
              >
                <Plus />
              </Button>
            )}
          </form.Subscribe>
          {addCategory.isError ? <span className="basis-full text-xs text-destructive">{addCategory.error.message}</span> : null}
        </form>
      ) : null}
    </PageCard>
  );
}
