import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { hasAccessPower } from "@repo/contracts/elise";
import { buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import { usageUsd } from "#/modules/usage";
import { creditQuery } from "../hooks";
import { creditScansLabel } from "../utils";

export function CreditCard() {
  const { data } = useSuspenseQuery(creditQuery());
  const { user } = useRouteContext({ from: "/_app" });
  const canViewPlan = hasAccessPower(user?.powers ?? [], "company:plan:read");
  if (data.planKey === null) return null;
  const ownKey = data.keySource === "account";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {ownKey ? "Your scans run on your own Anthropic key, so they use no credit." : "Each scan takes credit. Running scans hold some until they end."}
        </p>
      </CardHeader>
      <CardContent className="grid gap-5">
        {!ownKey && <p className={cn("text-[28px] font-semibold leading-none tracking-tight tabular-nums", data.balanceUsd <= 0 && "text-status-danger")}>{usageUsd(Math.max(0, data.balanceUsd))}</p>}
        <dl className="grid gap-3 border-t pt-5 text-sm">
          {!ownKey && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Added each month</dt>
              <dd className="font-medium tabular-nums">{usageUsd(data.monthlyCreditUsd)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Scans this month</dt>
            <dd className="font-medium tabular-nums">{creditScansLabel(data.scans, data.scanAllowance)}</dd>
          </div>
        </dl>
        {canViewPlan && (
          <Link to="/settings/plan" className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>
            View plan
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
