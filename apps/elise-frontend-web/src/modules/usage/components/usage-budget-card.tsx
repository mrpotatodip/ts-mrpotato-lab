import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import { updateUsageBudget } from "../api";
import { usageKeys, usageQuery } from "../hooks";
import { usageBudgetFloorUsd, usageMonthLabel, usageUsd } from "../utils";
import { UsageBudgetForm } from "./usage-budget-form";

export function UsageBudgetCard() {
  const { data } = useSuspenseQuery(usageQuery());
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const save = useMutation({
    mutationFn: (monthlyBudgetUsd: number) => updateUsageBudget({ data: { monthlyBudgetUsd } }),
    onSuccess: async (usage) => {
      queryClient.setQueryData(usageKeys.month(), usage);
      setEditing(false);
      toast.success(`Monthly budget is now ${usageUsd(usage.budgetUsd)}.`);
      await queryClient.invalidateQueries({ queryKey: usageKeys.changes() });
    },
    onError: (error: Error) => toast.error(`We couldn't change the budget. ${error.message}`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly budget</CardTitle>
        <p className="max-w-copy text-sm leading-relaxed text-muted-foreground">
          The most this account spends on scans in {usageMonthLabel(data.month)}. New scans are refused once spent money plus what running scans may still spend would pass it.
        </p>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">{usageUsd(data.budgetUsd)}</p>
          {!editing && (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" />
              Change budget
            </Button>
          )}
        </div>
        {editing && (
          <UsageBudgetForm
            budgetUsd={data.budgetUsd}
            floorUsd={usageBudgetFloorUsd(data.spentUsd, data.reservedUsd)}
            allowanceUsd={data.allowanceUsd}
            pending={save.isPending}
            onSave={(budgetUsd) => save.mutate(budgetUsd)}
            onCancel={() => setEditing(false)}
          />
        )}
        <dl className="grid gap-3 border-t pt-5 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Spent this month</dt>
            <dd className="font-medium tabular-nums">{usageUsd(data.spentUsd)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Held by running scans</dt>
            <dd className="font-medium tabular-nums">{usageUsd(data.reservedUsd)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className={cn("font-medium tabular-nums", data.remainingUsd <= 0 && "text-status-danger")}>{usageUsd(Math.max(0, data.remainingUsd))}</dd>
          </div>
          {data.allowanceUsd !== undefined && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Most you can set</dt>
              <dd className="font-medium tabular-nums">{usageUsd(data.allowanceUsd)}</dd>
            </div>
          )}
        </dl>
        <p className="text-sm leading-relaxed text-muted-foreground">Need a higher budget than this? Contact Elise.</p>
      </CardContent>
    </Card>
  );
}
