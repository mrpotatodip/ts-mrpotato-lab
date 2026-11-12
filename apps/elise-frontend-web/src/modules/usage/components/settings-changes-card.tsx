import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { settingsChangesQuery } from "../hooks";
import type { SettingsChange } from "../schemas";
import { usageBudgetLabel, usageChangedAt } from "../utils";

const LEFT = "Someone who has since left";

function ChangeText({ change }: { change: SettingsChange }) {
  const by = <span className="font-medium">{change.by ?? LEFT}</span>;
  if (change.kind === "budget") {
    return (
      <span>
        {by} changed the monthly budget from {usageBudgetLabel(change.fromUsd)} to <span className="font-medium tabular-nums">{usageBudgetLabel(change.toUsd)}</span>
      </span>
    );
  }
  const ending = change.lastFour === null ? "" : ` ending in ${change.lastFour}`;
  return (
    <span>
      {by} {change.kind === "anthropic_key_set" ? "saved their own Anthropic key" : "removed their Anthropic key"}
      {ending}
    </span>
  );
}

export function SettingsChangesCard() {
  const { data } = useSuspenseQuery(settingsChangesQuery());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent changes</CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">Who changed the monthly budget or the Anthropic key, and when. The last 20 are shown.</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes yet. The budget is the default and scans use the Elise key.</p>
        ) : (
          <ul className="grid gap-3 text-sm">
            {data.map((change) => (
              <li key={`${change.at}-${change.kind}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <ChangeText change={change} />
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
