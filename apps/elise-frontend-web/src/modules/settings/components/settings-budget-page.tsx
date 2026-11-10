import { Suspense } from "react";
import { ShellPageHeader } from "#/modules/shell";
import { UsageBudgetCard } from "#/modules/usage";

export function SettingsBudgetPage() {
  return (
    <>
      <ShellPageHeader title="Budget" description="What this account may spend on scans each month." />
      <Suspense fallback={null}>
        <UsageBudgetCard />
      </Suspense>
    </>
  );
}
