import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { cn } from "#/lib/utils";
import { usageChangedAt } from "#/modules/usage";
import { creditEntriesQuery, planQuery } from "../hooks";
import { CREDIT_ENTRY_LABEL, creditAmountLabel } from "../utils";

function Entries() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(creditEntriesQuery());
  const entries = data.pages.flatMap((page) => page.entries);

  return (
    <CardContent className="overflow-hidden p-0">
      {entries.length === 0 ? (
        <p className="border-t px-6 py-5 text-sm text-muted-foreground">No credit has moved yet.</p>
      ) : (
        <ul className="divide-y border-t">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-baseline justify-between gap-4 px-6 py-3 text-sm">
              <div className="grid min-w-0 gap-0.5">
                <span className="font-medium">
                  {entry.scanId !== null ? (
                    <Link to="/scans/$scanId" params={{ scanId: entry.scanId }} className="inline-flex min-h-6 items-center rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {CREDIT_ENTRY_LABEL[entry.kind]}
                    </Link>
                  ) : (
                    CREDIT_ENTRY_LABEL[entry.kind]
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{usageChangedAt(entry.createdAt)}</span>
              </div>
              <span className={cn("font-medium tabular-nums", entry.amountUsd < 0 && "text-muted-foreground")}>{creditAmountLabel(entry.amountUsd)}</span>
            </li>
          ))}
        </ul>
      )}
      {hasNextPage && (
        <div className="flex justify-center border-t p-4">
          <Button variant="outline" size="sm" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            {isFetchingNextPage ? "Loading" : "Load more"}
          </Button>
        </div>
      )}
    </CardContent>
  );
}

// -----
// Where the credit went. An account on its own key spends none, and
// an account with no plan has no credit, so neither gets the list.
// -----
export function PlanCreditHistory() {
  const { data } = useSuspenseQuery(planQuery());
  if (data.plan === null || data.plan.keySource === "account") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit history</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">Credit added and credit your scans took, newest first.</p>
      </CardHeader>
      <Entries />
    </Card>
  );
}
