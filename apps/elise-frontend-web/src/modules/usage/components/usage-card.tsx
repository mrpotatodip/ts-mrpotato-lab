import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Progress } from "#/components/ui/progress";
import { cn } from "#/lib/utils";
import { usageQuery } from "../hooks";
import { usageCommittedPercent, usageMonthLabel, usageTokens, usageUsd } from "../utils";

export function UsageCard() {
  const { data } = useSuspenseQuery(usageQuery());
  const percent = usageCommittedPercent(data.budgetUsd, data.spentUsd, data.reservedUsd);
  const tight = percent >= 90;
  const tokenTotal = data.tokens.input + data.tokens.output + data.tokens.cacheRead + data.tokens.cacheWrite;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Monthly budget</CardTitle>
        <span className="text-xs text-muted-foreground">{usageMonthLabel(data.month)}</span>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-end justify-between gap-4">
          <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">{usageUsd(data.spentUsd)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">of {usageUsd(data.budgetUsd)}</p>
        </div>
        <Progress value={percent} aria-label="Share of the monthly budget spent or held by running scans" indicatorClassName={cn(tight && "bg-status-danger")} />
        <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className={cn("font-medium tabular-nums", data.remainingUsd <= 0 && "text-status-danger")}>{usageUsd(Math.max(0, data.remainingUsd))}</dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">Held by running scans</dt>
            <dd className="font-medium tabular-nums">{usageUsd(data.reservedUsd)}</dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">Scans this month</dt>
            <dd className="font-medium tabular-nums">{data.scans}</dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">Tokens</dt>
            <dd className="font-medium tabular-nums">{usageTokens(tokenTotal)}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">Cost is an estimate at list price, from each scan's own report.</p>
      </CardContent>
    </Card>
  );
}
