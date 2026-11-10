import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasAccessPower } from "@repo/contracts/elise";
import { SettingsProvidersPage } from "#/modules/settings";
import { anthropicKeyQuery } from "#/modules/usage";

export const Route = createFileRoute("/_app/settings/providers")({
  head: () => ({ meta: [{ title: "Providers · Settings · EliseLAB" }] }),
  beforeLoad: ({ context }) => {
    if (!hasAccessPower(context.user?.powers ?? [], "company:usage:anthropic_key:update")) throw redirect({ to: "/settings/budget" });
  },
  loader: ({ context }) => context.queryClient.query({ ...anthropicKeyQuery(), staleTime: "static" }),
  component: SettingsProvidersPage,
});
