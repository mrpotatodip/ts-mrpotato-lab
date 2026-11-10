import { Suspense } from "react";
import { ShellPageHeader } from "#/modules/shell";
import { AnthropicKeyCard } from "#/modules/usage";

export function SettingsProvidersPage() {
  return (
    <>
      <ShellPageHeader title="Providers" description="Whose API key pays for this account's scans." />
      <Suspense fallback={null}>
        <AnthropicKeyCard />
      </Suspense>
    </>
  );
}
