import { useSuspenseQuery } from "@tanstack/react-query";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { creditScansLabel } from "#/modules/credit";
import { usageUsd } from "#/modules/usage";
import { planQuery } from "../hooks";
import { PLAN_STATUS_VIEW, planDateLabel, planKeyLabel, planSeatsLabel, planSourceLabel } from "../utils";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export function PlanCard() {
  const { data } = useSuspenseQuery(planQuery());
  const { plan } = data;

  if (plan === null || data.status === null || data.source === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">This account has no plan yet. Contact us to set one up.</p>
        </CardHeader>
      </Card>
    );
  }

  const status = PLAN_STATUS_VIEW[data.status];
  const usesCredit = plan.keySource === "platform";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{plan.label}</CardTitle>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{status.note ?? "To change your plan, contact us."}</p>
      </CardHeader>
      <CardContent className="grid gap-5">
        <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
          {usageUsd(plan.monthlyPriceUsd)}
          <span className="ml-1.5 text-sm font-normal tracking-normal text-muted-foreground">per month</span>
        </p>
        <dl className="grid gap-3 border-t pt-5 text-sm">
          <Row label="Billing" value={planSourceLabel(data.source)} />
          {data.currentPeriodEnd !== null && <Row label="Renews" value={planDateLabel(data.currentPeriodEnd)} />}
          <Row label="Scans use" value={planKeyLabel(plan.keySource)} />
          {usesCredit && <Row label="Credit added each month" value={usageUsd(plan.includedCreditUsd)} />}
          {usesCredit && plan.carryCapUsd !== null && <Row label="Credit carry-over cap" value={usageUsd(plan.carryCapUsd)} />}
          <Row label="Scans this month" value={creditScansLabel(data.scans, plan.scanAllowance)} />
          <Row label="People" value={planSeatsLabel(data.seats, plan.maxMembers)} />
        </dl>
        {status.note !== null && <p className="border-t pt-5 text-sm text-muted-foreground">To change your plan, contact us.</p>}
      </CardContent>
    </Card>
  );
}
