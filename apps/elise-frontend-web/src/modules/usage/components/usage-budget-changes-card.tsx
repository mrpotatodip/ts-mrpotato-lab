import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { budgetChangesQuery } from "../hooks";
import { usageBudgetLabel, usageChangedAt } from "../utils";

export function UsageBudgetChangesCard() {
  const { data } = useSuspenseQuery(budgetChangesQuery());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent changes</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">Who changed the monthly budget, and when. The last 20 are shown.</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes yet. The budget is the default.</p>
        ) : (
          <ul className="grid gap-3 text-sm">
            {data.map((change) => (
              <li key={`${change.at}-${change.toUsd}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span>
                  <span className="font-medium">{change.by ?? "Someone who has since left"}</span> changed it from {usageBudgetLabel(change.fromUsd)} to{" "}
                  <span className="font-medium tabular-nums">{usageBudgetLabel(change.toUsd)}</span>
                </span>
                <time dateTime={change.at} className="text-muted-foreground tabular-nums">
                  {usageChangedAt(change.at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
