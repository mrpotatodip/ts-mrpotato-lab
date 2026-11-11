import { Suspense } from "react";
import { PlanCard, PlanCreditHistory } from "#/modules/plan";
import { ShellPageHeader } from "#/modules/shell";

export function SettingsPlanPage() {
  return (
    <>
      <ShellPageHeader title="Plan" description="What this account pays for, and where its credit went." />
      <Suspense fallback={null}>
        <PlanCard />
      </Suspense>
      <Suspense fallback={null}>
        <PlanCreditHistory />
      </Suspense>
    </>
  );
}
