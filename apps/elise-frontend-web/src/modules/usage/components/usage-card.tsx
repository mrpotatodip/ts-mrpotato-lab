import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { hasAccessPower } from "@repo/contracts/elise";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Progress } from "#/components/ui/progress";
import { cn } from "#/lib/utils";
import { updateUsageBudget } from "../api";
import { usageKeys, usageQuery } from "../hooks";
import { usageBudgetFloorUsd, usageCommittedPercent, usageMonthLabel, usageTokens, usageUsd } from "../utils";
import { UsageBudgetForm } from "./usage-budget-form";

export function UsageCard() {
  const { data } = useSuspenseQuery(usageQuery());
  const { user } = useRouteContext({ from: "/_app" });
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const canEdit = hasAccessPower(user?.powers ?? [], "company:usage:budget:update");
  const percent = usageCommittedPercent(data.budgetUsd, data.spentUsd, data.reservedUsd);
  const tight = percent >= 90;
  const tokenTotal = data.tokens.input + data.tokens.output + data.tokens.cacheRead + data.tokens.cacheWrite;

  const save = useMutation({
    mutationFn: (monthlyBudgetUsd: number) => updateUsageBudget({ data: { monthlyBudgetUsd } }),
    onSuccess: (usage) => {
      queryClient.setQueryData(usageKeys.month(), usage);
      setEditing(false);
      toast.success(`Monthly budget is now ${usageUsd(usage.budgetUsd)}.`);
    },
    onError: (error: Error) => toast.error(`We couldn't change the budget. ${error.message}`),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly budget</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">{usageMonthLabel(data.month)}.</p>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex items-end justify-between gap-4">
          <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">{usageUsd(data.spentUsd)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">of {usageUsd(data.budgetUsd)}</p>
        </div>
        {editing ? (
          <UsageBudgetForm
            budgetUsd={data.budgetUsd}
            floorUsd={usageBudgetFloorUsd(data.spentUsd, data.reservedUsd)}
            allowanceUsd={data.allowanceUsd}
            pending={save.isPending}
            onSave={(budgetUsd) => save.mutate(budgetUsd)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          canEdit && (
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" />
              Change budget
            </Button>
          )
        )}
        <Progress value={percent} aria-label="Share of the monthly budget spent or held by running scans" indicatorClassName={cn("bg-primary/80", tight && "bg-mark-danger")} />
        <dl className="grid gap-3 border-t pt-5 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className={cn("font-medium tabular-nums", data.remainingUsd <= 0 && "text-status-danger")}>{usageUsd(Math.max(0, data.remainingUsd))}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Held by running scans</dt>
            <dd className="font-medium tabular-nums">{usageUsd(data.reservedUsd)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Scans this month</dt>
            <dd className="font-medium tabular-nums">{data.scans}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Tokens</dt>
            <dd className="font-medium tabular-nums">{usageTokens(tokenTotal)}</dd>
          </div>
        </dl>
        <p className="text-sm leading-relaxed text-muted-foreground">Cost is an estimate at list price, from each scan's own report.</p>
      </CardContent>
    </Card>
  );
}
