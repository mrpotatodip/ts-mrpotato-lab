import { Suspense } from "react";
import { ShellPageHeader } from "#/modules/shell";
import { UsageBudgetCard, UsageBudgetChangesCard } from "#/modules/usage";

export function SettingsPage() {
  return (
    <>
      <ShellPageHeader title="Settings" description="What this account may spend on scans, and who changed it." />
      <Suspense fallback={null}>
        <UsageBudgetCard />
        <UsageBudgetChangesCard />
      </Suspense>
    </>
  );
}
