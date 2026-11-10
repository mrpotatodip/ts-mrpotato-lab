import { Suspense } from "react";
import { ShellPageHeader } from "#/modules/shell";
import { AnthropicKeyCard, UsageBudgetCard, UsageBudgetChangesCard } from "#/modules/usage";

export function SettingsPage() {
  return (
    <>
      <ShellPageHeader title="Settings" description="What this account may spend on scans, whose Anthropic key pays for them, and who changed it." />
      <Suspense fallback={null}>
        <UsageBudgetCard />
        <AnthropicKeyCard />
        <UsageBudgetChangesCard />
      </Suspense>
    </>
  );
}
