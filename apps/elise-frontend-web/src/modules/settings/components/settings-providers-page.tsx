import { Suspense } from "react";
import { RunnersCard } from "#/modules/runner";
import { ShellPageHeader } from "#/modules/shell";
import { AnthropicKeyCard } from "#/modules/usage";

export function SettingsProvidersPage() {
  return (
    <>
      <ShellPageHeader title="Providers" description="Whose API key pays for this account's scans, and which computers can run them." />
      <Suspense fallback={null}>
        <AnthropicKeyCard />
      </Suspense>
      <Suspense fallback={null}>
        <RunnersCard />
      </Suspense>
    </>
  );
}
